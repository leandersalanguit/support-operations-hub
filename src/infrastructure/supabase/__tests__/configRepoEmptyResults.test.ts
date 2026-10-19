import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase, config } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  config: { isConfigured: true },
}));

vi.mock('../client', () => ({
  supabase,
  get isSupabaseConfigured() {
    return config.isConfigured;
  },
  withNetworkRetry: (operation: () => Promise<unknown>) => operation(),
}));

import { configRepo } from '../configRepo';

describe('configRepo empty results', () => {
  beforeEach(() => {
    config.isConfigured = true;
    supabase.from.mockImplementation(() => {
      const query: Record<string, any> = {
        select: () => query,
        eq: () => query,
        order: () => query,
        then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    });
  });

  it('keeps every configured catalog empty when the query succeeds with no rows', async () => {
    await expect(configRepo.getProducts()).resolves.toEqual([]);
    await expect(configRepo.getClassifications()).resolves.toEqual([]);
    await expect(configRepo.getMarketingResources()).resolves.toEqual([]);
    await expect(configRepo.getInstallers()).resolves.toEqual([]);
    await expect(configRepo.getRecommendedHardware()).resolves.toEqual([]);
    await expect(configRepo.getManuals()).resolves.toEqual([]);
    await expect(configRepo.getQuickStartGuides()).resolves.toEqual([]);
    await expect(configRepo.getSupportTiers()).resolves.toEqual([]);
  });

  it('uses local defaults when Supabase is not configured', async () => {
    config.isConfigured = false;

    await expect(configRepo.getProducts()).resolves.not.toEqual([]);
    await expect(configRepo.getClassifications()).resolves.not.toEqual([]);
    await expect(configRepo.getMarketingResources()).resolves.not.toEqual([]);
    await expect(configRepo.getInstallers()).resolves.not.toEqual([]);
    await expect(configRepo.getRecommendedHardware()).resolves.not.toEqual([]);
    await expect(configRepo.getManuals()).resolves.not.toEqual([]);
    await expect(configRepo.getQuickStartGuides()).resolves.not.toEqual([]);
    await expect(configRepo.getSupportTiers()).resolves.not.toEqual([]);
  });

  it('throws configured query errors instead of substituting sample data', async () => {
    const queryError = { message: 'permission denied' };
    supabase.from.mockImplementation(() => {
      const query: Record<string, any> = {
        select: () => query,
        eq: () => query,
        order: () => query,
        then: (resolve: (result: { data: null; error: typeof queryError }) => unknown) =>
          Promise.resolve({ data: null, error: queryError }).then(resolve),
      };
      return query;
    });

    await expect(configRepo.getProducts()).rejects.toMatchObject(queryError);
    await expect(configRepo.getClassifications()).rejects.toMatchObject(queryError);
    await expect(configRepo.getMarketingResources()).rejects.toMatchObject(queryError);
    await expect(configRepo.getInstallers()).rejects.toMatchObject(queryError);
    await expect(configRepo.getRecommendedHardware()).rejects.toMatchObject(queryError);
    await expect(configRepo.getManuals()).rejects.toMatchObject(queryError);
    await expect(configRepo.getQuickStartGuides()).rejects.toMatchObject(queryError);
    await expect(configRepo.getSupportTiers()).rejects.toMatchObject(queryError);
  });
});
