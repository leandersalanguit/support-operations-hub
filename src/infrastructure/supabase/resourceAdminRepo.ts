/**
 * @file resourceAdminRepo.ts
 * @description Administrative repository for managing dynamic catalog resources
 * (Case Classifications, Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals)
 * in Supabase PostgreSQL. Database triggers write audit records transactionally.
 */

import { supabase, isSupabaseConfigured, withNetworkRetry } from './client';
import { AdminResourceConfig } from '../../utils/adminResourceConfig';
import { sanitizeResourcePayload, validateResourcePayload } from '../../utils/adminFormValidation';
import { CatalogAuditLog } from '../../domain/catalog/types';
import { generateUUID } from '../../utils/uuid';
import {
  INSTALLERS,
  RECOMMENDED_HARDWARE,
  MANUALS,
  QUICK_START_GUIDES,
  MARKETING_FOLDERS,
} from '../../data';
import { CASE_CLASSIFICATIONS } from '../../domain/interaction/types';

export class ResourceAdminRepository {
  private buildResourcePayload(config: AdminResourceConfig, values: Record<string, any>) {
    const validation = validateResourcePayload(config, values);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors).join(' '));
    }
    return sanitizeResourcePayload(config, values);
  }

  /**
   * Fetches all entries (both active and inactive) for a resource table.
   * Local sample data is used only when Supabase is not configured. Query errors
   * propagate to the view, and an empty database table remains empty.
   */
  async fetchItems<T = any>(config: AdminResourceConfig): Promise<T[]> {
    if (!isSupabaseConfigured) {
      return this.getFallbackData<T>(config.tableName);
    }

    return await withNetworkRetry(async () => {
      const { data, error } = await supabase
        .from(config.tableName)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[resourceAdminRepo] Error querying ${config.tableName}:`, error);
        throw new Error(`Failed to load ${config.tableName}: ${error.message}`);
      }

      return (data ?? []) as T[];
    });
  }

  /**
   * Creates a resource entry. A database trigger writes its audit record atomically.
   */
  async createItem(
    config: AdminResourceConfig,
    values: Record<string, any>,
    _agentName: string
  ): Promise<any> {
    const payload = this.buildResourcePayload(config, values);

    if (!isSupabaseConfigured) {
      return {
        id: generateUUID(),
        ...payload,
        created_at: new Date().toISOString(),
      };
    }

    return await withNetworkRetry(async () => {
      // 1. Insert into target table
      const { data, error } = await supabase
        .from(config.tableName)
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error(`[resourceAdminRepo] Error inserting into ${config.tableName}:`, error);
        throw new Error(error.message);
      }

      return data;
    });
  }

  /**
   * Toggles active status. A database trigger writes its audit record atomically.
   */
  async toggleActive(
    config: AdminResourceConfig,
    id: string,
    _name: string,
    isActive: boolean,
    _agentName: string
  ): Promise<void> {

    if (!isSupabaseConfigured) return;

    await withNetworkRetry(async () => {
      // 1. Update status in target table
      const { error } = await supabase
        .from(config.tableName)
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.error(`[resourceAdminRepo] Error updating ${config.tableName}:`, error);
        throw new Error(error.message);
      }

    });
  }

  /**
   * Updates an existing resource entry. A database trigger writes its audit record atomically.
   */
  async updateItem(
    config: AdminResourceConfig,
    id: string,
    values: Record<string, any>,
    _originalItem: any,
    _agentName: string
  ): Promise<any> {
    const payload = this.buildResourcePayload(config, values);

    if (!isSupabaseConfigured) {
      return { id, ..._originalItem, ...payload, updated_at: new Date().toISOString() };
    }

    return await withNetworkRetry(async () => {
      // 1. Update target table
      const { data, error } = await supabase
        .from(config.tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[resourceAdminRepo] Error updating ${config.tableName}:`, error);
        throw new Error(error.message);
      }

      return data;
    });
  }

  /**
   * Renames a resource entry. A database trigger writes its audit record atomically.
   */
  async renameItem(
    config: AdminResourceConfig,
    id: string,
    _oldName: string,
    newName: string,
    _agentName: string
  ): Promise<void> {

    if (!isSupabaseConfigured) return;

    await withNetworkRetry(async () => {
      // 1. Update name in target table
      const { error } = await supabase
        .from(config.tableName)
        .update({ name: newName })
        .eq('id', id);

      if (error) {
        console.error(`[resourceAdminRepo] Error renaming in ${config.tableName}:`, error);
        throw new Error(error.message);
      }

    });
  }

  /**
   * Fetches audit history records for this resource or all resources from catalog_audit_logs.
   */
  async getAuditLogs(catalogType?: string, limit = 100): Promise<CatalogAuditLog[]> {
    if (!isSupabaseConfigured) return [];

    return await withNetworkRetry(async () => {
      let query = supabase
        .from('catalog_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (catalogType && catalogType !== 'all') {
        query = query.eq('catalog_type', catalogType);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[resourceAdminRepo] Warning querying catalog_audit_logs:', error.message);
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
        performedById: row.performed_by_id || undefined,
        createdAt: row.created_at,
      }));
    });
  }

  /**
   * Fallback mock data when running offline or table is uninitialized.
   */
  private getFallbackData<T>(tableName: string): T[] {
    switch (tableName) {
      case 'case_classifications':
        return CASE_CLASSIFICATIONS.map((name, idx) => ({
          id: `fallback-class-${idx}`,
          name,
          category: 'General',
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      case 'installers':
        return INSTALLERS.map((item, idx) => ({
          ...item,
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      case 'marketing_resources':
        return MARKETING_FOLDERS.map((item, idx) => ({
          id: item.id,
          name: item.name,
          categories: item.categories,
          url: item.driveUrl,
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      case 'quick_start_guides':
        return QUICK_START_GUIDES.map((item, idx) => ({
          ...item,
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      case 'recommended_hardware':
        return RECOMMENDED_HARDWARE.map((item, idx) => ({
          ...item,
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      case 'manuals':
        return MANUALS.map((item, idx) => ({
          ...item,
          is_active: true,
          display_order: idx + 1,
        })) as unknown as T[];
      default:
        return [];
    }
  }
}

export const resourceAdminRepo = new ResourceAdminRepository();
