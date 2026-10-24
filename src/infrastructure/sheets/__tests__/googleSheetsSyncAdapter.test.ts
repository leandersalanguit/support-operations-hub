import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_SHEETS_SHORTCUT_URL,
  syncToGoogleSheets,
  validateGoogleSheetsUrl,
} from '../googleSheetsSyncAdapter';

describe('Google Sheets browser boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does_not_dispatch_sheet_writes_from_the_browser', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const payload = { id: 'synthetic-interaction-1', date: '2026-10-20' };

    await syncToGoogleSheets('insert', payload);
    await syncToGoogleSheets('update', payload);
    await syncToGoogleSheets('delete', payload);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a standard HTTPS Google Sheets URL and removes sharing parameters', () => {
    expect(validateGoogleSheetsUrl(
      'https://docs.google.com/spreadsheets/d/1fcChOwOccK8txqtFNDIa6JxA79l9nrHm1juXLQHBK_k/edit?usp=sharing',
    )).toBe('https://docs.google.com/spreadsheets/d/1fcChOwOccK8txqtFNDIa6JxA79l9nrHm1juXLQHBK_k/edit');
  });

  it('rejects non-Google, non-HTTPS, and non-spreadsheet URLs', () => {
    expect(validateGoogleSheetsUrl('https://attacker.example/spreadsheets/d/sheet/edit')).toBeNull();
    expect(validateGoogleSheetsUrl('http://docs.google.com/spreadsheets/d/sheet/edit')).toBeNull();
    expect(validateGoogleSheetsUrl('https://docs.google.com/document/d/document/edit')).toBeNull();
  });

  it('provides the approved master sheet URL as the validated shortcut default', () => {
    expect(GOOGLE_SHEETS_SHORTCUT_URL).toBe(
      'https://docs.google.com/spreadsheets/d/1fcChOwOccK8txqtFNDIa6JxA79l9nrHm1juXLQHBK_k/edit',
    );
  });
});
