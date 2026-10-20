type VerifiedUser = { id: string };
type AccessState = { active: boolean; password_change_required?: boolean };

export interface PasswordChangeDependencies {
  allowedOrigins: string[];
  verifyUser(token: string): Promise<VerifiedUser | null>;
  getAccessState(userId: string, token: string): Promise<AccessState | null>;
  consumeAttempt(userId: string): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<void>;
  completePasswordChange(userId: string): Promise<boolean>;
}

const MAX_BODY_BYTES = 2 * 1024;
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

function response(status: number, message: string, origin?: string) {
  const headers = new Headers(jsonHeaders);
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
  }
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

function allowedOrigin(request: Request, allowedOrigins: string[]): string | null {
  const origin = request.headers.get('origin');
  return origin && allowedOrigins.includes(origin) ? origin : null;
}

async function readBoundedBody(request: Request): Promise<Uint8Array | null> {
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
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function createPasswordChangeHandler(deps: PasswordChangeDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = allowedOrigin(request, deps.allowedOrigins);
    if (!origin) return response(403, 'Request origin is not allowed.');

    if (request.method === 'OPTIONS') {
      const headers = new Headers({
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
        'access-control-max-age': '86400',
        vary: 'Origin',
      });
      return new Response('ok', { headers });
    }
    if (request.method !== 'POST') return response(400, 'Invalid request.', origin);

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_BODY_BYTES) return response(400, 'Invalid request.', origin);

    const bytes = await readBoundedBody(request);
    if (!bytes) return response(400, 'Invalid request.', origin);

    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return response(400, 'Invalid request.', origin);
    }
    if (
      typeof body !== 'object' || body === null || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !('newPassword' in body)
    ) return response(400, 'Invalid request.', origin);

    const newPassword = (body as { newPassword?: unknown }).newPassword;
    if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      return response(400, 'Password must contain 12 to 128 characters.', origin);
    }

    const authorization = request.headers.get('authorization') || '';
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) return response(401, 'Authentication is required.', origin);

    let user: VerifiedUser | null;
    try {
      user = await deps.verifyUser(match[1]);
    } catch {
      user = null;
    }
    if (!user?.id) return response(401, 'Authentication is required.', origin);

    let access: AccessState | null;
    try {
      access = await deps.getAccessState(user.id, match[1]);
    } catch {
      return response(503, 'Password change is temporarily unavailable.', origin);
    }
    if (!access?.active) return response(403, 'Account access is unavailable.', origin);

    let allowed: boolean;
    try {
      allowed = await deps.consumeAttempt(user.id);
    } catch {
      return response(503, 'Password change is temporarily unavailable.', origin);
    }
    if (!allowed) return response(429, 'Too many attempts. Try again later.', origin);

    try {
      await deps.updatePassword(user.id, newPassword);
    } catch {
      return response(503, 'Password change is temporarily unavailable.', origin);
    }

    try {
      if (!await deps.completePasswordChange(user.id)) {
        return response(503, 'Password change is temporarily unavailable.', origin);
      }
    } catch {
      return response(503, 'Password change is temporarily unavailable.', origin);
    }

    return new Response(null, {
      status: 200,
      headers: { 'access-control-allow-origin': origin, vary: 'Origin' },
    });
  };
}
