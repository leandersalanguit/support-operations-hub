export type GoogleSheetsAction = 'insert' | 'update' | 'delete';

export interface GoogleSheetsEvent {
  id: number;
  leaseId: string;
  action: GoogleSheetsAction;
  version: number;
  payload: Record<string, unknown>;
}

export interface GoogleSheetsSyncHandlerDependencies {
  workerSecret: string;
  allowedOrigins: string[];
  claimEvents(limit: number): Promise<GoogleSheetsEvent[]>;
  deliverEvent(event: GoogleSheetsEvent): Promise<void>;
  completeEvent(eventId: number, leaseId: string): Promise<boolean>;
  retryEvent(eventId: number, leaseId: string, code: string): Promise<void>;
}

const SHEET_PAYLOAD_KEYS = [
  'id', 'createdAt', 'date', 'dayOfWeek', 'time', 'agent', 'clientName', 'channel',
  'channelDetails', 'clientProduct', 'caseClassification', 'status', 'license', 'inEvent',
  'firstTimeUser', 'additionalNotes',
];

/** Validates the database allowlist again before the worker contacts Google. */
export function isValidGoogleSheetsEvent(event: GoogleSheetsEvent): boolean {
  if (!Number.isSafeInteger(event.id) || event.id <= 0 || !Number.isSafeInteger(event.version) || event.version <= 0) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.leaseId)) return false;
  if (!['insert', 'update', 'delete'].includes(event.action)) return false;

  const payload = event.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (Object.keys(payload).length !== SHEET_PAYLOAD_KEYS.length || SHEET_PAYLOAD_KEYS.some((key) => !(key in payload))) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(payload.id))) return false;
  if (typeof payload.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(payload.createdAt)) return false;
  if (typeof payload.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return false;
  if (typeof payload.time !== 'string' || !/^(?:\d{2}:\d{2}(?::\d{2})?)?$/.test(payload.time)) return false;
  if (payload.channel !== 'Call' && payload.channel !== 'Chat') return false;
  if (typeof payload.inEvent !== 'boolean' || typeof payload.firstTimeUser !== 'boolean') return false;

  const textKeys = SHEET_PAYLOAD_KEYS.filter((key) => !['id', 'createdAt', 'date', 'time', 'inEvent', 'firstTimeUser'].includes(key));
  return textKeys.every((key) => typeof payload[key] === 'string' && (payload[key] as string).length <= 32_768);
}

const MAX_BODY_BYTES = 2 * 1024;
const BATCH_LIMIT = 5;
const objectBody = { 'content-type': 'application/json; charset=utf-8' };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: objectBody });
}

function sameSecret(actual: string, expected: string): boolean {
  if (!actual || !expected || actual.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

async function readSmallBody(request: Request): Promise<Uint8Array | null> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isEmptyObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
}

/** Creates the secret-only scheduled-worker endpoint. It has no browser write path. */
export function createGoogleSheetsSyncHandler(deps: GoogleSheetsSyncHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    if (origin && !deps.allowedOrigins.includes(origin)) return json(403, { error: 'Request origin is not allowed.' });
    if (request.method !== 'POST') return json(405, { error: 'Invalid request.' });

    const headerSecret = request.headers.get('x-worker-secret') || '';
    if (!sameSecret(headerSecret, deps.workerSecret)) return json(401, { error: 'Authentication is required.' });

    const bytes = await readSmallBody(request);
    if (!bytes) return json(400, { error: 'Invalid request.' });
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json(400, { error: 'Invalid request.' });
    }
    if (!isEmptyObject(body)) return json(400, { error: 'Invalid request.' });

    let events: GoogleSheetsEvent[];
    try {
      events = await deps.claimEvents(BATCH_LIMIT);
    } catch {
      return json(503, { error: 'Google Sheets sync is temporarily unavailable.' });
    }

    let processed = 0;
    let retried = 0;
    for (const event of events) {
      try {
        await deps.deliverEvent(event);
        if (await deps.completeEvent(event.id, event.leaseId)) processed += 1;
        else retried += 1;
      } catch (error) {
        try {
          const code = error instanceof Error &&
            ['invalid_upstream_response', 'upstream_timeout'].includes(error.message)
            ? error.message
            : 'upstream_failure';
          await deps.retryEvent(event.id, event.leaseId, code);
          retried += 1;
        } catch {
          return json(503, { error: 'Google Sheets sync is temporarily unavailable.' });
        }
      }
    }

    return json(200, { processed, retried });
  };
}
