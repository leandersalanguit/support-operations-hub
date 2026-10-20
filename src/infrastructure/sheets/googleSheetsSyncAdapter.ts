/**
 * @file googleSheetsSyncAdapter.ts
 * @description Pilot stub for the disabled Google Sheets integration.
 *
 * Sheets must remain disabled for the pilot. A future integration requires a
 * separately reviewed server-side authorization and retry design.
 */

import { SupportInteraction } from '../../domain/interaction/types';

export type SheetAction = 'insert' | 'update' | 'delete';

export interface SheetSyncPayload {
  action: SheetAction;
  payload: Partial<SupportInteraction> & { id: string; date?: string };
}

/** No browser request is permitted while Google Sheets is disabled for pilot. */
export async function syncToGoogleSheets(
  _action: SheetAction,
  _payload: Partial<SupportInteraction> & { id: string; date?: string }
): Promise<void> {
  return;
}
