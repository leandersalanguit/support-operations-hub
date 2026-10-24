import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleSheetsSyncStatus } from '../useGoogleSheetsSyncStatus';

const sheetsMocks = vi.hoisted(() => ({
  enabled: false,
  url: null as string | null,
  validateUrl: vi.fn((value: string): string | null => value),
  rpc: vi.fn(),
}));

vi.mock('../../infrastructure/sheets/googleSheetsSyncAdapter', () => ({
  get GOOGLE_SHEETS_SYNC_ENABLED() { return sheetsMocks.enabled; },
  get GOOGLE_SHEETS_SHORTCUT_URL() { return sheetsMocks.url; },
  validateGoogleSheetsUrl: sheetsMocks.validateUrl,
}));

vi.mock('../../infrastructure/supabase/client', () => ({
  supabase: { rpc: sheetsMocks.rpc },
}));

describe('useGoogleSheetsSyncStatus', () => {
  let renderer: ReactTestRenderer | undefined;
  let latest: ReturnType<typeof useGoogleSheetsSyncStatus>;

  function Harness({ userId }: { userId: string | null }) {
    latest = useGoogleSheetsSyncStatus({ userId, isDemo: false });
    return null;
  }

  beforeEach(() => {
    sheetsMocks.enabled = false;
    sheetsMocks.url = null;
    sheetsMocks.validateUrl.mockImplementation((value) => value);
    sheetsMocks.rpc.mockReset();
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
    vi.clearAllMocks();
  });

  it('does not request status when sync is disabled and validates the shortcut URL', async () => {
    sheetsMocks.url = 'javascript:alert(1)';
    sheetsMocks.validateUrl.mockReturnValue(null);
    sheetsMocks.rpc.mockResolvedValue({ data: null, error: null });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });

    expect(latest.state).toBe('disabled');
    expect(latest.shortcutUrl).toBeNull();
    expect(sheetsMocks.rpc).not.toHaveBeenCalled();
  });

  it('loads sanitized counts and retries failed events', async () => {
    sheetsMocks.enabled = true;
    sheetsMocks.url = 'https://docs.google.com/spreadsheets/d/example/edit';
    sheetsMocks.validateUrl.mockImplementation((value) => value);
    sheetsMocks.rpc
      .mockResolvedValueOnce({ data: { pending_count: 2, failed_count: 1 }, error: null })
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: { pending_count: 3, failed_count: 0 }, error: null });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });

    expect(latest.state).toBe('ready');
    expect(latest.pendingCount).toBe(2);
    expect(latest.failedCount).toBe(1);

    await act(async () => {
      await latest.retryFailed();
    });

    expect(latest.pendingCount).toBe(3);
    expect(latest.failedCount).toBe(0);
    expect(sheetsMocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      'get_google_sheets_sync_status',
      'retry_my_failed_google_sheets_sync_events',
      'get_google_sheets_sync_status',
    ]);
  });

  it('reports a generic unavailable state when the status RPC fails', async () => {
    sheetsMocks.enabled = true;
    sheetsMocks.rpc.mockResolvedValue({ data: null, error: { message: 'private database details' } });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });

    expect(latest.state).toBe('unavailable');
    expect(latest.errorMessage).toBe('Sheets sync status is unavailable.');
    expect(latest.errorMessage).not.toContain('private database details');
  });

  it('clears the prior user status when the session changes', async () => {
    sheetsMocks.enabled = true;
    sheetsMocks.rpc.mockResolvedValue({ data: { pending_count: 4, failed_count: 1 }, error: null });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });
    expect(latest.pendingCount).toBe(4);

    await act(async () => {
      renderer?.update(<Harness userId={null} />);
    });

    expect(latest.state).toBe('disabled');
    expect(latest.pendingCount).toBe(0);
    expect(latest.failedCount).toBe(0);
  });

  it('ignores a status response from the previous user after an account switch', async () => {
    sheetsMocks.enabled = true;
    let resolvePrevious!: (result: { data: unknown; error: null }) => void;
    sheetsMocks.rpc
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce({ data: { pending_count: 1, failed_count: 0 }, error: null });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });
    await act(async () => {
      renderer?.update(<Harness userId="agent-b" />);
      await Promise.resolve();
    });
    expect(latest.pendingCount).toBe(1);

    await act(async () => {
      resolvePrevious({ data: { pending_count: 99, failed_count: 5 }, error: null });
      await Promise.resolve();
    });

    expect(latest.state).toBe('ready');
    expect(latest.pendingCount).toBe(1);
    expect(latest.failedCount).toBe(0);
  });

  it('rejects malformed negative counts instead of presenting them as queue status', async () => {
    sheetsMocks.enabled = true;
    sheetsMocks.rpc.mockResolvedValue({ data: { pending_count: -4, failed_count: 2 }, error: null });

    await act(async () => {
      renderer = create(<Harness userId="agent-a" />);
      await Promise.resolve();
    });

    expect(latest.state).toBe('unavailable');
    expect(latest.pendingCount).toBe(0);
    expect(latest.failedCount).toBe(0);
  });
});
