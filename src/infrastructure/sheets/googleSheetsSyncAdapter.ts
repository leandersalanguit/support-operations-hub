/**
 * @file googleSheetsSyncAdapter.ts
 * @description Public shortcut configuration and a non-writing browser adapter.
 * Interaction data is queued and sent by the private Supabase worker.
 */

import { SupportInteraction } from '../../domain/interaction/types';

export type SheetAction = 'insert' | 'update' | 'delete';

const DEFAULT_MASTER_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1fcChOwOccK8txqtFNDIa6JxA79l9nrHm1juXLQHBK_k/edit';

export function validateGoogleSheetsUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password) return null;
    if (!/^\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/edit)?\/?$/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

const configuredUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL?.trim();
export const GOOGLE_SHEETS_SHORTCUT_URL = validateGoogleSheetsUrl(
  configuredUrl || DEFAULT_MASTER_SHEET_URL,
);
export const GOOGLE_SHEETS_SYNC_ENABLED = import.meta.env.VITE_GOOGLE_SHEETS_SYNC_ENABLED === 'true';

/** Browser writes are forbidden. Committed Supabase mutations enter the server outbox. */
export async function syncToGoogleSheets(
  _action: SheetAction,
  _payload: Partial<SupportInteraction> & { id: string; date?: string }
): Promise<void> {
  return;
}
