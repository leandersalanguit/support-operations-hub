/**
 * @file localStorageRepos.ts
 * @description LocalStorage caching and offline queue management.
 * Provides instant zero-latency startup, strict runtime schema validation,
 * and robust FIFO offline conflict resolution.
 */

import { SupportInteraction } from '../../domain/interaction/types';
import { ClientProfile } from '../../domain/client/types';
import { interactionRepo } from '../supabase/interactionRepo';
import { isSupabaseConfigured, supabaseProjectId } from '../supabase/client';
import { generateUUID } from '../../utils/uuid';
import {
  clearScopedSessionEntry,
  getCustomerSessionGeneration,
  invalidateCustomerSessionGeneration,
  isCustomerSessionGenerationCurrent,
  readScopedSession,
  StorageScope,
  writeScopedSession,
  QUEUE_RETRY_TTL_MS,
} from './scopedSessionStore';

const STORAGE_KEYS = {
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
    (r.manuallyOwnedProducts === undefined || (Array.isArray(r.manuallyOwnedProducts) && r.manuallyOwnedProducts.every((p) => typeof p === 'string'))) &&
    (r.interactionProducts === undefined || (Array.isArray(r.interactionProducts) && r.interactionProducts.every((p) => typeof p === 'string'))) &&
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
    typeof r.ownerUserId === 'string' &&
    typeof r.projectId === 'string' &&
    typeof r.queuedAt === 'number' &&
    typeof r.retryCount === 'number' &&
    typeof r.reviewRequired === 'boolean'
  );
}

// -----------------------------------------------------------------------------
// 2. CACHED INTERACTIONS REPOSITORY
// -----------------------------------------------------------------------------

export function loadCachedInteractions(scope?: StorageScope): SupportInteraction[] {
  if (!scope) return [];
  return readScopedSession(scope, 'interactions', (value): value is SupportInteraction[] =>
    Array.isArray(value) && value.every(isValidInteraction)
  ) || [];
}

export function saveCachedInteractions(scope: StorageScope | undefined, interactions: SupportInteraction[]): boolean {
  return Boolean(scope && writeScopedSession(scope, 'interactions', interactions));
}

// -----------------------------------------------------------------------------
// 3. CACHED CLIENTS REPOSITORY
// -----------------------------------------------------------------------------

export function loadCachedClients(scope?: StorageScope): ClientProfile[] {
  if (!scope) return [];
  return readScopedSession(scope, 'clients', (value): value is ClientProfile[] =>
    Array.isArray(value) && value.every(isValidClientProfile)
  ) || [];
}

export function saveCachedClients(scope: StorageScope | undefined, clients: ClientProfile[]): boolean {
  return Boolean(scope && writeScopedSession(scope, 'clients', clients));
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

export function createStorageScope(userId?: string, isDemoMode = false): StorageScope | null {
  if (!userId) return null;
  return { projectId: isDemoMode ? 'support-hub-demo' : supabaseProjectId, userId };
}

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  interactionId: string;
  payload: SupportInteraction | { id: string };
  ownerUserId: string;
  projectId: string;
  queuedAt: number;
  reviewRequired: boolean;
  retryCount: number;
  lastError?: string;
}

export function getPendingSyncQueue(scope?: StorageScope, now = Date.now()): SyncQueueItem[] {
  if (!scope) return [];
  const items = readScopedSession(scope, 'queue', (value): value is SyncQueueItem[] =>
    Array.isArray(value) && value.every(isValidSyncQueueItem), null, now
  ) || [];
  const reviewed = items.map((item) => ({
    ...item,
    reviewRequired: item.reviewRequired || item.ownerUserId !== scope.userId || item.projectId !== scope.projectId || now - item.queuedAt >= QUEUE_RETRY_TTL_MS || item.queuedAt > now,
  }));
  if (reviewed.some((item, index) => item.reviewRequired !== items[index]?.reviewRequired)) {
    savePendingSyncQueue(scope, reviewed);
  }
  return reviewed;
}

export function savePendingSyncQueue(scope: StorageScope | undefined, queue: SyncQueueItem[]): void {
  if (scope) writeScopedSession(scope, 'queue', queue);
}

export function getPendingSyncCount(scope?: StorageScope): number {
  return getPendingSyncQueue(scope).length;
}

/**
 * Enqueues a failed sync operation with intelligent FIFO conflict merging:
 * 1. If 'delete' is added for an item that was only queued for 'insert', both cancel out!
 * 2. If 'delete' is added for an item queued for 'update', it converts to 'delete'.
 * 3. If 'update' is added for an item queued for 'insert', it updates payload while retaining 'insert'.
 */
