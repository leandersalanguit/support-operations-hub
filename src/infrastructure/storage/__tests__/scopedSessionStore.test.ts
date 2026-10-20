import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearCustomerSession,
  readScopedSession,
  scopedSessionKey,
  writeScopedSession,
  CUSTOMER_CACHE_TTL_MS,
  QUEUE_RETRY_TTL_MS,
} from '../scopedSessionStore';
import { getPendingSyncQueue, SyncQueueItem } from '../localStorageRepos';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const scopeA = { projectId: 'project-a', userId: 'user-a' };
const scopeB = { projectId: 'project-a', userId: 'user-b' };
const isString = (value: unknown): value is string => typeof value === 'string';

describe('scoped session store', () => {
  const storage = new MemoryStorage();
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  it('isolates two users and rejects data after the 30-minute cache lifetime', () => {
    vi.stubGlobal('sessionStorage', storage);
    writeScopedSession(scopeA, 'interactions', 'A records', 1000);
    writeScopedSession(scopeB, 'interactions', 'B records', 1000);
    expect(readScopedSession(scopeA, 'interactions', isString, CUSTOMER_CACHE_TTL_MS, 1001)).toBe('A records');
    expect(readScopedSession(scopeB, 'interactions', isString, CUSTOMER_CACHE_TTL_MS, 1001)).toBe('B records');
    expect(readScopedSession(scopeA, 'interactions', isString, CUSTOMER_CACHE_TTL_MS, 1000 + CUSTOMER_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('rejects malformed entries and clears only customer-session keys', () => {
    vi.stubGlobal('sessionStorage', storage);
    storage.setItem(scopedSessionKey(scopeA, 'clients'), '{bad json');
    storage.setItem(scopedSessionKey(scopeB, 'queue'), 'queue');
    storage.setItem('support_shift_interactions_v2', 'legacy, retained for reconciliation');
    expect(readScopedSession(scopeA, 'clients', isString)).toBeNull();
    clearCustomerSession(scopeB);
    expect(storage.getItem(scopedSessionKey(scopeB, 'queue'))).toBeNull();
    expect(storage.getItem('support_shift_interactions_v2')).toContain('legacy');
  });

  it('does not extend cache lifetime when data is read', () => {
    vi.stubGlobal('sessionStorage', storage);
    writeScopedSession(scopeA, 'clients', 'cached', 10_000);
    readScopedSession(scopeA, 'clients', isString, CUSTOMER_CACHE_TTL_MS, 10_100);
    expect(readScopedSession(scopeA, 'clients', isString, CUSTOMER_CACHE_TTL_MS, 10_000 + CUSTOMER_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('keeps expired queued work for review under its original user scope', () => {
    vi.stubGlobal('sessionStorage', storage);
    const now = 100_000_000;
    const oldItem: SyncQueueItem = {
      id: 'op-1', operation: 'update', interactionId: 'interaction-1', payload: { id: 'interaction-1' },
      ownerUserId: scopeA.userId, projectId: scopeA.projectId, queuedAt: now - QUEUE_RETRY_TTL_MS - 1,
      reviewRequired: false, retryCount: 0,
    };
    const foreignItem = { ...oldItem, id: 'op-2', ownerUserId: scopeB.userId, queuedAt: now };
    writeScopedSession(scopeA, 'queue', [oldItem, foreignItem], now);

    const queue = getPendingSyncQueue(scopeA, now);
    expect(queue).toHaveLength(2);
    expect(queue[0].reviewRequired).toBe(true);
    expect(queue[1].reviewRequired).toBe(true);
    expect(getPendingSyncQueue({ ...scopeA, projectId: 'other-project' }, now)).toEqual([]);
  });
});
