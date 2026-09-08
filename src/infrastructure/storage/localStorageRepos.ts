/**
 * @file localStorageRepos.ts
 * @description LocalStorage caching and offline queue management.
 * Provides instant zero-latency startup, strict runtime schema validation,
 * and robust FIFO offline conflict resolution.
 */

import { SupportInteraction } from '../../domain/interaction/types';
import { ClientProfile } from '../../domain/client/types';
import { interactionRepo } from '../supabase/interactionRepo';
import { isSupabaseConfigured } from '../supabase/client';
import { generateUUID } from '../../utils/uuid';

const STORAGE_KEYS = {
  INTERACTIONS_V2: 'support_shift_interactions_v2',
  CLIENTS_V2: 'support_shift_clients_v2',
  SYNC_QUEUE_V2: 'support_pending_sync_queue_v2',
  LAST_AGENT: 'support_last_agent_name',
  FORM_VIEW_MODE: 'support_shift_form_view_mode',
} as const;

// -----------------------------------------------------------------------------
// 1. RUNTIME SCHEMA VALIDATORS
// -----------------------------------------------------------------------------

function isValidInteraction(obj: unknown): obj is SupportInteraction {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.date === 'string' &&
    typeof r.dayOfWeek === 'string' &&
    typeof r.agent === 'string' &&
    typeof r.clientName === 'string' &&
    (r.channel === 'Call' || r.channel === 'Chat') &&
    typeof r.channelDetails === 'string' &&
    typeof r.clientProduct === 'string' &&
    typeof r.caseClassification === 'string' &&
    typeof r.status === 'string' &&
    typeof r.inEvent === 'boolean' &&
    typeof r.firstTimeUser === 'boolean' &&
    typeof r.additionalNotes === 'string'
  );
}

function isValidClientProfile(obj: unknown): obj is ClientProfile {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    Array.isArray(r.phoneNumbers) &&
    r.phoneNumbers.every((p) => typeof p === 'string') &&
    Array.isArray(r.ownedProducts) &&
    r.ownedProducts.every((p) => typeof p === 'string') &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  );
}

function isValidSyncQueueItem(obj: unknown): obj is SyncQueueItem {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const r = obj as Record<string, unknown>;
  const isValidOperation = r.operation === 'insert' || r.operation === 'update' || r.operation === 'delete';
  const hasValidPayload =
    typeof r.payload === 'object' &&
    r.payload !== null &&
    !Array.isArray(r.payload) &&
    typeof (r.payload as Record<string, unknown>).id === 'string';

  return (
    typeof r.id === 'string' &&
    isValidOperation &&
    typeof r.interactionId === 'string' &&
    hasValidPayload &&
    typeof r.timestamp === 'number' &&
    typeof r.retryCount === 'number'
  );
}

// -----------------------------------------------------------------------------
// 2. CACHED INTERACTIONS REPOSITORY
// -----------------------------------------------------------------------------

export function loadCachedInteractions(): SupportInteraction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INTERACTIONS_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidInteraction) : [];
  } catch (error) {
    console.error('Failed to load interactions from localStorage:', error);
    return [];
  }
}

export function saveCachedInteractions(interactions: SupportInteraction[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS_V2, JSON.stringify(interactions));
    return true;
  } catch (error) {
    console.error('Failed to save interactions to localStorage:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// 3. CACHED CLIENTS REPOSITORY
// -----------------------------------------------------------------------------

export function loadCachedClients(): ClientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidClientProfile) : [];
  } catch (error) {
    console.error('Failed to load clients from localStorage:', error);
    return [];
  }
}

export function saveCachedClients(clients: ClientProfile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS_V2, JSON.stringify(clients));
    return true;
  } catch (error) {
    console.error('Failed to save clients to localStorage:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// 4. USER PREFERENCES
// -----------------------------------------------------------------------------

export function loadLastAgent(): string {
  return localStorage.getItem(STORAGE_KEYS.LAST_AGENT) || '';
}

export function saveLastAgent(agent: string): void {
  if (agent && agent.trim()) {
    localStorage.setItem(STORAGE_KEYS.LAST_AGENT, agent.trim());
  }
}

export function loadFormViewMode(): 'grid' | 'vertical' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FORM_VIEW_MODE);
    if (saved === 'grid' || saved === 'vertical') {
      return saved;
    }
  } catch (error) {
    console.error('Failed to load form view mode:', error);
  }
  return 'vertical';
}

