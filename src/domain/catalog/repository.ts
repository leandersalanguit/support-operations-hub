/**
 * @file repository.ts
 * @description Pure domain interface contract for product catalog operations
 * and administrative audit log tracking.
 */

import {
  CatalogProduct,
  CatalogAuditLog,
  RenameProductPayload,
  RenameProductResult,
  CreateProductPayload,
} from './types';

export interface ICatalogRepository {
  /**
   * Fetches all catalog products with enriched CRM client counts and interaction log counts.
   */
  getProductsWithStats(): Promise<CatalogProduct[]>;

  /**
   * Atomically renames a product, triggering recursive cascading across all related tables.
   */
  renameProduct(payload: RenameProductPayload): Promise<RenameProductResult>;

  /**
   * Adds a new product to the catalog.
   */
  addProduct(payload: CreateProductPayload): Promise<CatalogProduct>;

  /**
   * Toggles product active status (enables or archives from the active dropdowns).
   */
  toggleProductActive(id: string, isActive: boolean, agentName?: string): Promise<void>;

  /**
   * Fetches recent administrative catalog audit history logs.
   */
  getAuditLogs(limit?: number): Promise<CatalogAuditLog[]>;
}
