/**
 * @file interactionRepo.ts
 * @description Strongly typed Supabase implementation of IInteractionRepository.
 */

import { IInteractionRepository } from '../../domain/interaction/repository';
import { SupportInteraction } from '../../domain/interaction/types';
import { supabase, isSupabaseConfigured, withNetworkRetry } from './client';
import { mapDbToInteraction, mapInteractionToDb, DbInteraction } from './mappers';
import { isValidUUID } from '../../utils/uuid';

export class SupabaseInteractionRepository implements IInteractionRepository {
  async getAll(limit = 500): Promise<SupportInteraction[]> {
    if (!isSupabaseConfigured) return [];

    return await withNetworkRetry(async () => {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase fetch interactions error:', error);
        throw new Error(error.message);
      }

      return (data as DbInteraction[]).map(mapDbToInteraction);
    });
  }

  async insert(interaction: SupportInteraction): Promise<SupportInteraction> {
    if (!isSupabaseConfigured) return interaction;

    return await withNetworkRetry(async () => {
      const payload = mapInteractionToDb(interaction);
      const { data, error } = await supabase
        .from('interactions')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert interaction error:', error);
        throw new Error(error.message);
      }

      return mapDbToInteraction(data as DbInteraction);
    });
  }

  async update(interaction: SupportInteraction): Promise<SupportInteraction> {
    if (!isSupabaseConfigured) return interaction;

    return await withNetworkRetry(async () => {
      const payload = mapInteractionToDb(interaction);
      const { data, error } = await supabase
        .from('interactions')
        .update(payload)
        .eq('id', interaction.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update interaction error:', error);
        throw new Error(error.message);
      }

      return mapDbToInteraction(data as DbInteraction);
    });
  }

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    if (!isValidUUID(id)) {
      console.warn('Skipping remote delete for non-UUID interaction ID:', id);
      return;
    }

    await withNetworkRetry(async () => {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete interaction error:', error);
        throw new Error(error.message);
      }
    });
  }

  subscribeRealtime(callbacks: {
    onInsert?: (item: SupportInteraction) => void;
    onUpdate?: (item: SupportInteraction) => void;
    onDelete?: (id: string) => void;
  }): () => void {
    if (!isSupabaseConfigured) return () => {};

    const channelId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const channel = supabase
      .channel(`interactions-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions' },
        (payload) => {
          if (payload.eventType === 'INSERT' && callbacks.onInsert) {
            callbacks.onInsert(mapDbToInteraction(payload.new as DbInteraction));
          } else if (payload.eventType === 'UPDATE' && callbacks.onUpdate) {
            callbacks.onUpdate(mapDbToInteraction(payload.new as DbInteraction));
          } else if (payload.eventType === 'DELETE' && callbacks.onDelete) {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              callbacks.onDelete(deletedId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const interactionRepo = new SupabaseInteractionRepository();
