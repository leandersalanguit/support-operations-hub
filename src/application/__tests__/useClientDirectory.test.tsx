import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientDirectory } from '../useClientDirectory';
import { CUSTOMER_CACHE_TTL_MS, readScopedSession, scopedSessionKey, writeScopedSession } from '../../infrastructure/storage/scopedSessionStore';
import { addToSyncQueue, getPendingSyncQueue } from '../../infrastructure/storage/localStorageRepos';

const clientRepoMocks = vi.hoisted(() => ({ getAll: vi.fn(), upsertClientWithProduct: vi.fn(), delete: vi.fn(), update: vi.fn() }));
vi.mock('../../infrastructure/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabaseProjectId: 'test-project',
  isAccessDeniedError: (error: any) => error?.status === 401 || error?.status === 403 || error?.code === 'PGRST116' || error?.code === 'SUPPORT_HUB_ACCESS_RECHECK',
}));
vi.mock('../../infrastructure/supabase/clientRepo', () => ({ clientRepo: clientRepoMocks }));

const scopeA = { projectId: 'test-project', userId: 'user-a' };
const userA = { id: 'user-a' } as any;
const client = {
  id: 'client-a', name: 'Client A', phoneNumbers: [], ownedProducts: [],
  createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('useClientDirectory cache hydration', () => {
  let renderer: ReactTestRenderer | undefined;
  let latest: ReturnType<typeof useClientDirectory>;

  function Harness({ onAccessRecheck = vi.fn() }: { onAccessRecheck?: () => void }) {
    latest = useClientDirectory(userA, false, undefined, false, onAccessRecheck);
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    clientRepoMocks.getAll.mockImplementation(() => new Promise(() => undefined));
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

  it('does not renew an offline hydrated client cache near its original expiry', async () => {
    vi.useFakeTimers();
    writeScopedSession(scopeA, 'clients', [client], 1_000);
    vi.setSystemTime(1_000 + CUSTOMER_CACHE_TTL_MS - 1);

    await act(async () => {
      renderer = create(<Harness />);
      await Promise.resolve();
    });
    expect(latest.clients).toEqual([client]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(301);
    });

    expect(sessionStorage.getItem(scopedSessionKey(scopeA, 'clients'))).not.toBeNull();
    expect(readScopedSession(scopeA, 'clients', (value): value is typeof client[] => Array.isArray(value), CUSTOMER_CACHE_TTL_MS)).toBeNull();
  });

  it('clears cached clients and retry work, then rechecks staff state after a zero-row delete', async () => {
    const onAccessRecheck = vi.fn();
    writeScopedSession(scopeA, 'clients', [client]);
    clientRepoMocks.delete.mockRejectedValueOnce(Object.assign(new Error('zero rows'), { code: 'SUPPORT_HUB_ACCESS_RECHECK' }));
    const queueScope = scopeA;
    addToSyncQueue(queueScope, 'insert', 'interaction-a', { id: 'interaction-a' } as any);

    await act(async () => {
      renderer = create(<Harness onAccessRecheck={onAccessRecheck} />);
      await Promise.resolve();
    });
    await act(async () => {
      await latest.updateClients([]);
    });

    expect(onAccessRecheck).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(scopedSessionKey(scopeA, 'clients'))).toBeNull();
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