export function addToSyncQueue(
  scope: StorageScope,
  operation: SyncOperation,
  interactionId: string,
  payload: SupportInteraction | { id: string },
  lastError?: string
): SyncQueueItem {
  const queue = getPendingSyncQueue(scope);
  const existingIndex = queue.findIndex((item) => item.interactionId === interactionId && !item.reviewRequired);

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];

    if (operation === 'delete') {
      if (existing.operation === 'insert') {
        // Created locally and deleted before reaching cloud: safely drop from queue
        queue.splice(existingIndex, 1);
        savePendingSyncQueue(scope, queue);
        return {
          id: existing.id,
          operation: 'delete',
          interactionId,
          payload,
          ownerUserId: scope.userId,
          projectId: scope.projectId,
          queuedAt: Date.now(),
          reviewRequired: false,
          retryCount: 0,
        };
      }
      // Replace existing update with delete
      queue[existingIndex] = {
        ...existing,
        operation: 'delete',
        payload,
        queuedAt: Date.now(),
        retryCount: 0,
        lastError,
      };
      savePendingSyncQueue(scope, queue);
      return queue[existingIndex];
    }

    if (operation === 'update') {
      queue[existingIndex] = {
        ...existing,
        payload,
        queuedAt: Date.now(),
        retryCount: 0,
        lastError,
      };
      savePendingSyncQueue(scope, queue);
      return queue[existingIndex];
    }
  }

  const newItem: SyncQueueItem = {
    id: generateUUID(),
    operation,
    interactionId,
    payload,
    ownerUserId: scope.userId,
    projectId: scope.projectId,
    queuedAt: Date.now(),
    reviewRequired: false,
    retryCount: 0,
    lastError,
  };

  queue.push(newItem);
  savePendingSyncQueue(scope, queue);
  return newItem;
}

export function removeFromSyncQueue(scope: StorageScope | undefined, idOrInteractionId: string): void {
  if (!scope) return;
  const queue = getPendingSyncQueue(scope);
  const updated = queue.filter(
    (item) => item.id !== idOrInteractionId && item.interactionId !== idOrInteractionId
  );
  savePendingSyncQueue(scope, updated);
}

export function clearPendingSyncQueue(scope?: StorageScope): void {
  invalidateCustomerSessionGeneration();
  clearScopedSessionEntry(scope, 'queue');
}

let isProcessingQueue = false;

export function isSyncQueueRunning(): boolean {
  return isProcessingQueue;
}

/**
 * Drains and replays the sync queue items in strict FIFO order.
 */
export async function processPendingSyncQueue(scope: StorageScope, getCurrentScope: () => StorageScope | null, callbacks?: {
  onProgress?: (remaining: number) => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}): Promise<{ success: boolean; processed: number; remaining: number }> {
  const sessionGeneration = getCustomerSessionGeneration();
  const isCurrentSession = () => isCustomerSessionGenerationCurrent(sessionGeneration);
  if (isProcessingQueue || !isSupabaseConfigured) {
    return { success: false, processed: 0, remaining: getPendingSyncCount(scope) };
  }

  const queue = getPendingSyncQueue(scope);
  if (queue.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  isProcessingQueue = true;
  let processedCount = 0;
  const remainingQueue: SyncQueueItem[] = [];
  const eligibleIds = new Set(queue.filter((item) => !item.reviewRequired).map((item) => item.id));

  try {
    for (const item of queue) {
      if (!eligibleIds.has(item.id)) {
        remainingQueue.push(item);
        continue;
      }
      const activeScope = getCurrentScope();
      if (!isCurrentSession() || !activeScope || activeScope.projectId !== scope.projectId || activeScope.userId !== scope.userId) {
        return { success: false, processed: processedCount, remaining: queue.length - processedCount };
      }
      try {
        if (item.operation === 'insert') {
          await interactionRepo.insert(item.payload as SupportInteraction);
        } else if (item.operation === 'update') {
          await interactionRepo.update(item.payload as SupportInteraction);
        } else if (item.operation === 'delete') {
          const deleteId = typeof item.payload === 'string' ? item.payload : (item.payload as { id: string }).id;
          await interactionRepo.delete(deleteId);
        }

        const scopeAfterRequest = getCurrentScope();
        if (!isCurrentSession() || !scopeAfterRequest || scopeAfterRequest.projectId !== scope.projectId || scopeAfterRequest.userId !== scope.userId) {
          return { success: false, processed: processedCount + 1, remaining: queue.length - processedCount - 1 };
        }

        processedCount++;
        if (isCurrentSession() && callbacks?.onProgress) {
          callbacks.onProgress(queue.length - processedCount);
        }
      } catch (err: any) {
        const failedRequestScope = getCurrentScope();
        if (!isCurrentSession() || !failedRequestScope || failedRequestScope.projectId !== scope.projectId || failedRequestScope.userId !== scope.userId) {
          return { success: false, processed: processedCount, remaining: getPendingSyncCount(scope) };
        }
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: err?.message || 'Network error during queue sync',
        });
      }
    }

    const scopeAfterDrain = getCurrentScope();
    if (!isCurrentSession() || !scopeAfterDrain || scopeAfterDrain.projectId !== scope.projectId || scopeAfterDrain.userId !== scope.userId) {
      return { success: false, processed: processedCount, remaining: getPendingSyncCount(scope) };
    }
    const currentQueue = getPendingSyncQueue(scope);
    const changedOrNewItems = currentQueue.filter((current) => {
      const original = queue.find((item) => item.id === current.id);
      return !original || JSON.stringify(current) !== JSON.stringify(original);
    });
    const mergedById = new Map<string, SyncQueueItem>();
    for (const item of [...remainingQueue, ...changedOrNewItems]) mergedById.set(item.id, item);
    const mergedQueue = [...mergedById.values()];
    savePendingSyncQueue(scope, mergedQueue);

    if (mergedQueue.length === 0) {
      if (callbacks?.onSuccess) callbacks.onSuccess();
      return { success: true, processed: processedCount, remaining: 0 };
    } else {
      if (callbacks?.onError) {
        callbacks.onError(new Error(`${mergedQueue.length} item(s) could not be synced.`));
      }
      return { success: false, processed: processedCount, remaining: mergedQueue.length };
    }
  } finally {
    isProcessingQueue = false;
  }
}
