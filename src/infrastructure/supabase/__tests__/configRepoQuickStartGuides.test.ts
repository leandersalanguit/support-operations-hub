import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../client', () => ({
  supabase,
  isSupabaseConfigured: true,
  withNetworkRetry: (operation: () => Promise<unknown>) => operation(),
}));

import { configRepo } from '../configRepo';

describe('configRepo Quick Start Guide difficulty mapping', () => {
  beforeEach(() => {
    const rows = [
      {
        id: 'guide-no-difficulty',
        name: 'Basic Setup',
        categories: [],
        difficulty: null,
        guide_url: 'https://example.com/basic',
      },
      {
        id: 'guide-intermediate',
        name: 'Advanced Setup',
        categories: [],
        difficulty: 'Intermediate',
        guide_url: 'https://example.com/advanced',
      },
    ];
    supabase.from.mockImplementation((tableName: string) => {
      const query: Record<string, any> = {
        select: () => query,
        eq: () => query,
        order: async () => ({ data: tableName === 'quick_start_guides' ? rows : [], error: null }),
      };
      return query;
    });
  });

  it('keeps missing difficulty null and preserves selected enum values', async () => {
    const guides = await configRepo.getQuickStartGuides();

    expect(guides).toEqual([
      expect.objectContaining({ id: 'guide-no-difficulty', difficulty: null }),
      expect.objectContaining({ id: 'guide-intermediate', difficulty: 'Intermediate' }),
    ]);
  });
});
