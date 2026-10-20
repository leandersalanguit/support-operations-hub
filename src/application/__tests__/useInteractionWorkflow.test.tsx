import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInteractionWorkflow } from '../useInteractionWorkflow';
import { CUSTOMER_CACHE_TTL_MS, readScopedSession, scopedSessionKey, writeScopedSession } from '../../infrastructure/storage/scopedSessionStore';

const repositoryMocks = vi.hoisted(() => ({ getAll: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), subscribeRealtime: vi.fn() }));
const syncMocks = vi.hoisted(() => ({
  pendingSyncCount: 0,
  setSyncStatus: vi.fn(),
  drainQueue: vi.fn(),
  markSyncSuccess: vi.fn(),
  enqueueFailedSync: vi.fn(),
  clearQueue: vi.fn(),
}));
vi.mock('../../infrastructure/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabaseProjectId: 'test-project',
  isAccessDeniedError: (error: any) => error?.status === 401 || error?.status === 403 || error?.code === 'PGRST116' || error?.code === 'SUPPORT_HUB_ACCESS_RECHECK',
}));
vi.mock('../../infrastructure/supabase/interactionRepo', () => ({ interactionRepo: repositoryMocks }));
vi.mock('../useSyncPipeline', () => ({
  useSyncPipeline: () => syncMocks,
}));

const interaction = {
  id: 'interaction-a', createdAt: '2026-10-20T00:00:00.000Z', date: '2026-10-20', dayOfWeek: 'Tuesday',
  agent: 'Alex', agentId: 'user-a', clientName: 'Client A', channel: 'Call', channelDetails: '',
  clientProduct: '', caseClassification: '', status: 'Resolved', inEvent: false, firstTimeUser: false,
  additionalNotes: '', time: '12:00',
};
const userA = { id: 'user-a' } as any;
const userB = { id: 'user-b' } as any;
const scopeA = { projectId: 'test-project', userId: 'user-a' };

describe('useInteractionWorkflow stale reset responses', () => {
  let renderer: ReactTestRenderer | undefined;
  let latest: ReturnType<typeof useInteractionWorkflow>;

  function Harness({ user, onAccessRecheck, passwordChangeRequired = false }: { user: typeof userA; onAccessRecheck?: () => void; passwordChangeRequired?: boolean }) {
    latest = useInteractionWorkflow({
      currentUser: user,
      currentAgentName: 'Agent',
      isPasswordChangeRequired: passwordChangeRequired,
      onAccessRecheck,
    });
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    repositoryMocks.getAll.mockResolvedValue([]);
    repositoryMocks.subscribeRealtime.mockReturnValue(() => undefined);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  let rejectReset!: (error: Error) => void;

  it.each([undefined, 'PGRST116'])('ignores an old reset failure after a user switch, including access errors (%s)', async (code) => {
    writeScopedSession(scopeA, 'interactions', [interaction]);
    repositoryMocks.getAll.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReset = reject; }));
    await act(async () => {
      renderer = create(<Harness user={userA} passwordChangeRequired />);
      await Promise.resolve();
      await Promise.resolve();
    });
    let resetPromise!: Promise<void>;
    await act(async () => {
      resetPromise = latest.resetSampleData();
      await vi.waitFor(() => expect(repositoryMocks.getAll).toHaveBeenCalledTimes(1));
    });

    await act(async () => {
      renderer?.update(<Harness user={userB} passwordChangeRequired />);
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      rejectReset(Object.assign(new Error('old request failed'), { code }));
      await resetPromise;
    });

    expect(readScopedSession(scopeA, 'interactions', (value): value is typeof interaction[] => Array.isArray(value))).toEqual([interaction]);
  });

  it('does not renew an offline hydrated interaction cache near its original expiry', async () => {
    vi.useFakeTimers();
    writeScopedSession(scopeA, 'interactions', [interaction], 1_000);
    vi.setSystemTime(1_000 + CUSTOMER_CACHE_TTL_MS - 1);
    repositoryMocks.getAll.mockResolvedValue(null);

    await act(async () => {
      renderer = create(<Harness user={userA} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.interactions).toEqual([interaction]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(301);
    });

    expect(sessionStorage.getItem(scopedSessionKey(scopeA, 'interactions'))).not.toBeNull();
    expect(readScopedSession(scopeA, 'interactions', (value): value is typeof interaction[] => Array.isArray(value), CUSTOMER_CACHE_TTL_MS)).toBeNull();
  });

  it('clears cached data and retry work, then rechecks staff state after a zero-row update', async () => {
    const onAccessRecheck = vi.fn();
    const { addToSyncQueue, getPendingSyncQueue } = await import('../../infrastructure/storage/localStorageRepos');
    writeScopedSession(scopeA, 'interactions', [interaction]);
    repositoryMocks.getAll.mockResolvedValue([interaction]);
    repositoryMocks.update.mockRejectedValueOnce(Object.assign(new Error('zero rows'), { code: 'PGRST116' }));

    await act(async () => {
      renderer = create(<Harness user={userA} onAccessRecheck={onAccessRecheck} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    addToSyncQueue(scopeA, 'update', interaction.id, interaction as any);
    await act(async () => {
      await latest.saveEdit({ ...interaction, additionalNotes: 'changed' } as any);
    });

    expect(onAccessRecheck).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(scopedSessionKey(scopeA, 'interactions'))).toBeNull();
    expect(getPendingSyncQueue(scopeA)).toEqual([]);
  });
});

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
