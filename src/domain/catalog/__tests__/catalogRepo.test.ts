import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseCatalogRepository } from '../../../infrastructure/supabase/catalogRepo';
import { supabase } from '../../../infrastructure/supabase/client';

describe('SupabaseCatalogRepository', () => {
  let repo: SupabaseCatalogRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new SupabaseCatalogRepository();
  });

  it('rejects rename when old or new name is empty', async () => {
    await expect(
      repo.renameProduct({ oldName: '', newName: 'New Product' })
    ).rejects.toThrow(/required/i);

    await expect(
      repo.renameProduct({ oldName: 'Old Product', newName: '   ' })
    ).rejects.toThrow(/required/i);
  });

  it('rejects adding product when name is empty', async () => {
    await expect(
      repo.addProduct({ name: '   ' })
    ).rejects.toThrow(/required/i);
  });

  it('provides safe fallback products when offline / unconfigured', async () => {
    const products = await repo.getProductsWithStats();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('name');
    expect(products[0]).toHaveProperty('isActive');
  });

  it('successfully executes rename via RPC response', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        old_name: 'Old Model',
        new_name: 'New Model',
        affected_clients: 4,
        affected_interactions: 15,
        affected_sessions: 1,
        performed_by: 'Jane D.',
      },
      error: null,
    } as any);

    const res = await repo.renameProduct({
      oldName: 'Old Model',
      newName: 'New Model',
      agentName: 'Jane D.',
    });

    expect(rpcSpy).toHaveBeenCalledWith('rename_catalog_product', {
      p_old_name: 'Old Model',
      p_new_name: 'New Model',
      p_agent_name: 'Jane D.',
    });
    expect(res.success).toBe(true);
    expect(res.oldName).toBe('Old Model');
    expect(res.newName).toBe('New Model');
    expect(res.affectedClients).toBe(4);
    expect(res.affectedInteractions).toBe(15);
    expect(res.affectedSessions).toBe(1);
    expect(res.performedBy).toBe('Jane D.');
  });

  it('handles getAuditLogs gracefully', async () => {
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        order: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'audit-1',
                catalog_type: 'product',
                action: 'rename',
                old_value: 'Old Model',
                new_value: 'New Model',
                details: {},
                performed_by: 'Alex M.',
                created_at: '2026-09-28T07:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const logs = await repo.getAuditLogs(10);
    expect(fromSpy).toHaveBeenCalledWith('catalog_audit_logs');
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('rename');
    expect(logs[0].oldValue).toBe('Old Model');
    expect(logs[0].newValue).toBe('New Model');
    expect(logs[0].performedBy).toBe('Alex M.');
  });
});
