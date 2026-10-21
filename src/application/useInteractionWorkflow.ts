/**
 * @file useInteractionWorkflow.ts
 * @description Application workflow hook managing support interactions:
 * optimistic local state, scoped session persistence, offline retry queuing,
 * and Postgres Realtime subscriptions.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { SupportInteraction, InteractionFormData } from '../domain/interaction/types';
import { resolveInteractionTimestamp } from '../domain/interaction/timestamp';
import {
  loadCachedInteractions,
  saveCachedInteractions,
  createStorageScope,
} from '../infrastructure/storage/localStorageRepos';
import { clearCustomerSession, getCustomerSessionGeneration, isCustomerSessionGenerationCurrent, notifyStaffAccessInvalidated, subscribeCustomerSessionCleared, StorageScope } from '../infrastructure/storage/scopedSessionStore';
import { interactionRepo } from '../infrastructure/supabase/interactionRepo';
import { isAccessDeniedError, isSupabaseConfigured } from '../infrastructure/supabase/client';
import { useSyncPipeline } from './useSyncPipeline';
import { generateUUID } from '../utils/uuid';
import { getMockInitialInteractions } from '../data/mockDemoData';

export interface UseInteractionWorkflowProps {
  currentUser: User | null | undefined;
  currentAgentName: string;
  isPasswordChangeRequired: boolean;
  isDemoMode?: boolean;
  onAccessRecheck?: () => void | Promise<unknown>;
  onClientLogged?: (params: { clientName: string; phoneNumber?: string; productName?: string; agentName: string }) => void;
}

function isCurrentSession(generation: number, current: StorageScope | null | undefined, expected: StorageScope | null | undefined): boolean {
  return isCustomerSessionGenerationCurrent(generation) && current?.userId === expected?.userId && current?.projectId === expected?.projectId;
}

export function useInteractionWorkflow({
  currentUser,
  currentAgentName,
  isPasswordChangeRequired,
  isDemoMode = false,
  onAccessRecheck,
  onClientLogged,
}: UseInteractionWorkflowProps) {
  const storageScope = useMemo(() => createStorageScope(currentUser?.id, isDemoMode), [currentUser?.id, isDemoMode]);
  const currentScopeRef = useRef<StorageScope | null>(storageScope);
  currentScopeRef.current = storageScope;
  const hydratedSnapshotRef = useRef<{ scopeKey: string; serialized: string } | null>(null);
  // Master interaction state initialized from local cache for 0ms startup
  const [interactions, setInteractions] = useState<SupportInteraction[]>(() => {
    const cached = loadCachedInteractions(storageScope || undefined);
    if (cached && cached.length > 0) return cached;
    if (isDemoMode) {
      const mock = getMockInitialInteractions();
      saveCachedInteractions(storageScope || undefined, mock);
      return mock;
    }
    return [];
  });
  const [editingInteraction, setEditingInteraction] = useState<SupportInteraction | null>(null);
  const [deletingInteraction, setDeletingInteraction] = useState<SupportInteraction | null>(null);

  const sync = useSyncPipeline(currentUser, isPasswordChangeRequired, storageScope);

  const handleAccessRecheck = useCallback((scope?: StorageScope | null) => {
    hydratedSnapshotRef.current = {
      scopeKey: scope ? JSON.stringify([scope.projectId, scope.userId]) : '',
      serialized: JSON.stringify([]),
    };
    clearCustomerSession(scope || undefined);
    setInteractions([]);
    sync.clearQueue();
    notifyStaffAccessInvalidated();
    try {
      void Promise.resolve(onAccessRecheck?.()).catch((error) => {
        console.warn('Notice: Failed to refresh staff access after a denied interaction change:', error);
      });
    } catch (error) {
      console.warn('Notice: Failed to refresh staff access after a denied interaction change:', error);
    }
  }, [onAccessRecheck, sync.clearQueue]);

  useEffect(() => {
    const cached = storageScope ? loadCachedInteractions(storageScope) : [];
    const scopeKey = storageScope ? JSON.stringify([storageScope.projectId, storageScope.userId]) : '';
    hydratedSnapshotRef.current = { scopeKey, serialized: JSON.stringify(cached) };
    setInteractions(cached);
    setEditingInteraction(null);
    setDeletingInteraction(null);
    return subscribeCustomerSessionCleared(() => {
      if (storageScope) clearCustomerSession(storageScope);
      hydratedSnapshotRef.current = {
        scopeKey: storageScope ? JSON.stringify([storageScope.projectId, storageScope.userId]) : '',
        serialized: JSON.stringify([]),
      };
      setInteractions([]);
      setEditingInteraction(null);
      setDeletingInteraction(null);
    });
  }, [storageScope]);

  // If transitioning to demo mode and interactions list is empty, seed mock data
  useEffect(() => {
    if (isDemoMode) {
      setInteractions((prev) => {
        if (prev.length === 0) {
          const mock = getMockInitialInteractions();
          saveCachedInteractions(storageScope || undefined, mock);
          return mock;
        }
        return prev;
      });
    }
  }, [isDemoMode, storageScope]);

  // Sync to local storage whenever interactions change (debounced 300ms)
  useEffect(() => {
    if (!storageScope || (!isDemoMode && isPasswordChangeRequired)) return;
    const sessionGeneration = getCustomerSessionGeneration();
    const scopeKey = JSON.stringify([storageScope.projectId, storageScope.userId]);
    const serialized = JSON.stringify(interactions);
    if (hydratedSnapshotRef.current?.scopeKey === scopeKey && hydratedSnapshotRef.current.serialized === serialized) return;
    const timer = setTimeout(() => {
      if (!isCustomerSessionGenerationCurrent(sessionGeneration) || !isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
      if (hydratedSnapshotRef.current?.scopeKey === scopeKey && hydratedSnapshotRef.current.serialized === serialized) return;
      if (saveCachedInteractions(storageScope, interactions)) {
        hydratedSnapshotRef.current = { scopeKey, serialized };
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [interactions, storageScope, isDemoMode, isPasswordChangeRequired]);

  // Initial load from Supabase & Postgres Realtime subscription
  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !currentUser || isPasswordChangeRequired || !storageScope) {
      if (isDemoMode || !isSupabaseConfigured) sync.setSyncStatus('offline');
      return;
    }
    const scope = storageScope;
    const sessionGeneration = getCustomerSessionGeneration();

    let isMounted = true;

    async function loadData() {
      sync.setSyncStatus('syncing');
      try {
        const remoteData = await interactionRepo.getAll();
        if (!isMounted || !isCurrentSession(sessionGeneration, currentScopeRef.current, scope)) return;

        if (remoteData) {
          setInteractions(remoteData);
          saveCachedInteractions(scope, remoteData);
          sync.setSyncStatus('connected');
          if (sync.pendingSyncCount > 0) sync.drainQueue();
        }
      } catch (err) {
        console.error('Failed to load interactions from Supabase:', err);
        if (isMounted && isCurrentSession(sessionGeneration, currentScopeRef.current, scope)) {
          sync.setSyncStatus('error');
          if (isAccessDeniedError(err)) handleAccessRecheck(scope);
        }
      }
    }

    loadData();

    // Subscribe to Postgres Realtime changes
    const unsubscribe = interactionRepo.subscribeRealtime({
      onInsert: (newInteraction: SupportInteraction) => {
        if (!isMounted || !isCurrentSession(sessionGeneration, currentScopeRef.current, scope)) return;
        setInteractions((prev) => {
          if (prev.some((item) => item.id === newInteraction.id)) return prev;
          return [newInteraction, ...prev];
        });
      },
      onUpdate: (updatedInteraction: SupportInteraction) => {
        if (!isMounted || !isCurrentSession(sessionGeneration, currentScopeRef.current, scope)) return;
        setInteractions((prev) =>
          prev.map((item) => (item.id === updatedInteraction.id ? updatedInteraction : item))
        );
      },
      onDelete: (deletedId: string) => {
        if (!isMounted || !isCurrentSession(sessionGeneration, currentScopeRef.current, scope)) return;
        setInteractions((prev) => prev.filter((item) => item.id !== deletedId));
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser, isPasswordChangeRequired, storageScope, handleAccessRecheck]);

  // Add Interaction
  const addInteraction = useCallback(async (formData: InteractionFormData) => {
    const sessionGeneration = getCustomerSessionGeneration();
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

    // 3. Cloud persistence
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');
      try {
        await interactionRepo.insert(newInteraction);
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        sync.markSyncSuccess(newInteraction.id, sessionGeneration);
      } catch (err: any) {
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        if (isAccessDeniedError(err)) {
          handleAccessRecheck(storageScope);
          return;
        }
        console.error('Failed to save to Supabase:', err);
        sync.enqueueFailedSync('insert', newInteraction.id, newInteraction, err.message, sessionGeneration);
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
  }, [currentAgentName, currentUser, isDemoMode, onClientLogged, sync, storageScope, handleAccessRecheck]);

  // Edit Interaction
  const saveEdit = useCallback(async (updated: SupportInteraction) => {
    const sessionGeneration = getCustomerSessionGeneration();
    // 1. Optimistic update
    setInteractions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

    // 3. Cloud persistence. Release requires the database audit trigger.
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');

      try {
        await interactionRepo.update(updated);
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        sync.markSyncSuccess(updated.id, sessionGeneration);
      } catch (err: any) {
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        if (isAccessDeniedError(err)) {
          handleAccessRecheck(storageScope);
          return;
        }
        console.error('Failed to update Supabase:', err);
        sync.enqueueFailedSync('update', updated.id, updated, err.message, sessionGeneration);
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
  }, [currentAgentName, editingInteraction, interactions, isDemoMode, onClientLogged, sync, storageScope, handleAccessRecheck]);

  // Delete Interaction
  const confirmDelete = useCallback(async () => {
    if (!deletingInteraction) return;
    const sessionGeneration = getCustomerSessionGeneration();
    const target = deletingInteraction;

    // 1. Optimistic delete
    setInteractions((prev) => prev.filter((item) => item.id !== target.id));

    // 3. Cloud persistence. Release requires the database audit trigger.
    if (!isDemoMode && isSupabaseConfigured) {
      sync.setSyncStatus('syncing');

      try {
        await interactionRepo.delete(target.id);
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        sync.markSyncSuccess(target.id, sessionGeneration);
      } catch (err: any) {
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        if (isAccessDeniedError(err)) {
          handleAccessRecheck(storageScope);
          return;
        }
        console.error('Failed to delete from Supabase:', err);
        sync.enqueueFailedSync('delete', target.id, { id: target.id }, err.message, sessionGeneration);
      }
    }

    setDeletingInteraction(null);
  }, [currentAgentName, deletingInteraction, isDemoMode, sync, storageScope, handleAccessRecheck]);

  const resetSampleData = useCallback(async () => {
    const sessionGeneration = getCustomerSessionGeneration();
    if (isDemoMode) {
      const mock = getMockInitialInteractions();
      setInteractions(mock);
      saveCachedInteractions(storageScope || undefined, mock);
      return;
    }

    if (isSupabaseConfigured) {
      sync.setSyncStatus('syncing');
      try {
        const remoteData = await interactionRepo.getAll();
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        if (remoteData) {
          setInteractions(remoteData);
          saveCachedInteractions(storageScope || undefined, remoteData);
          sync.setSyncStatus('connected');
          return;
        }
      } catch (err) {
        if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
        console.warn('Notice: Failed to fetch interactions on reset:', err);
        if (isAccessDeniedError(err)) {
          handleAccessRecheck(storageScope);
          return;
        }
      }
    }
    if (!isCurrentSession(sessionGeneration, currentScopeRef.current, storageScope)) return;
    setInteractions([]);
    saveCachedInteractions(storageScope || undefined, []);
  }, [isDemoMode, sync, storageScope, handleAccessRecheck]);

  const clearAllInteractions = useCallback(() => {
    setInteractions([]);
    saveCachedInteractions(storageScope || undefined, []);
  }, [storageScope]);

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
