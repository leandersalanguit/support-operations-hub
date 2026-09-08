/**
 * @file googleSheetsSyncAdapter.ts
 * @description Non-blocking background sync adapter for the Master Google Sheet.
 * Sends asynchronous POST requests to Google Apps Script.
 *
 * Security: Requests are authenticated via a shared secret token
 * (VITE_GOOGLE_SHEETS_SECRET_TOKEN) appended as a ?token= query parameter.
 * The Apps Script doPost() handler should validate this token and reject
 * requests that don't carry the correct value, preventing unauthorized writes
 * from anyone who discovers the deployment URL via devtools or bundle inspection.
 */

import { SupportInteraction } from '../../domain/interaction/types';
import { getHelpdeskName } from '../../utils/helpdesk';

const googleSheetsWebAppUrl = (import.meta.env.VITE_GOOGLE_SHEETS_WEBAPP_URL || '').trim();
const rawSecretToken = import.meta.env.VITE_GOOGLE_SHEETS_SECRET_TOKEN || '';
// Sanitize token: trim whitespace and remove accidental surrounding quotes from .env
const googleSheetsSecretToken = rawSecretToken.trim().replace(/^['"]|['"]$/g, '');

export const isGoogleSheetsConfigured = Boolean(googleSheetsWebAppUrl);

/** True when a secret token is configured to authenticate Sheets sync requests. */
export const isGoogleSheetTokenConfigured = Boolean(googleSheetsSecretToken);

export type SheetAction = 'insert' | 'update' | 'delete';

export interface SheetSyncPayload {
  action: SheetAction;
  payload: Partial<SupportInteraction> & { id: string; date?: string };
}

/**
 * Builds the authenticated request URL by appending the shared secret token
 * as a query parameter. If no token is configured, returns the base URL as-is
 * (unauthenticated) so existing deployments without a token continue to work.
 */
function buildAuthenticatedUrl(baseUrl: string): string {
  if (!googleSheetsSecretToken) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(googleSheetsSecretToken)}`;
}

/**
 * Dispatches an asynchronous, non-blocking sync payload to the Master Google Sheet.
 * The request URL includes the shared secret token (if configured) so the Apps Script
 * doPost() handler can reject unauthorized callers.
 */
export async function syncToGoogleSheets(
  action: SheetAction,
  payload: Partial<SupportInteraction> & { id: string; date?: string }
): Promise<void> {
  if (!googleSheetsWebAppUrl) {
    return;
  }

  try {
    const sanitizedPayload = { ...payload };
    const helpdeskName = getHelpdeskName();

    if (sanitizedPayload.channel?.toLowerCase() === 'chat') {
      sanitizedPayload.channelDetails = helpdeskName;
    }

    if (
      typeof sanitizedPayload.channelDetails === 'string' &&
      sanitizedPayload.channelDetails.trim().startsWith('+')
    ) {
      sanitizedPayload.channelDetails = `'${sanitizedPayload.channelDetails.trim()}`;
    }

    const body: SheetSyncPayload = {
      action,
      payload: sanitizedPayload,
    };

    // Mode 'no-cors' allows fire-and-forget POST to Google Apps Script without preflight block.
    // The authenticated URL carries the secret token as a query parameter.
    await fetch(buildAuthenticatedUrl(googleSheetsWebAppUrl), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.warn('[Google Sheets Sync] Background sync notice:', error);
  }
}
