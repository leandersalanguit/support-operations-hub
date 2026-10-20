/**
 * @file useSyncPipeline.ts
 * @description Application hook managing the offline retry sync queue,
 * online network reconnection listeners, and periodic background auto-drain.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getPendingSyncCount,
  processPendingSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  clearPendingSyncQueue,
  getPendingSyncQueue,
  SyncOperation,
} from '../infrastructure/storage/localStorageRepos';
import { SupportInteraction } from '../domain/interaction/types';
import { isSupabaseConfigured } from '../infrastructure/supabase/client';
import { getCustomerSessionGeneration, isCustomerSessionGenerationCurrent, StorageScope, subscribeCustomerSessionCleared } from '../infrastructure/storage/scopedSessionStore';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export function useSyncPipeline(currentUser: User | null | undefined, isPasswordChangeRequired: boolean, storageScope: StorageScope | null) {
  const currentScopeRef = useRef<StorageScope | null>(storageScope);
  currentScopeRef.current = storageScope;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'syncing' : 'offline'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingSyncCount(storageScope || undefined));
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const drainQueue = useCallback(async () => {
    if (!isSupabaseConfigured || !storageScope || !currentUser || isPasswordChangeRequired) return false;
    const sessionGeneration = getCustomerSessionGeneration();
    setSyncStatus('syncing');

    const isCurrent = () => isCustomerSessionGenerationCurrent(sessionGeneration) && currentScopeRef.current?.userId === storageScope.userId && currentScopeRef.current?.projectId === storageScope.projectId;
    const result = await processPendingSyncQueue(storageScope, () => currentScopeRef.current, {
      onProgress: (remaining) => { if (isCurrent()) setPendingSyncCount(remaining); },
    });

    if (!isCurrent()) return false;

    const currentRemaining = getPendingSyncCount(storageScope);
    setPendingSyncCount(currentRemaining);

    if (result.success && currentRemaining === 0) {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    } else if (currentRemaining > 0) {
      setSyncStatus('error');
      setSyncErrorMessage(`${currentRemaining} interaction change(s) remain in this tab. Unsent work may be lost if this session ends.`);
    } else {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    }
    return result.success && currentRemaining === 0;
  }, [storageScope, currentUser, isPasswordChangeRequired]);

  // Listen to browser online reconnection events to auto-flush pending sync queue
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network reconnected. Triggering sync queue processing...');
      drainQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [drainQueue]);

  // Periodic 25-second auto-drain timer when pending items exist
  useEffect(() => {
    if (pendingSyncCount === 0 || !currentUser || isPasswordChangeRequired) return;

    const interval = setInterval(() => {
      drainQueue();
    }, 25000);

    return () => clearInterval(interval);
  }, [pendingSyncCount, currentUser, isPasswordChangeRequired, drainQueue]);

  // Enqueue a failed operation to local retry queue
  const enqueueFailedSync = useCallback((
    operation: SyncOperation,
    interactionId: string,
    payload: SupportInteraction | { id: string },
    errorMessage?: string,
    expectedGeneration = getCustomerSessionGeneration()
  ) => {
    if (!storageScope || !currentUser || isPasswordChangeRequired || !isCustomerSessionGenerationCurrent(expectedGeneration) || currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId) return;
    addToSyncQueue(storageScope, operation, interactionId, payload, errorMessage);
    const count = getPendingSyncCount(storageScope);
    setPendingSyncCount(count);
    setSyncStatus('error');
    setSyncErrorMessage(`${count} interaction change(s) remain in this tab. Unsent work may be lost if this session ends.`);
  }, [storageScope, currentUser, isPasswordChangeRequired]);

  const markSyncSuccess = useCallback((interactionId: string, expectedGeneration = getCustomerSessionGeneration()) => {
    if (!storageScope || !isCustomerSessionGenerationCurrent(expectedGeneration) || currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId) return;
    removeFromSyncQueue(storageScope || undefined, interactionId);
    const count = getPendingSyncCount(storageScope || undefined);
    setPendingSyncCount(count);
    if (count === 0) {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    }
  }, [storageScope]);

  const clearQueue = useCallback(() => {
    clearPendingSyncQueue(storageScope || undefined);
    setPendingSyncCount(0);
    setSyncStatus('connected');
    setSyncErrorMessage(null);
  }, [storageScope]);

  useEffect(() => {
    setPendingSyncCount(getPendingSyncCount(storageScope || undefined));
  }, [storageScope]);

  useEffect(() => subscribeCustomerSessionCleared(() => {
    setPendingSyncCount(0);
    setSyncStatus(isSupabaseConfigured ? 'connected' : 'offline');
    setSyncErrorMessage(null);
  }), []);

  const reviewItems = storageScope
    ? getPendingSyncQueue(storageScope).filter((item) => item.reviewRequired)
    : [];
  const reviewCount = reviewItems.length;

  return {
    syncStatus,
    setSyncStatus,
    pendingSyncCount,
    reviewCount,
    reviewItems,
    syncErrorMessage,
    setSyncErrorMessage,
    drainQueue,
    enqueueFailedSync,
    markSyncSuccess,
    clearQueue,
  };
}
