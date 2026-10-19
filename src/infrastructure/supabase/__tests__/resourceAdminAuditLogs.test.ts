import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase, queryCalls, responses } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  queryCalls: [] as Array<{ method: string; args: unknown[] }>,
  responses: [] as Array<{ data: unknown[] | null; error: { message: string } | null }>,
}));

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, supabase, isSupabaseConfigured: true };
});

import { resourceAdminRepo } from '../resourceAdminRepo';

describe('ResourceAdminRepository audit logs', () => {
  beforeEach(() => {
    queryCalls.length = 0;
    responses.length = 0;
    supabase.from.mockClear();
    vi.useFakeTimers();
    supabase.from.mockImplementation((tableName: string) => {
      queryCalls.push({ method: 'from', args: [tableName] });
      const query = {
        select: (...args: unknown[]) => { queryCalls.push({ method: 'select', args }); return query; },
        order: (...args: unknown[]) => { queryCalls.push({ method: 'order', args }); return query; },
        limit: (...args: unknown[]) => { queryCalls.push({ method: 'limit', args }); return query; },
        eq: (...args: unknown[]) => { queryCalls.push({ method: 'eq', args }); return query; },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(responses.shift()).then(resolve, reject),
      };
      return query;
    });
  });

  afterEach(() => vi.useRealTimers());

  it('throws a useful error when the configured audit query fails', async () => {
    responses.push({ data: null, error: { message: 'permission denied' } });

    await expect(resourceAdminRepo.getAuditLogs('installer'))
      .rejects.toThrow('Failed to load audit logs: permission denied');
  });

  it('returns an empty array when the configured audit query succeeds with no rows', async () => {
    responses.push({ data: [], error: null });

    await expect(resourceAdminRepo.getAuditLogs()).resolves.toEqual([]);
  });

  it('maps rows and preserves the audit type filter and result limit', async () => {
    const row = {
      id: 'audit-1',
      catalog_type: 'installer',
      action: 'updated',
      old_value: { name: 'Old' },
      new_value: { name: 'New' },
      details: { field: 'name' },
      performed_by: 'Admin',
      performed_by_id: 'user-1',
      created_at: '2026-10-19T10:00:00Z',
    };
    responses.push({ data: [row], error: null });

    await expect(resourceAdminRepo.getAuditLogs('installer', 25)).resolves.toEqual([{
      id: 'audit-1',
      catalogType: 'installer',
      action: 'updated',
      oldValue: { name: 'Old' },
      newValue: { name: 'New' },
      details: { field: 'name' },
      performedBy: 'Admin',
      performedById: 'user-1',
      createdAt: '2026-10-19T10:00:00Z',
    }]);
    expect(queryCalls).toContainEqual({ method: 'eq', args: ['catalog_type', 'installer'] });
    expect(queryCalls).toContainEqual({ method: 'limit', args: [25] });
  });

  it('retries a network query error and returns the successful result', async () => {
    responses.push(
      { data: null, error: { message: 'Failed to fetch' } },
      { data: [], error: null },
    );

    const result = resourceAdminRepo.getAuditLogs();
    await vi.advanceTimersByTimeAsync(600);

    await expect(result).resolves.toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
