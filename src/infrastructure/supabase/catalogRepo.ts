/**
 * @file catalogRepo.ts
 * @description Strongly typed Supabase implementation of ICatalogRepository.
 * Manages catalog products, atomic recursive cascading renames via RPC,
 * and administrative audit log tracking.
 */

import { ICatalogRepository } from '../../domain/catalog/repository';
import {
  CatalogProduct,
  CatalogAuditLog,
  RenameProductPayload,
  RenameProductResult,
  CreateProductPayload,
} from '../../domain/catalog/types';
import { sanitizeCatalogProductName } from '../../domain/catalog/validation';
import { formatAgentDisplayName } from '../../domain/identity/policies';
import { CLIENT_PRODUCTS } from '../../domain/interaction/types';
import { supabase, isSupabaseConfigured, withNetworkRetry } from './client';
import { generateUUID, isValidUUID } from '../../utils/uuid';

export class SupabaseCatalogRepository implements ICatalogRepository {
  constructor(
    private client: any = supabase,
    private isConfigured: boolean = isSupabaseConfigured
  ) {}
  /**
   * Fetches all catalog products enriched with live CRM client counts and interaction usage counts.
   */
  async getProductsWithStats(): Promise<CatalogProduct[]> {
    if (!this.isConfigured) {
      return CLIENT_PRODUCTS.map((name, idx) => ({
        id: `mock-product-${idx}`,
        name,
        isActive: true,
        displayOrder: idx + 1,
        clientCount: 0,
        interactionCount: 0,
      }));
    }

    return await withNetworkRetry(async () => {
      // 1. Attempt to query via get_catalog_product_stats RPC
      const { data: rpcData, error: rpcError } = await this.client.rpc('get_catalog_product_stats');

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((d: any) => ({
          id: d.id,
          name: d.name,
          isActive: Boolean(d.is_active),
          displayOrder: typeof d.display_order === 'number' ? d.display_order : 0,
          clientCount: Number(d.client_count || 0),
          interactionCount: Number(d.interaction_count || 0),
        }));
      }

      // 2. Fallback: Query catalog_products directly if RPC not yet deployed
      const { data: tableData, error: tableError } = await this.client
        .from('catalog_products')
        .select('id, name, is_active, display_order')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (tableError) {
        console.warn('[catalogRepo] Warning querying catalog_products:', tableError.message);
        return CLIENT_PRODUCTS.map((name, idx) => ({
          id: `fallback-product-${idx}`,
          name,
          isActive: true,
          displayOrder: idx + 1,
        }));
      }

      return (tableData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        isActive: Boolean(p.is_active),
        displayOrder: typeof p.display_order === 'number' ? p.display_order : 0,
        clientCount: 0,
        interactionCount: 0,
      }));
    });
  }

  /**
   * Atomically renames a catalog product and cascades through all related tables via RPC.
   */
  async renameProduct(payload: RenameProductPayload): Promise<RenameProductResult> {
    const oldName = sanitizeCatalogProductName(payload.oldName);
    const newName = sanitizeCatalogProductName(payload.newName);
    const agent = payload.agentName ? formatAgentDisplayName(payload.agentName) : 'Team Lead';

    if (!oldName || !newName) {
      throw new Error('Both old and new product names are required.');
    }

    if (!this.isConfigured) {
      return {
        success: true,
        productId: generateUUID(),
        oldName,
        newName,
        affectedClients: 0,
        affectedInteractions: 0,
        affectedSessions: 0,
        performedBy: agent,
      };
    }

    return await withNetworkRetry(async () => {
      const { data, error } = await this.client.rpc('rename_catalog_product', {
        p_old_name: oldName,
        p_new_name: newName,
        p_agent_name: agent,
      });

      if (error) {
        // If RPC function not yet created in Supabase SQL editor, fallback to direct update
        if (error.code === 'PGRST202' || error.message?.includes('schema cache')) {
          console.warn('[catalogRepo] Notice: rename_catalog_product RPC not in schema cache, using direct update fallback.');
          const { error: updateError } = await this.client
            .from('catalog_products')
            .update({ name: newName })
            .eq('name', oldName);

          if (updateError) {
            console.error('[catalogRepo] fallback update error:', updateError);
            throw new Error(updateError.message);
          }

          return {
            success: true,
            oldName,
            newName,
            affectedClients: 0,
            affectedInteractions: 0,
            performedBy: agent,
          };
        }

        console.error('[catalogRepo] rename_catalog_product error:', error);
        throw new Error(error.message);
      }

      return {
        success: Boolean(data?.success),
        productId: data?.product_id,
        oldName: data?.old_name || oldName,
        newName: data?.new_name || newName,
        affectedClients: Number(data?.affected_clients || 0),
        affectedInteractions: Number(data?.affected_interactions || 0),
        affectedSessions: Number(data?.affected_sessions || 0),
        performedBy: data?.performed_by || agent,
      };
    });
  }

  /**
   * Adds a new product to the catalog.
   */
  async addProduct(payload: CreateProductPayload): Promise<CatalogProduct> {
    const name = sanitizeCatalogProductName(payload.name);
    const agent = payload.agentName ? formatAgentDisplayName(payload.agentName) : 'Team Lead';
    const displayOrder = payload.displayOrder ?? 0;
    const isActive = payload.isActive ?? true;

    if (!name) {
      throw new Error('Product name is required.');
    }

    if (!this.isConfigured) {
      return {
        id: generateUUID(),
        name,
        isActive,
        displayOrder,
        clientCount: 0,
        interactionCount: 0,
      };
    }

    return await withNetworkRetry(async () => {
      // 1. Insert product
      const { data, error } = await this.client
        .from('catalog_products')
        .insert([
          {
            name,
            is_active: isActive,
            display_order: displayOrder,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[catalogRepo] addProduct insert error:', error);
        throw new Error(error.message);
      }

      // 2. Record audit log
      try {
        await this.client.from('catalog_audit_logs').insert([
          {
            catalog_type: 'product',
            action: 'create',
            new_value: name,
            performed_by: agent,
            details: { product_id: data.id },
          },
        ]);
      } catch (auditErr) {
        console.warn('[catalogRepo] Audit log notice on product add:', auditErr);
      }

      return {
        id: data.id,
        name: data.name,
        isActive: Boolean(data.is_active),
        displayOrder: data.display_order ?? 0,
        clientCount: 0,
        interactionCount: 0,
      };
    });
  }

  /**
   * Toggles product active state.
   */
  async toggleProductActive(id: string, isActive: boolean, agentName?: string): Promise<void> {
    if (!this.isConfigured) return;

    const agent = agentName ? formatAgentDisplayName(agentName) : 'Team Lead';

    await withNetworkRetry(async () => {
      // 1. Fetch current product name for audit
      const { data: current } = await this.client
        .from('catalog_products')
        .select('name')
        .eq('id', id)
        .maybeSingle();

      // 2. Update status
      const { error } = await this.client
        .from('catalog_products')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.error('[catalogRepo] toggleProductActive error:', error);
        throw new Error(error.message);
      }

      // 3. Log audit event
      try {
        await this.client.from('catalog_audit_logs').insert([
          {
            catalog_type: 'product',
            action: 'toggle_active',
            old_value: current?.name || id,
            new_value: isActive ? 'active' : 'inactive',
            performed_by: agent,
            details: { product_id: id, is_active: isActive },
          },
        ]);
      } catch (auditErr) {
        console.warn('[catalogRepo] Audit log notice on toggleActive:', auditErr);
      }
    });
  }

  /**
   * Fetches recent administrative catalog audit history logs.
   */
  async getAuditLogs(limit = 100): Promise<CatalogAuditLog[]> {
    if (!this.isConfigured) return [];

    return await withNetworkRetry(async () => {
      const { data, error } = await this.client
        .from('catalog_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[catalogRepo] Warning querying catalog_audit_logs:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        catalogType: row.catalog_type || 'product',
        action: row.action,
        oldValue: row.old_value || undefined,
        newValue: row.new_value || undefined,
        details: row.details || {},
        performedBy: row.performed_by || 'Unknown',
        performedById: row.performed_by_id && isValidUUID(row.performed_by_id) ? row.performed_by_id : undefined,
        createdAt: row.created_at,
      }));
    });
  }
}

export const catalogRepo = new SupabaseCatalogRepository();
