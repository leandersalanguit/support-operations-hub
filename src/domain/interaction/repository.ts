/**
 * @file repository.ts
 * @description Domain contracts for interaction persistence and audit logging.
 */

import { SupportInteraction } from './types';

export interface IInteractionRepository {
  getAll(limit?: number): Promise<SupportInteraction[]>;
  insert(interaction: SupportInteraction): Promise<SupportInteraction>;
  update(interaction: SupportInteraction): Promise<SupportInteraction>;
  delete(id: string): Promise<void>;
  subscribeRealtime?(callbacks: {
    onInsert?: (item: SupportInteraction) => void;
    onUpdate?: (item: SupportInteraction) => void;
    onDelete?: (id: string) => void;
  }): () => void;
}

export interface IAuditLogger {
  recordEdit(
    original: SupportInteraction,
    updated: SupportInteraction,
    editedBy: string
  ): Promise<void>;

  recordDelete(
    deletedItem: SupportInteraction,
    deletedBy: string
  ): Promise<void>;
}
