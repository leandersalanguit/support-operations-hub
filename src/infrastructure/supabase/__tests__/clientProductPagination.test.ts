import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseClientRepository } from '../clientRepo';

const mocks = vi.hoisted(() => ({ from: vi.fn(), range: vi.fn(), links: [] as Array<{ client_id: string; product_name: string }> }));
vi.mock('../client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../client')>(),
  supabase: { from: mocks.from },
  isSupabaseConfigured: true,
  withNetworkRetry: <T>(operation: () => Promise<T>) => operation(),
}));

const client = { id: 'client-a', name: 'Client A', phone_numbers: [], created_at: '2026-10-24', updated_at: '2026-10-24', client_products: [] };

describe('interaction product pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.links = Array.from({ length: 1001 }, (_, index) => ({ client_id: client.id, product_name: index === 1000 ? 'Last product' : 'Common product' }));
    mocks.range.mockImplementation((start: number, end: number) => Promise.resolve({ data: mocks.links.slice(start, end + 1), error: null }));
    mocks.from.mockImplementation((table: string) => {
      if (table === 'client_product_interactions') {
        const query = { select: vi.fn(), in: vi.fn(), order: vi.fn(), range: mocks.range };
        query.select.mockReturnValue(query);
        query.in.mockReturnValue(query);
        query.order.mockReturnValue(query);
        return query;
      }
      if (table === 'client_products') return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      const query = { select: vi.fn(), order: vi.fn(), ilike: vi.fn(), maybeSingle: vi.fn(), update: vi.fn(), eq: vi.fn() };
      query.select.mockReturnValue(query);
      query.order.mockResolvedValue({ data: [client], error: null });
      query.ilike.mockReturnValue(query);
      query.maybeSingle.mockResolvedValue({ data: client, error: null });
      query.update.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    });
  });

  it('includes equipment after the first thousand interaction links in the directory', async () => {
    const result = await new SupabaseClientRepository().getAll();
    expect(result[0].interactionProducts).toEqual(['Common product', 'Last product']);
    expect(mocks.range.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });

  it('includes equipment after the first thousand links when updating one client', async () => {
    const result = await new SupabaseClientRepository().upsertClientWithProduct({ clientName: client.name });
    expect(result.interactionProducts).toEqual(['Common product', 'Last product']);
    expect(mocks.range).toHaveBeenCalledTimes(3);
  });

  it('surfaces a later page failure instead of returning incomplete equipment', async () => {
    mocks.range.mockImplementationOnce(() => Promise.resolve({ data: mocks.links.slice(0, 500), error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: null, error: { code: '42501', message: 'access denied' } }));
    await expect(new SupabaseClientRepository().getAll()).rejects.toMatchObject({ code: '42501' });
  });
});
