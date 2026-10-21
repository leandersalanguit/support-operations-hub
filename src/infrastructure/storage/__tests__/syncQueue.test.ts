import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageScope, clearCustomerSession } from '../scopedSessionStore';

const repositoryMocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock('../../supabase/client', () => ({ isSupabaseConfigured: true }));
vi.mock('../../supabase/interactionRepo', () => ({ interactionRepo: repositoryMocks }));

const scopeA: StorageScope = { projectId: 'project-a', userId: 'user-a' };
const scopeB: StorageScope = { projectId: 'project-a', userId: 'user-b' };
class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('scoped sync queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stops after an awaited request when the account scope changes', async () => {
    const { addToSyncQueue, getPendingSyncQueue, processPendingSyncQueue } = await import('../localStorageRepos');
    let finishRequest!: () => void;
    repositoryMocks.insert.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRequest = resolve; }));
    addToSyncQueue(scopeA, 'insert', 'i-1', { id: 'i-1' });
    let activeScope: StorageScope | null = scopeA;

    const draining = processPendingSyncQueue(scopeA, () => activeScope);
    await vi.waitFor(() => expect(repositoryMocks.insert).toHaveBeenCalledTimes(1));
    activeScope = scopeB;
    finishRequest();

    const result = await draining;
    expect(result.success).toBe(false);
    expect(repositoryMocks.insert).toHaveBeenCalledTimes(1);
    expect(getPendingSyncQueue(scopeA)).toHaveLength(1);
  });

  it('does not let an old session response consume a same-user relogin queue', async () => {
    const { addToSyncQueue, getPendingSyncQueue, processPendingSyncQueue } = await import('../localStorageRepos');
    let finishRequest!: () => void;
    repositoryMocks.insert.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRequest = resolve; }));
    addToSyncQueue(scopeA, 'insert', 'old-session-item', { id: 'old-session-item' });

    const draining = processPendingSyncQueue(scopeA, () => scopeA);
    await vi.waitFor(() => expect(repositoryMocks.insert).toHaveBeenCalledTimes(1));

    // Logout clears the old queue and advances the epoch. A login to the same
    // account then creates fresh work under the identical UUID/project scope.
    clearCustomerSession(scopeA);
    const freshItem = addToSyncQueue(scopeA, 'insert', 'new-session-item', { id: 'new-session-item' });
    finishRequest();

    expect(await draining).toMatchObject({ success: false });
    expect(getPendingSyncQueue(scopeA).map((item) => item.id)).toEqual([freshItem.id]);
  });

  it('rejects a same-scope drain response after a customer-session clear', async () => {
    const { addToSyncQueue, getPendingSyncQueue, processPendingSyncQueue } = await import('../localStorageRepos');
    let finishRequest!: () => void;
    const onProgress = vi.fn();
    repositoryMocks.insert.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRequest = resolve; }));
    addToSyncQueue(scopeA, 'insert', 'i-clear', { id: 'i-clear' });

    const draining = processPendingSyncQueue(scopeA, () => scopeA, { onProgress });
    await vi.waitFor(() => expect(repositoryMocks.insert).toHaveBeenCalledTimes(1));
    clearCustomerSession(scopeA);
    const freshItem = addToSyncQueue(scopeA, 'insert', 'i-after-clear', { id: 'i-after-clear' });
    finishRequest();

    expect(await draining).toMatchObject({ success: false });
    expect(onProgress).not.toHaveBeenCalled();
    expect(getPendingSyncQueue(scopeA).map((item) => item.id)).toEqual([freshItem.id]);
  });

  it('stops the original drain before dispatching another item after explicit discard', async () => {
    const { addToSyncQueue, clearPendingSyncQueue, processPendingSyncQueue } = await import('../localStorageRepos');
    let finishFirstRequest!: () => void;
    repositoryMocks.insert.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirstRequest = resolve; }));
    addToSyncQueue(scopeA, 'insert', 'i-first', { id: 'i-first' });
    addToSyncQueue(scopeA, 'insert', 'i-second', { id: 'i-second' });

    const draining = processPendingSyncQueue(scopeA, () => scopeA);
    await vi.waitFor(() => expect(repositoryMocks.insert).toHaveBeenCalledTimes(1));
    clearPendingSyncQueue(scopeA);
    finishFirstRequest();

    expect(await draining).toMatchObject({ success: false, processed: 1 });
    expect(repositoryMocks.insert).toHaveBeenCalledTimes(1);
  });

  it('preserves an operation added while the queue is draining', async () => {
    const { addToSyncQueue, getPendingSyncQueue, processPendingSyncQueue } = await import('../localStorageRepos');
    let finishRequest!: () => void;
    repositoryMocks.insert.mockImplementationOnce(() => new Promise<void>((resolve) => { finishRequest = resolve; }));
    const original = addToSyncQueue(scopeA, 'insert', 'i-1', { id: 'i-1' });
    const draining = processPendingSyncQueue(scopeA, () => scopeA);
    await vi.waitFor(() => expect(repositoryMocks.insert).toHaveBeenCalledTimes(1));
    const originalQueuedAt = original.queuedAt;
    vi.spyOn(Date, 'now').mockReturnValue(originalQueuedAt + 10);
    addToSyncQueue(scopeA, 'update', 'i-1', { id: 'i-1' });
    finishRequest();

    await draining;
    const queue = getPendingSyncQueue(scopeA);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(original.id);
    expect(queue[0].operation).toBe('insert');
    expect(queue[0].queuedAt).toBeGreaterThan(original.queuedAt);
    vi.restoreAllMocks();
    clearCustomerSession(scopeA);
  });
});
