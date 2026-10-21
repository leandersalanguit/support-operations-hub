import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseInteractionRepository } from '../interactionRepo';
import { SupabaseClientRepository } from '../clientRepo';
import { isAccessDeniedError, ACCESS_RECHECK_ERROR_CODE } from '../client';
import { SupportInteraction } from '../../../domain/interaction/types';
import { ClientProfile } from '../../../domain/client/types';

const databaseMocks = vi.hoisted(() => {
  const query = {
    delete: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };
  return { query, from: vi.fn() };
});

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  return {
    ...actual,
    supabase: { from: databaseMocks.from },
    isSupabaseConfigured: true,
    withNetworkRetry: <T>(operation: () => Promise<T>) => operation(),
  };
});

const interaction: SupportInteraction = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-10-20T00:00:00.000Z',
  date: '2026-10-20',
  dayOfWeek: 'Tuesday',
  agent: 'Alex',
  agentId: 'user-a',
  clientName: 'Client A',
  channel: 'Call',
  channelDetails: '',
  clientProduct: '',
  caseClassification: '',
  license: 'support_active',
  status: 'Solved',
  inEvent: false,
  firstTimeUser: false,
  additionalNotes: '',
  time: '12:00',
};
const client: ClientProfile = {
  id: 'client-a',
  name: 'Client A',
  phoneNumbers: [],
  ownedProducts: [],
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('Supabase mutation zero-row access rechecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(databaseMocks.query)) {
      method.mockReturnValue(databaseMocks.query);
    }
    databaseMocks.query.then.mockImplementation((resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject)
    );
    databaseMocks.from.mockReturnValue(databaseMocks.query);
  });

  it('detects an interaction delete that affected no rows', async () => {
    databaseMocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseInteractionRepository();

    let caught: unknown;
    try {
      await repository.delete(interaction.id);
    } catch (error) {
      caught = error;
    }

    expect(databaseMocks.query.delete).toHaveBeenCalledOnce();
    expect(databaseMocks.query.select).toHaveBeenCalledWith('id');
    expect(caught).toMatchObject({ code: ACCESS_RECHECK_ERROR_CODE });
    expect(isAccessDeniedError(caught)).toBe(true);
  });

  it('preserves PGRST116 from an update single-row mutation for the access recheck path', async () => {
    databaseMocks.query.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, no rows returned' },
    });
    const repository = new SupabaseInteractionRepository();

    let caught: unknown;
    try {
      await repository.update(interaction);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: 'PGRST116' });
    expect(isAccessDeniedError(caught)).toBe(true);
  });

  it('detects a client delete that affected no rows', async () => {
    databaseMocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseClientRepository();

    let caught: unknown;
    try {
      await repository.delete(client.id);
    } catch (error) {
      caught = error;
    }

    expect(databaseMocks.query.select).toHaveBeenCalledWith('id');
    expect(caught).toMatchObject({ code: ACCESS_RECHECK_ERROR_CODE });
    expect(isAccessDeniedError(caught)).toBe(true);
  });

  it('preserves zero-row PGRST116 from a client upsert mutation', async () => {
    databaseMocks.query.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, no rows returned' },
    });
    const repository = new SupabaseClientRepository();

    let caught: unknown;
    try {
      await repository.update(client);
    } catch (error) {
      caught = error;
    }

    expect(databaseMocks.query.upsert).toHaveBeenCalledOnce();
    expect(caught).toMatchObject({ code: 'PGRST116' });
    expect(isAccessDeniedError(caught)).toBe(true);
  });

  it('does not delete existing product links when adding a product and surfaces link upsert denial', async () => {
    databaseMocks.query.single.mockResolvedValue({ data: { id: client.id }, error: null });
    databaseMocks.query.then
      .mockImplementationOnce((resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
      )
      .mockImplementationOnce((resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { code: '42501', message: 'row level security denied' } }).then(resolve, reject)
      );
    const repository = new SupabaseClientRepository();

    let caught: unknown;
    try {
      await repository.update({ ...client, ownedProducts: ['New product'] });
    } catch (error) {
      caught = error;
    }

    expect(databaseMocks.query.delete).not.toHaveBeenCalled();
    expect(caught).toMatchObject({ code: '42501' });
    expect(isAccessDeniedError(caught)).toBe(true);
  });

  it('requests access recheck when an expected product-link delete affects zero rows', async () => {
    databaseMocks.query.single.mockResolvedValue({ data: { id: client.id }, error: null });
    databaseMocks.query.then
      .mockImplementationOnce((resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: 'product-link-a', product_name: 'Old product' }], error: null }).then(resolve, reject)
      )
      .mockImplementationOnce((resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
      );
    const repository = new SupabaseClientRepository();

    let caught: unknown;
    try {
      await repository.update({ ...client, ownedProducts: [] });
    } catch (error) {
      caught = error;
    }

    expect(databaseMocks.query.delete).toHaveBeenCalledOnce();
    expect(databaseMocks.query.in).toHaveBeenCalledWith('id', ['product-link-a']);
    expect(caught).toMatchObject({ code: ACCESS_RECHECK_ERROR_CODE });
  });
});
