/**
 * @file useAdminDashboard.ts
 * @description Application hook managing administrative catalog operations,
 * product renaming with recursive cascades, usage analytics, and audit logs.
 */

import { useState, useEffect, useCallback } from 'react';
import { catalogRepo } from '../infrastructure/supabase/catalogRepo';
import {
  CatalogProduct,
  CatalogAuditLog,
  RenameProductResult,
} from '../domain/catalog/types';

export interface UseAdminDashboardOptions {
  currentAgentName?: string;
  onTaxonomiesChanged?: () => Promise<void> | void;
}

export interface UseAdminDashboardReturn {
  products: CatalogProduct[];
  isLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  refreshProducts: () => Promise<void>;
  renameProduct: (oldName: string, newName: string) => Promise<RenameProductResult>;
  addProduct: (name: string) => Promise<CatalogProduct>;
  toggleProductActive: (id: string, isActive: boolean) => Promise<void>;
  auditLogs: CatalogAuditLog[];
  isAuditLoading: boolean;
  auditError: string | null;
  fetchAuditLogs: () => Promise<void>;
}

export function useAdminDashboard(options: UseAdminDashboardOptions = {}): UseAdminDashboardReturn {
  const { currentAgentName, onTaxonomiesChanged } = options;

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<CatalogAuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  /**
   * Fetches products enriched with live CRM and interaction statistics.
   */
  const refreshProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await catalogRepo.getProductsWithStats();
      setProducts(data);
    } catch (err: any) {
      console.error('[useAdminDashboard] Failed to load catalog products:', err);
      setError(err?.message || 'Failed to load catalog products.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches administrative catalog audit history logs.
   */
  const fetchAuditLogs = useCallback(async () => {
    setIsAuditLoading(true);
    setAuditError(null);
    try {
      const logs = await catalogRepo.getAuditLogs(100);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('[useAdminDashboard] Failed to load audit logs:', err);
      setAuditError(err?.message || 'Failed to load catalog audit logs.');
    } finally {
      setIsAuditLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  /**
   * Renames a product and triggers atomic cascade across client CRM & interaction logs.
   */
  const renameProduct = useCallback(
    async (oldName: string, newName: string): Promise<RenameProductResult> => {
      setError(null);
      try {
        const result = await catalogRepo.renameProduct({
          oldName,
          newName,
          agentName: currentAgentName,
        });

        // Refresh internal products list
        await refreshProducts();

        // Notify application to refresh dynamic taxonomies cache across other views
        if (onTaxonomiesChanged) {
          try {
            await onTaxonomiesChanged();
          } catch (taxErr) {
            console.warn('[useAdminDashboard] Warning refreshing taxonomies:', taxErr);
          }
        }

        return result;
      } catch (err: any) {
        console.error('[useAdminDashboard] Failed to rename product:', err);
        const errMsg = err?.message || 'Failed to rename product.';
        setError(errMsg);
        throw new Error(errMsg);
      }
    },
    [currentAgentName, refreshProducts, onTaxonomiesChanged]
  );

  /**
   * Adds a new product to the catalog.
   */
  const addProduct = useCallback(
    async (name: string): Promise<CatalogProduct> => {
      setError(null);
      try {
        const created = await catalogRepo.addProduct({
          name,
          agentName: currentAgentName,
        });

        await refreshProducts();

        if (onTaxonomiesChanged) {
          try {
            await onTaxonomiesChanged();
          } catch (taxErr) {
            console.warn('[useAdminDashboard] Warning refreshing taxonomies:', taxErr);
          }
        }

        return created;
      } catch (err: any) {
        console.error('[useAdminDashboard] Failed to add product:', err);
        const errMsg = err?.message || 'Failed to create product.';
        setError(errMsg);
        throw new Error(errMsg);
      }
    },
    [currentAgentName, refreshProducts, onTaxonomiesChanged]
  );

  /**
   * Toggles active state of a catalog product.
   */
  const toggleProductActive = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      setError(null);
      try {
        await catalogRepo.toggleProductActive(id, isActive, currentAgentName);

        // Optimistically update local state for instant UI response
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive } : p))
        );

        // Background sync
        await refreshProducts();

        if (onTaxonomiesChanged) {
          try {
            await onTaxonomiesChanged();
          } catch (taxErr) {
            console.warn('[useAdminDashboard] Warning refreshing taxonomies:', taxErr);
          }
        }
      } catch (err: any) {
        console.error('[useAdminDashboard] Failed to toggle product active status:', err);
        const errMsg = err?.message || 'Failed to update product status.';
        setError(errMsg);
        throw new Error(errMsg);
      }
    },
    [currentAgentName, refreshProducts, onTaxonomiesChanged]
  );

  return {
    products,
    isLoading,
    error,
    setError,
    refreshProducts,
    renameProduct,
    addProduct,
    toggleProductActive,
    auditLogs,
    isAuditLoading,
    auditError,
    fetchAuditLogs,
  };
}
