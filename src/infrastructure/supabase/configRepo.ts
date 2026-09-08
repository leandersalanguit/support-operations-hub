/**
 * @file configRepo.ts
 * @description Repository for fetching dynamic application taxonomies (products, case classifications,
 * marketing resources, installers, recommended hardware, manuals, quick start guides, and commercial support tiers)
 * from PostgreSQL, keeping proprietary company data out of the public Git codebase.
 */

import { supabase, isSupabaseConfigured, withNetworkRetry } from './client';
import { CLIENT_PRODUCTS, CASE_CLASSIFICATIONS } from '../../domain/interaction/types';
import {
  InstallerItem,
  INSTALLERS,
  RecommendedHardwareItem,
  RECOMMENDED_HARDWARE,
  ManualItem,
  MANUALS,
  QuickStartGuideItem,
  QUICK_START_GUIDES,
  MARKETING_FOLDERS,
} from '../../data';

export interface MarketingResource {
  id: string;
  name: string;
  categories: string[];
  url: string;
}

export const MARKETING_FALLBACK_RESOURCES: MarketingResource[] = MARKETING_FOLDERS.map((m) => ({
  id: m.id,
  name: m.name,
  categories: m.categories,
  url: m.driveUrl,
}));

export interface SupportTier {
  id?: string;
  code: string;
  label: string;
  exportLabel: string;
  isDefault?: boolean;
}

export const DEFAULT_SUPPORT_TIERS: SupportTier[] = [
  { code: 'support_active', label: 'License Active', exportLabel: 'Yes', isDefault: true },
  { code: 'renewal_sent', label: 'Renewal Sent', exportLabel: 'Renewal Sent', isDefault: false },
  { code: 'support_inactive', label: 'Support Inactive', exportLabel: 'Support Inactive', isDefault: false },
];

