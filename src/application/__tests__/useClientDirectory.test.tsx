import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientDirectory } from '../useClientDirectory';
import type { UserRole } from '../../domain/identity/types';
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

  function Harness({ onAccessRecheck = vi.fn(), userRole = 'team_lead' }: { onAccessRecheck?: () => void; userRole?: UserRole }) {
    latest = useClientDirectory(userA, false, undefined, false, onAccessRecheck, userRole);
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

  it('rejects support-agent client deletions while allowing updates to existing clients', async () => {
    const updatedClient = { ...client, name: 'Updated Client A' };
    const secondClient = { ...client, id: 'client-b', name: 'Client B' };
    writeScopedSession(scopeA, 'clients', [client, secondClient]);

    await act(async () => {
      renderer = create(<Harness userRole="support_agent" />);
      await Promise.resolve();
    });
    await act(async () => {
      await latest.updateClients([updatedClient]);
    });

    expect(latest.clients.map(({ id }) => id)).toEqual(['client-a', 'client-b']);
    expect(latest.clients.find(({ id }) => id === 'client-a')?.name).toBe('Updated Client A');
    expect(clientRepoMocks.delete).not.toHaveBeenCalled();
    expect(clientRepoMocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'client-a' }), undefined);
  });

  it('allows team leads to delete client records', async () => {
    writeScopedSession(scopeA, 'clients', [client]);
    clientRepoMocks.delete.mockResolvedValueOnce(undefined);

    await act(async () => {
      renderer = create(<Harness userRole="team_lead" />);
      await Promise.resolve();
    });
    await act(async () => {
      await latest.updateClients([]);
    });

    expect(latest.clients).toEqual([]);
    expect(clientRepoMocks.delete).toHaveBeenCalledWith('client-a');
  });

  it('replaces interaction-derived products while retaining explicitly owned products', async () => {
    const existingClient = {
      ...client,
      ownedProducts: ['Product A', 'Product C'],
      manuallyOwnedProducts: ['Product A'],
      interactionProducts: ['Product C'],
    };
    const reconciledClient = {
      ...existingClient,
      ownedProducts: ['Product A', 'Product B'],
      manuallyOwnedProducts: ['Product A'],
      interactionProducts: ['Product B'],
    };
    writeScopedSession(scopeA, 'clients', [existingClient]);
    clientRepoMocks.upsertClientWithProduct.mockResolvedValueOnce(reconciledClient);

    await act(async () => {
      renderer = create(<Harness />);
      await Promise.resolve();
    });
    await act(async () => {
      await latest.recordClientInteraction({
        clientName: 'Client A',
        productName: 'Product B',
        agentName: 'Agent',
        interactionId: 'interaction-a',
      } as any);
    });

    expect(latest.clients[0]).toMatchObject(reconciledClient);
    expect(latest.clients[0].ownedProducts).not.toContain('Product C');
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
