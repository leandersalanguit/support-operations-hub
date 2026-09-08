/**
 * @file useSyncPipeline.ts
 * @description Application hook managing the offline retry sync queue,
 * online network reconnection listeners, and periodic background auto-drain.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getPendingSyncCount,
  processPendingSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  clearPendingSyncQueue,
  SyncOperation,
} from '../infrastructure/storage/localStorageRepos';
import { SupportInteraction } from '../domain/interaction/types';
import { isSupabaseConfigured } from '../infrastructure/supabase/client';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export function useSyncPipeline(currentUser: User | null | undefined, isPasswordChangeRequired: boolean) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'syncing' : 'offline'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingSyncCount());
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const drainQueue = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setSyncStatus('syncing');

    const result = await processPendingSyncQueue({
      onProgress: (remaining) => setPendingSyncCount(remaining),
    });

    const currentRemaining = getPendingSyncCount();
    setPendingSyncCount(currentRemaining);

    if (result.success && currentRemaining === 0) {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    } else if (currentRemaining > 0) {
      setSyncStatus('error');
      setSyncErrorMessage(`${currentRemaining} log entry(ies) pending cloud sync (saved locally).`);
    } else {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    }
  }, []);

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
    errorMessage?: string
  ) => {
    addToSyncQueue(operation, interactionId, payload, errorMessage);
    const count = getPendingSyncCount();
    setPendingSyncCount(count);
    setSyncStatus('error');
    setSyncErrorMessage(`${count} log entry(ies) pending cloud sync (saved locally).`);
  }, []);

  const markSyncSuccess = useCallback((interactionId: string) => {
    removeFromSyncQueue(interactionId);
    const count = getPendingSyncCount();
    setPendingSyncCount(count);
    if (count === 0) {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
    }
  }, []);

  const clearQueue = useCallback(() => {
    clearPendingSyncQueue();
    setPendingSyncCount(0);
    setSyncStatus('connected');
    setSyncErrorMessage(null);
  }, []);

  return {
    syncStatus,
    setSyncStatus,
    pendingSyncCount,
    syncErrorMessage,
    setSyncErrorMessage,
    drainQueue,
    enqueueFailedSync,
    markSyncSuccess,
    clearQueue,
  };
}
