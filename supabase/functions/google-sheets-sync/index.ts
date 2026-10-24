import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { createGoogleSheetsSyncHandler } from './handler.ts';
import { isValidGoogleSheetsEvent } from '../../../src/infrastructure/sheets/googleSheetsSyncHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const workerSecret = Deno.env.get('GOOGLE_SHEETS_WORKER_SECRET') || '';
const appScriptUrl = Deno.env.get('GOOGLE_SHEETS_WEBAPP_URL') || '';
const sheetsToken = Deno.env.get('GOOGLE_SHEETS_SECRET_TOKEN') || '';

function validAppsScriptUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

function errorResponse(): Response {
  return new Response(JSON.stringify({ error: 'Google Sheets sync is not configured.' }), {
    status: 503,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

if (
  !supabaseUrl || !serviceRoleKey || workerSecret.length < 32 ||
  !/^[a-f0-9]{64}$/i.test(sheetsToken) || !validAppsScriptUrl(appScriptUrl)
) {
  Deno.serve(() => errorResponse());
} else {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const handler = createGoogleSheetsSyncHandler({
    workerSecret,
    allowedOrigins: [],
    claimEvents: async (limit) => {
      const { data, error } = await admin.rpc('claim_google_sheets_sync_events', { p_limit: limit });
      if (error || !Array.isArray(data)) throw new Error('claim_failed');
      return data.map((row: Record<string, unknown>) => ({
        id: Number(row.event_id),
        leaseId: String(row.lease_id),
        action: row.action as 'insert' | 'update' | 'delete',
        version: Number(row.version),
        payload: row.payload as Record<string, unknown>,
      }));
    },
    deliverEvent: async (event) => {
      if (!isValidGoogleSheetsEvent(event)) throw new Error('invalid_upstream_response');
      const requestBody = JSON.stringify({
        token: sheetsToken,
        action: event.action,
        version: event.version,
        payload: event.payload,
      });
      if (new TextEncoder().encode(requestBody).byteLength > 64 * 1024) {
        throw new Error('invalid_upstream_response');
      }
      let response: Response;
      try {
        response = await fetch(appScriptUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') throw new Error('upstream_timeout');
        throw new Error('upstream_failure');
      }
      if (!response.ok) throw new Error('upstream_failure');
      const finalUrl = new URL(response.url);
      if (!['script.google.com', 'script.googleusercontent.com'].includes(finalUrl.hostname)) {
        throw new Error('invalid_upstream_response');
      }
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error('invalid_upstream_response');
      }
      const ack = result as Record<string, unknown>;
      if (
        ack?.ok !== true || ack.id !== event.payload.id || ack.version !== event.version ||
        ack.action !== event.action
      ) throw new Error('invalid_upstream_response');
    },
    completeEvent: async (eventId, leaseId) => {
      const { data, error } = await admin.rpc('complete_google_sheets_sync_event', {
        p_event_id: eventId,
        p_lease_id: leaseId,
      });
      if (error) throw new Error('complete_failed');
      return data === true;
    },
    retryEvent: async (eventId, leaseId, code) => {
      const { error } = await admin.rpc('retry_google_sheets_sync_event', {
        p_event_id: eventId,
        p_lease_id: leaseId,
        p_error_code: code,
      });
      if (error) throw new Error('retry_failed');
    },
  });

  Deno.serve(handler);
}
