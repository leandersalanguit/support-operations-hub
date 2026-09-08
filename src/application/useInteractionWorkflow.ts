/**
 * @file useInteractionWorkflow.ts
 * @description Application workflow hook managing support interactions:
 * optimistic local state, background Supabase persistence, Sheets dispatch,
 * offline retry queuing, Postgres Realtime subscriptions, and audit snapshots.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { SupportInteraction, InteractionFormData } from '../domain/interaction/types';
import { resolveInteractionTimestamp } from '../domain/interaction/timestamp';
import {
  loadCachedInteractions,
  saveCachedInteractions,
} from '../infrastructure/storage/localStorageRepos';
import { interactionRepo } from '../infrastructure/supabase/interactionRepo';
import { auditLogger } from '../infrastructure/supabase/auditLogger';
import { syncToGoogleSheets } from '../infrastructure/sheets/googleSheetsSyncAdapter';
import { isSupabaseConfigured } from '../infrastructure/supabase/client';
import { useSyncPipeline } from './useSyncPipeline';
import { generateUUID } from '../utils/uuid';
import { getMockInitialInteractions } from '../data/mockDemoData';

export interface UseInteractionWorkflowProps {
  currentUser: User | null | undefined;
  currentAgentName: string;
  isPasswordChangeRequired: boolean;
  isDemoMode?: boolean;
  onClientLogged?: (params: { clientName: string; phoneNumber?: string; productName?: string; agentName: string }) => void;
}

export function useInteractionWorkflow({
  currentUser,
  currentAgentName,
  isPasswordChangeRequired,
  isDemoMode = false,
  onClientLogged,
}: UseInteractionWorkflowProps) {
  // Master interaction state initialized from local cache for 0ms startup
  const [interactions, setInteractions] = useState<SupportInteraction[]>(() => {
    const cached = loadCachedInteractions();
    if (cached && cached.length > 0) return cached;
    if (isDemoMode) {
      const mock = getMockInitialInteractions();
      saveCachedInteractions(mock);
      return mock;
    }
    return [];
  });
  const [editingInteraction, setEditingInteraction] = useState<SupportInteraction | null>(null);
  const [deletingInteraction, setDeletingInteraction] = useState<SupportInteraction | null>(null);

  const sync = useSyncPipeline(currentUser, isPasswordChangeRequired);

  // If transitioning to demo mode and interactions list is empty, seed mock data
  useEffect(() => {
    if (isDemoMode) {
      setInteractions((prev) => {
        if (prev.length === 0) {
          const mock = getMockInitialInteractions();
          saveCachedInteractions(mock);
          return mock;
        }
        return prev;
      });
    }
  }, [isDemoMode]);

  // Sync to local storage whenever interactions change (debounced 300ms)
  useEffect(() => {
    if (!currentUser || isPasswordChangeRequired) return;
    const timer = setTimeout(() => saveCachedInteractions(interactions), 300);
    return () => clearTimeout(timer);
  }, [interactions, currentUser, isPasswordChangeRequired]);

  // Initial load from Supabase & Postgres Realtime subscription
  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !currentUser || isPasswordChangeRequired) {
      if (isDemoMode || !isSupabaseConfigured) sync.setSyncStatus('offline');
      return;
    }

    let isMounted = true;

    async function loadData() {
      sync.setSyncStatus('syncing');
      try {
        const remoteData = await interactionRepo.getAll();
        if (!isMounted) return;

        if (remoteData) {
          setInteractions(remoteData);
          saveCachedInteractions(remoteData);
          sync.setSyncStatus('connected');
          if (sync.pendingSyncCount > 0) {
            sync.drainQueue();
          }
        }
      } catch (err) {
        console.error('Failed to load interactions from Supabase:', err);
        if (isMounted) sync.setSyncStatus('error');
      }
    }

    loadData();

    // Subscribe to Postgres Realtime changes
    const unsubscribe = interactionRepo.subscribeRealtime({
      onInsert: (newInteraction: SupportInteraction) => {
        setInteractions((prev) => {
          if (prev.some((item) => item.id === newInteraction.id)) return prev;
          return [newInteraction, ...prev];
        });
      },
      onUpdate: (updatedInteraction: SupportInteraction) => {
        setInteractions((prev) =>
          prev.map((item) => (item.id === updatedInteraction.id ? updatedInteraction : item))
        );
      },
      onDelete: (deletedId: string) => {
        setInteractions((prev) => prev.filter((item) => item.id !== deletedId));
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser, isPasswordChangeRequired]);

  // Add Interaction
  const addInteraction = useCallback(async (formData: InteractionFormData) => {
    const { time: resolvedTime, createdAt: resolvedCreatedAt } = resolveInteractionTimestamp(formData.date);

    const newInteraction: SupportInteraction = {
      ...formData,
      id: generateUUID(),
      agentId: currentUser?.id,
      createdAt: resolvedCreatedAt,
      time: formData.time || resolvedTime,
    };

    // 1. Optimistic prepend
    setInteractions((prev) => [newInteraction, ...prev]);

    // 2. Google Sheets sync (non-blocking)
    if (!isDemoMode) {
      syncToGoogleSheets('insert', newInteraction);
    }

    // 3. Cloud persistence
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');
      try {
        await interactionRepo.insert(newInteraction);
        sync.markSyncSuccess(newInteraction.id);
      } catch (err: any) {
        console.error('Failed to save to Supabase:', err);
        sync.enqueueFailedSync('insert', newInteraction.id, newInteraction, err.message);
      }
    }

    // 4. CRM Client Logging
    if (onClientLogged) {
      let clientPhone: string | undefined = undefined;
      if (formData.channel === 'Call' && formData.channelDetails) {
        clientPhone = formData.channelDetails.trim();
      } else if (formData.channelDetails && /^\+?[\d\s\-()]{7,}$/.test(formData.channelDetails.trim())) {
        clientPhone = formData.channelDetails.trim();
      }

      onClientLogged({
        clientName: formData.clientName,
        phoneNumber: clientPhone,
        productName: formData.clientProduct,
        agentName: currentAgentName,
      });
    }
  }, [currentAgentName, currentUser, isDemoMode, onClientLogged, sync]);

  // Edit Interaction
  const saveEdit = useCallback(async (updated: SupportInteraction) => {
    const previous = editingInteraction || interactions.find((i) => i.id === updated.id);

    // 1. Optimistic update
    setInteractions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

    // 2. Google Sheets sync (non-blocking)
    if (!isDemoMode) {
      syncToGoogleSheets('update', updated);
    }

    // 3. Cloud persistence and audit logging
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');

      if (previous) {
        auditLogger.recordEdit(previous, updated, currentAgentName).catch(console.warn);
      }

      try {
        await interactionRepo.update(updated);
        sync.markSyncSuccess(updated.id);
      } catch (err: any) {
        console.error('Failed to update Supabase:', err);
        sync.enqueueFailedSync('update', updated.id, updated, err.message);
      }
    }

    // 4. CRM Client Logging for edited data
    if (onClientLogged) {
      let editPhone: string | undefined = undefined;
      if (updated.channel === 'Call' && updated.channelDetails) {
        editPhone = updated.channelDetails.trim();
      } else if (updated.channelDetails && /^\+?[\d\s\-()]{7,}$/.test(updated.channelDetails.trim())) {
        editPhone = updated.channelDetails.trim();
      }

      onClientLogged({
        clientName: updated.clientName,
        phoneNumber: editPhone,
        productName: updated.clientProduct,
        agentName: currentAgentName,
      });
    }

    setEditingInteraction(null);
  }, [currentAgentName, editingInteraction, interactions, isDemoMode, onClientLogged, sync]);

  // Delete Interaction
  const confirmDelete = useCallback(async () => {
    if (!deletingInteraction) return;
    const target = deletingInteraction;

    // 1. Optimistic delete
    setInteractions((prev) => prev.filter((item) => item.id !== target.id));

    // 2. Google Sheets sync (non-blocking)
    if (!isDemoMode) {
      syncToGoogleSheets('delete', target);
    }

    // 3. Cloud persistence and audit logging
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');

      auditLogger.recordDelete(target, currentAgentName).catch(console.warn);

      try {
        await interactionRepo.delete(target.id);
        sync.markSyncSuccess(target.id);
      } catch (err: any) {
        console.error('Failed to delete from Supabase:', err);
        sync.enqueueFailedSync('delete', target.id, { id: target.id }, err.message);
      }
    }

    setDeletingInteraction(null);
  }, [currentAgentName, deletingInteraction, isDemoMode, sync]);

  const resetSampleData = useCallback(async () => {
    if (isDemoMode) {
      const mock = getMockInitialInteractions();
      setInteractions(mock);
      saveCachedInteractions(mock);
      return;
    }

    if (isSupabaseConfigured) {
      sync.setSyncStatus('syncing');
      try {
        const remoteData = await interactionRepo.getAll();
        if (remoteData) {
          setInteractions(remoteData);
          saveCachedInteractions(remoteData);
          sync.setSyncStatus('connected');
          return;
        }
      } catch (err) {
        console.warn('Notice: Failed to fetch interactions on reset:', err);
      }
    }
    setInteractions([]);
    saveCachedInteractions([]);
  }, [isDemoMode, sync]);

  const clearAllInteractions = useCallback(() => {
    setInteractions([]);
    saveCachedInteractions([]);
  }, []);

  return {
    interactions,
    setInteractions,
    editingInteraction,
    setEditingInteraction,
    deletingInteraction,
    setDeletingInteraction,
    addInteraction,
    saveEdit,
    confirmDelete,
    resetSampleData,
    clearAllInteractions,
    sync,
  };
}