export class SupabaseConfigRepository {
  /**
   * Fetches active commercial products. Falls back to domain catalog if offline or empty.
   */
  async getProducts(): Promise<string[]> {
    if (!isSupabaseConfigured) return [...CLIENT_PRODUCTS];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('catalog_products')
          .select('name')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query catalog_products from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...CLIENT_PRODUCTS];
        }

        return data.map((p) => p.name);
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getProducts():', err?.message || err);
      return [...CLIENT_PRODUCTS];
    }
  }

  /**
   * Fetches active case classifications. Falls back to domain list if offline or empty.
   */
  async getClassifications(): Promise<string[]> {
    if (!isSupabaseConfigured) return [...CASE_CLASSIFICATIONS];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('case_classifications')
          .select('name')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query case_classifications from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...CASE_CLASSIFICATIONS];
        }

        return data.map((c) => c.name);
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getClassifications():', err?.message || err);
      return [...CASE_CLASSIFICATIONS];
    }
  }

  /**
   * Fetches active marketing resources / drive links.
   * Falls back to local static marketing folders if unconfigured, error, or table is empty.
   */
  async getMarketingResources(): Promise<MarketingResource[]> {
    if (!isSupabaseConfigured) return [...MARKETING_FALLBACK_RESOURCES];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('marketing_resources')
          .select('id, name, categories, url')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query marketing_resources from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...MARKETING_FALLBACK_RESOURCES];
        }
        return data as MarketingResource[];
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getMarketingResources():', err?.message || err);
      return [...MARKETING_FALLBACK_RESOURCES];
    }
  }

  /**
   * Fetches active product installers.
   * Falls back to local static mock installers if unconfigured, query fails, or table is empty.
   */
  async getInstallers(): Promise<InstallerItem[]> {
    if (!isSupabaseConfigured) return [...INSTALLERS];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('installers')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query installers from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...INSTALLERS];
        }

        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          version: d.version || '',
          categories: Array.isArray(d.categories) ? d.categories : [],
          url: d.url || d.download_url || '#',
          downloadUrl: d.download_url || d.url || '#',
          fileSize: d.file_size || '',
          operatingSystem: d.operating_system || '',
          releaseDate: d.release_date || '',
          compatibleProducts: Array.isArray(d.compatible_products) ? d.compatible_products : [],
          checksum: d.checksum || '',
          description: d.description || '',
        }));
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getInstallers():', err?.message || err);
      return [...INSTALLERS];
    }
  }

  /**
   * Fetches active recommended hardware entries.
   * Falls back to local static mock hardware list if unconfigured, query fails, or table is empty.
   */
  async getRecommendedHardware(): Promise<RecommendedHardwareItem[]> {
    if (!isSupabaseConfigured) return [...RECOMMENDED_HARDWARE];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('recommended_hardware')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query recommended_hardware from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...RECOMMENDED_HARDWARE];
        }

        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          modelNumber: d.model_number || '',
          categories: Array.isArray(d.categories) ? d.categories : [],
          status: d.status || 'Recommended',
          specifications: d.specifications || '',
          compatibleProducts: Array.isArray(d.compatible_products) ? d.compatible_products : [],
          notes: d.notes || '',
          estimatedPrice: d.estimated_price || '',
          url: d.url || '#',
          description: d.description || '',
        }));
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getRecommendedHardware():', err?.message || err);
      return [...RECOMMENDED_HARDWARE];
    }
  }

  /**
   * Fetches active product manuals.
   * Falls back to local static mock manuals if unconfigured, query fails, or table is empty.
   */
  async getManuals(): Promise<ManualItem[]> {
    if (!isSupabaseConfigured) return [...MANUALS];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('manuals')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query manuals from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...MANUALS];
        }

        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          version: d.version || '',
          categories: Array.isArray(d.categories) ? d.categories : [],
          format: d.format || 'PDF',
          fileSize: d.file_size || '',
          pageCount: typeof d.page_count === 'number' ? d.page_count : undefined,
          compatibleProducts: Array.isArray(d.compatible_products) ? d.compatible_products : [],
          lastUpdated: d.last_updated || '',
          url: d.url || d.file_url || '#',
          fileUrl: d.file_url || d.url || '#',
          description: d.description || '',
        }));
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getManuals():', err?.message || err);
      return [...MANUALS];
    }
  }

  /**
   * Fetches active quick start guides.
   * Falls back to local static mock guides if unconfigured, query fails, or table is empty.
   */
  async getQuickStartGuides(): Promise<QuickStartGuideItem[]> {
    if (!isSupabaseConfigured) return [...QUICK_START_GUIDES];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('quick_start_guides')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query quick_start_guides from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...QUICK_START_GUIDES];
        }

        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          categories: Array.isArray(d.categories) ? d.categories : [],
          estimatedTime: d.estimated_time || '',
          difficulty: d.difficulty || 'Beginner',
          compatibleProducts: Array.isArray(d.compatible_products) ? d.compatible_products : [],
          stepsCount: typeof d.steps_count === 'number' ? d.steps_count : undefined,
          url: d.url || d.guide_url || '#',
          guideUrl: d.guide_url || d.url || '#',
          lastUpdated: d.last_updated || '',
          description: d.description || '',
        }));
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getQuickStartGuides():', err?.message || err);
      return [...QUICK_START_GUIDES];
    }
  }

  /**
   * Fetches dynamic support licensing tiers from the database.
   */
  async getSupportTiers(): Promise<SupportTier[]> {
    if (!isSupabaseConfigured) return [...DEFAULT_SUPPORT_TIERS];

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('support_tiers')
          .select('id, code, label, export_label, is_default')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[configRepo] Warning: Failed to query support_tiers from Supabase:', error.message);
        }

        if (error || !data || data.length === 0) {
          return [...DEFAULT_SUPPORT_TIERS];
        }

        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          label: d.label,
          exportLabel: d.export_label,
          isDefault: Boolean(d.is_default),
        }));
      });
    } catch (err: any) {
      console.warn('[configRepo] Exception in getSupportTiers():', err?.message || err);
      return [...DEFAULT_SUPPORT_TIERS];
    }
  }
}

export const configRepo = new SupabaseConfigRepository();
