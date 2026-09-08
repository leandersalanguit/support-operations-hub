/**
 * @file auditLogger.ts
 * @description Strongly typed Supabase implementation of IAuditLogger for tracking edits and deletions.
 */

import { IAuditLogger } from '../../domain/interaction/repository';
import { SupportInteraction } from '../../domain/interaction/types';
import { supabase, isSupabaseConfigured } from './client';
import { isValidUUID } from '../../utils/uuid';

export class SupabaseAuditLogger implements IAuditLogger {
  async recordEdit(
    original: SupportInteraction,
    updated: SupportInteraction,
    editedBy: string
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    if (!isValidUUID(updated.id)) {
      console.warn('Skipping audit edit log for non-UUID interaction:', updated.id);
      return;
    }

    try {
      const payload = {
        interaction_id: updated.id,
        edited_by: editedBy || 'Unknown Agent',
        edited_at: new Date().toISOString(),
        original_agent: original?.agent || updated.agent || 'Unknown',
        interaction_date: updated.date || null,
        client_name: updated.clientName || '',
        client_product: updated.clientProduct || '',
        case_classification: updated.caseClassification || '',
        previous_status: original?.status || updated.status || '',
        new_status: updated.status || '',
        previous_snapshot: original || null,
        updated_snapshot: updated,
      };

      const { error } = await supabase.from('interaction_edits_audit').insert([payload]);
      if (error) {
        console.warn('Audit edit insert notice:', error.message);
      }
    } catch (err) {
      console.warn('Unexpected error logging edit audit:', err);
    }
  }

  async recordDelete(deletedItem: SupportInteraction, deletedBy: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    if (!isValidUUID(deletedItem.id)) {
      console.warn('Skipping audit delete log for non-UUID interaction:', deletedItem.id);
      return;
    }

    try {
      const payload = {
        interaction_id: deletedItem.id,
        deleted_by: deletedBy || 'Unknown Agent',
        deleted_at: new Date().toISOString(),
        original_agent: deletedItem.agent,
        interaction_date: deletedItem.date,
        client_name: deletedItem.clientName,
        client_product: deletedItem.clientProduct,
        case_classification: deletedItem.caseClassification,
        status: deletedItem.status,
        channel: deletedItem.channel,
        channel_details: deletedItem.channelDetails || '',
        additional_notes: deletedItem.additionalNotes || '',
        snapshot_data: deletedItem,
      };

      const { error } = await supabase.from('deleted_interactions_audit').insert([payload]);
      if (error) {
        console.warn('Audit delete insert notice:', error.message);
      }
    } catch (err) {
      console.warn('Unexpected error logging delete audit:', err);
    }
  }
}

export const auditLogger = new SupabaseAuditLogger();