export function saveFormViewMode(mode: 'grid' | 'vertical'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FORM_VIEW_MODE, mode);
  } catch (error) {
    console.error('Failed to save form view mode:', error);
  }
}

// -----------------------------------------------------------------------------
// 5. OFFLINE SYNC RETRY QUEUE
// -----------------------------------------------------------------------------

export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  interactionId: string;
  payload: SupportInteraction | { id: string };
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export function getPendingSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidSyncQueueItem) : [];
  } catch (err) {
    console.error('Failed to load pending sync queue:', err);
    return [];
  }
}

export function savePendingSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE_V2, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save pending sync queue:', err);
  }
}

export function getPendingSyncCount(): number {
  return getPendingSyncQueue().length;
}

/**
 * Enqueues a failed sync operation with intelligent FIFO conflict merging:
 * 1. If 'delete' is added for an item that was only queued for 'insert', both cancel out!
 * 2. If 'delete' is added for an item queued for 'update', it converts to 'delete'.
 * 3. If 'update' is added for an item queued for 'insert', it updates payload while retaining 'insert'.
 */
export function addToSyncQueue(
  operation: SyncOperation,
  interactionId: string,
  payload: SupportInteraction | { id: string },
  lastError?: string
): SyncQueueItem {
  const queue = getPendingSyncQueue();
  const existingIndex = queue.findIndex((item) => item.interactionId === interactionId);

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];

    if (operation === 'delete') {
      if (existing.operation === 'insert') {
        // Created locally and deleted before reaching cloud: safely drop from queue
        queue.splice(existingIndex, 1);
        savePendingSyncQueue(queue);
        return {
          id: existing.id,
          operation: 'delete',
          interactionId,
          payload,
          timestamp: Date.now(),
          retryCount: 0,
        };
      }
      // Replace existing update with delete
      queue[existingIndex] = {
        ...existing,
        operation: 'delete',
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        lastError,
      };
      savePendingSyncQueue(queue);
      return queue[existingIndex];
    }

    if (operation === 'update') {
      queue[existingIndex] = {
        ...existing,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        lastError,
      };
      savePendingSyncQueue(queue);
      return queue[existingIndex];
    }
  }

  const newItem: SyncQueueItem = {
    id: generateUUID(),
    operation,
    interactionId,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    lastError,
  };

  queue.push(newItem);
  savePendingSyncQueue(queue);
  return newItem;
}

export function removeFromSyncQueue(idOrInteractionId: string): void {
  const queue = getPendingSyncQueue();
  const updated = queue.filter(
    (item) => item.id !== idOrInteractionId && item.interactionId !== idOrInteractionId
  );
  savePendingSyncQueue(updated);
}

export function clearPendingSyncQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE_V2);
  } catch (err) {
    console.error('Failed to clear sync queue:', err);
  }
}

let isProcessingQueue = false;

export function isSyncQueueRunning(): boolean {
  return isProcessingQueue;
}

/**
 * Drains and replays the sync queue items in strict FIFO order.
 */
export async function processPendingSyncQueue(callbacks?: {
  onProgress?: (remaining: number) => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}): Promise<{ success: boolean; processed: number; remaining: number }> {
  if (isProcessingQueue || !isSupabaseConfigured) {
    return { success: false, processed: 0, remaining: getPendingSyncCount() };
  }

  const queue = getPendingSyncQueue();
  if (queue.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  isProcessingQueue = true;
  let processedCount = 0;
  const remainingQueue: SyncQueueItem[] = [];

  try {
    for (const item of queue) {
      try {
        if (item.operation === 'insert') {
          await interactionRepo.insert(item.payload as SupportInteraction);
        } else if (item.operation === 'update') {
          await interactionRepo.update(item.payload as SupportInteraction);
        } else if (item.operation === 'delete') {
          const deleteId = typeof item.payload === 'string' ? item.payload : (item.payload as { id: string }).id;
          await interactionRepo.delete(deleteId);
        }

        processedCount++;
        if (callbacks?.onProgress) {
          callbacks.onProgress(queue.length - processedCount);
        }
      } catch (err: any) {
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: err?.message || 'Network error during queue sync',
        });
      }
    }

    savePendingSyncQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      if (callbacks?.onSuccess) callbacks.onSuccess();
      return { success: true, processed: processedCount, remaining: 0 };
    } else {
      if (callbacks?.onError) {
        callbacks.onError(new Error(`${remainingQueue.length} item(s) could not be synced.`));
      }
      return { success: false, processed: processedCount, remaining: remainingQueue.length };
    }
  } finally {
    isProcessingQueue = false;
  }
}
