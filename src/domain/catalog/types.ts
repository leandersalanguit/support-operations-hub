/**
 * @file types.ts
 * @description Pure domain entity definitions for catalog products, rename operations,
 * and administrative audit trail logs.
 */

export interface CatalogProduct {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  clientCount?: number;
  interactionCount?: number;
}

export type CatalogActionType = 'create' | 'rename' | 'update' | 'toggle_active' | 'reorder' | 'delete';

export interface CatalogAuditLog {
  id: string;
  catalogType: string;
  action: CatalogActionType;
  oldValue?: string;
  newValue?: string;
  details?: Record<string, any>;
  performedBy: string;
  performedById?: string;
  createdAt: string;
}

export interface RenameProductPayload {
  oldName: string;
  newName: string;
  agentName?: string;
}

export interface RenameProductResult {
  success: boolean;
  productId?: string;
  oldName: string;
  newName: string;
  affectedClients: number;
  affectedInteractions: number;
  affectedSessions?: number;
  performedBy?: string;
}

export interface CreateProductPayload {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  agentName?: string;
}
