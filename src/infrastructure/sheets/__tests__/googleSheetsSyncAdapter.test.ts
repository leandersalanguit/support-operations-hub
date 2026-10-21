import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncToGoogleSheets } from '../googleSheetsSyncAdapter';

describe('Google Sheets pilot disablement', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does_not_dispatch_sheets_requests_in_pilot', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const payload = { id: 'synthetic-interaction-1', date: '2026-10-20' };

    await syncToGoogleSheets('insert', payload);
    await syncToGoogleSheets('update', payload);
    await syncToGoogleSheets('delete', payload);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
