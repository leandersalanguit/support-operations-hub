import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase, updateCalls } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  updateCalls: [] as Array<{ tableName: string; payload: Record<string, unknown> }>,
}));

vi.mock('../client', () => ({
  supabase,
  isSupabaseConfigured: true,
  withNetworkRetry: (operation: () => Promise<unknown>) => operation(),
}));

import { resourceAdminRepo } from '../resourceAdminRepo';
import { ADMIN_RESOURCE_CONFIGS } from '../../../utils/adminResourceConfig';

describe('ResourceAdminRepository update payloads', () => {
  beforeEach(() => {
    updateCalls.length = 0;
    supabase.from.mockImplementation((tableName: string) => {
      const query: Record<string, any> = {
        update: (payload: Record<string, unknown>) => {
          updateCalls.push({ tableName, payload });
          return query;
        },
        eq: () => query,
        select: () => query,
        single: async () => ({ data: { id: 'resource-id' }, error: null }),
      };
      return query;
    });
  });

  it.each([
    ['admin-installers', 'download_url'],
    ['admin-manuals', 'file_url'],
    ['admin-quick-start-guides', 'guide_url'],
  ] as const)('writes the changed URL to %s directory link field', async (key, alias) => {
    const config = ADMIN_RESOURCE_CONFIGS[key];
    const originalItem = { id: 'resource-id', is_active: true, description: 'Keep this description' };
    const changedUrl = 'https://example.com/new-resource';

    await resourceAdminRepo.updateItem(
      config,
      'resource-id',
      { name: 'Updated resource', url: changedUrl, description: originalItem.description },
      originalItem,
      'Admin'
    );

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].tableName).toBe(config.tableName);
    expect(updateCalls[0].payload).toMatchObject({
      name: 'Updated resource',
      url: changedUrl,
      [alias]: changedUrl,
      description: originalItem.description,
    });
  });

  it('does not add a directory link alias to marketing resources', async () => {
    const config = ADMIN_RESOURCE_CONFIGS['admin-marketing-folders'];
    const changedUrl = 'https://example.com/marketing';

    await resourceAdminRepo.updateItem(
      config,
      'resource-id',
      { name: 'Updated folder', url: changedUrl, categories: ['Campaigns'] },
      { id: 'resource-id', is_active: true },
      'Admin'
    );

    expect(updateCalls[0].tableName).toBe('marketing_resources');
    expect(updateCalls[0].payload).toMatchObject({ name: 'Updated folder', url: changedUrl });
    expect(updateCalls[0].payload).not.toHaveProperty('download_url');
    expect(updateCalls[0].payload).not.toHaveProperty('file_url');
    expect(updateCalls[0].payload).not.toHaveProperty('guide_url');
  });

  it('omits inactive status from an edit payload', async () => {
    const config = ADMIN_RESOURCE_CONFIGS['admin-installers'];

    await resourceAdminRepo.updateItem(
      config,
      'resource-id',
      { name: 'Updated installer', url: 'https://example.com/installer', is_active: false },
      { id: 'resource-id', is_active: false },
      'Admin'
    );

    expect(updateCalls[0].payload).not.toHaveProperty('is_active');
  });
});
