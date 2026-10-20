/**
 * @file useClientDirectory.ts
 * @description Application hook managing the client directory (CRM),
 * owned equipment tracking, search/autocomplete filtering, and optimistic updates.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { ClientProfile } from '../domain/client/types';
import { formatPhoneNumber, normalizeClientPhones } from '../domain/client/phone';
import {
  loadCachedClients,
  saveCachedClients,
  createStorageScope,
} from '../infrastructure/storage/localStorageRepos';
import { clearCustomerSession, getCustomerSessionGeneration, isCustomerSessionGenerationCurrent, notifyStaffAccessInvalidated, StorageScope, subscribeCustomerSessionCleared } from '../infrastructure/storage/scopedSessionStore';
import { clientRepo } from '../infrastructure/supabase/clientRepo';
import { isAccessDeniedError, isSupabaseConfigured } from '../infrastructure/supabase/client';
import { computeClientDiff } from '../domain/client/diff';
import { getMockInitialClients } from '../data/mockDemoData';

export function useClientDirectory(
  currentUser: User | null | undefined,
  isPasswordChangeRequired: boolean,
  currentAgentName?: string,
  isDemoMode = false,
  onAccessRecheck?: () => void | Promise<unknown>
) {
  const storageScope = useMemo(() => createStorageScope(currentUser?.id, isDemoMode), [currentUser?.id, isDemoMode]);
  const currentScopeRef = useRef<StorageScope | null>(storageScope);
  currentScopeRef.current = storageScope;
  const hydratedSnapshotRef = useRef<{ scopeKey: string; serialized: string } | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const cached = loadCachedClients(storageScope || undefined);
    if (cached && cached.length > 0) return cached;
    if (isDemoMode) {
      const mock = getMockInitialClients();
      saveCachedClients(storageScope || undefined, mock);
      return mock;
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleAccessRecheck = useCallback(() => {
    hydratedSnapshotRef.current = {
      scopeKey: storageScope ? JSON.stringify([storageScope.projectId, storageScope.userId]) : '',
      serialized: JSON.stringify([]),
    };
    clearCustomerSession(storageScope || undefined);
    setClients([]);
    notifyStaffAccessInvalidated();
    try {
      void Promise.resolve(onAccessRecheck?.()).catch((error) => {
        console.warn('Notice: Failed to refresh staff access after a denied client change:', error);
      });
    } catch (error) {
      console.warn('Notice: Failed to refresh staff access after a denied client change:', error);
    }
  }, [onAccessRecheck, storageScope]);

  useEffect(() => {
    const cached = storageScope ? loadCachedClients(storageScope) : [];
    const scopeKey = storageScope ? JSON.stringify([storageScope.projectId, storageScope.userId]) : '';
    hydratedSnapshotRef.current = { scopeKey, serialized: JSON.stringify(cached) };
    setClients(cached);
    return subscribeCustomerSessionCleared(() => {
      if (storageScope) clearCustomerSession(storageScope);
      hydratedSnapshotRef.current = {
        scopeKey: storageScope ? JSON.stringify([storageScope.projectId, storageScope.userId]) : '',
        serialized: JSON.stringify([]),
      };
      setClients([]);
    });
  }, [storageScope]);

  // If transitioning to demo mode and clients list is empty, seed mock clients
  useEffect(() => {
    if (isDemoMode) {
      setClients((prev) => {
        if (prev.length === 0) {
          const mock = getMockInitialClients();
          saveCachedClients(storageScope || undefined, mock);
          return mock;
        }
        return prev;
      });
    }
  }, [isDemoMode, storageScope]);

  // Persist clients cache whenever state changes (debounced 300ms)
  useEffect(() => {
    if (!storageScope || (!isDemoMode && isPasswordChangeRequired)) return;
    const sessionGeneration = getCustomerSessionGeneration();
    const scopeKey = JSON.stringify([storageScope.projectId, storageScope.userId]);
    const serialized = JSON.stringify(clients);
    if (hydratedSnapshotRef.current?.scopeKey === scopeKey && hydratedSnapshotRef.current.serialized === serialized) return;
    const timer = setTimeout(() => {
      if (!isCustomerSessionGenerationCurrent(sessionGeneration) || currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId) return;
      if (hydratedSnapshotRef.current?.scopeKey === scopeKey && hydratedSnapshotRef.current.serialized === serialized) return;
      if (saveCachedClients(storageScope, clients)) {
        hydratedSnapshotRef.current = { scopeKey, serialized };
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clients, storageScope, isDemoMode, isPasswordChangeRequired]);

  // Load from Supabase on mount / login (skip in demo mode)
  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !currentUser || isPasswordChangeRequired || !storageScope) return;

    let isMounted = true;
    const sessionGeneration = getCustomerSessionGeneration();
    clientRepo.getAll()
      .then((data) => {
        if (!isMounted || !isCustomerSessionGenerationCurrent(sessionGeneration)) return;
        if (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId) return;
        setClients(data || []);
        saveCachedClients(storageScope, data || []);
      })
      .catch((err) => {
        console.warn('Notice: Failed to fetch clients from Supabase:', err);
        if (isMounted && isCustomerSessionGenerationCurrent(sessionGeneration) && isAccessDeniedError(err)) {
          handleAccessRecheck();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, isPasswordChangeRequired, storageScope, handleAccessRecheck]);

  // Upsert client and associated product ownership
  const recordClientInteraction = useCallback(async (params: {
    clientName: string;
    phoneNumber?: string;
    productName?: string;
    agentName: string;
  }) => {
    if (!params.clientName.trim() || (!isDemoMode && (!storageScope || isPasswordChangeRequired))) return;

    const formattedParams = {
      ...params,
      phoneNumber: params.phoneNumber ? formatPhoneNumber(params.phoneNumber) : undefined,
    };
    const sessionGeneration = getCustomerSessionGeneration();

    try {
      const updatedClient = await clientRepo.upsertClientWithProduct(formattedParams);
      if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
      if (updatedClient) {
        setClients((prev) => {
          const idx = prev.findIndex(
            (c) => c.name.toLowerCase() === updatedClient.name.toLowerCase()
          );
          if (idx >= 0) {
            const next = [...prev];
            const mergedProducts = Array.from(
              new Set([...next[idx].ownedProducts, ...updatedClient.ownedProducts])
            );
            const mergedPhones = Array.from(
              new Set([
                ...next[idx].phoneNumbers.map((p) => formatPhoneNumber(p)),
                ...updatedClient.phoneNumbers.map((p) => formatPhoneNumber(p)),
              ])
            ).filter(Boolean);
            next[idx] = {
              ...next[idx],
              ...updatedClient,
              ownedProducts: mergedProducts,
              phoneNumbers: mergedPhones,
            };
            return next;
          }
          return [...prev, updatedClient];
        });
      }
    } catch (err) {
      if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
      console.warn('Notice: Failed to sync client interaction:', err);
      if (isAccessDeniedError(err)) {
        handleAccessRecheck();
      }
    }
  }, [isDemoMode, isPasswordChangeRequired, storageScope, handleAccessRecheck]);

  // Filtered client list based on search query
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    const qDigits = q.replace(/\D/g, '');
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phoneNumbers.some(
        (p) =>
          p.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && p.replace(/\D/g, '').includes(qDigits))
      ) ||
      (c.phoneNumber &&
        (c.phoneNumber.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && c.phoneNumber.replace(/\D/g, '').includes(qDigits)))) ||
      c.ownedProducts.some((p) => p.toLowerCase().includes(q))
    );
  }, [clients, searchQuery]);

  // Batch updates/reconciles clients with remote database
  const updateClients = useCallback(
    async (newClients: any[]) => {
      if (!isDemoMode && (!storageScope || isPasswordChangeRequired)) return;
      const normalizedClients = newClients.map((c) => {
        const formattedPhones = normalizeClientPhones(c);
        return {
          ...c,
          phoneNumbers: formattedPhones,
          phoneNumber: formattedPhones[0] || (c.phoneNumber ? formatPhoneNumber(c.phoneNumber) : undefined),
        };
      });

      const previousClients = clients;
      const sessionGeneration = getCustomerSessionGeneration();
      const { deletedClients, changedClients } = computeClientDiff(
        clients as any,
        normalizedClients as any
      );

      setClients(normalizedClients);

      const errors: string[] = [];

      for (const deleted of deletedClients) {
        if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
        try {
          await clientRepo.delete(deleted.id);
          if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
        } catch (err: any) {
          if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
          if (isAccessDeniedError(err)) {
            handleAccessRecheck();
            return;
          }
          console.error(`Failed to delete client ${deleted.id}:`, err);
          errors.push(`Delete ${deleted.name || deleted.id}: ${err?.message || err}`);
        }
      }

      for (const changed of changedClients) {
        if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
        try {
          await clientRepo.update(changed as any, currentAgentName);
          if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
        } catch (err: any) {
          if (!isCustomerSessionGenerationCurrent(sessionGeneration) || (storageScope && (currentScopeRef.current?.userId !== storageScope.userId || currentScopeRef.current?.projectId !== storageScope.projectId))) return;
          if (isAccessDeniedError(err)) {
            handleAccessRecheck();
            return;
          }
          console.error(`Failed to update client ${changed.id}:`, err);
          errors.push(`Update ${changed.name || changed.id}: ${err?.message || err}`);
        }
      }

      if (errors.length > 0) {
        // Revert optimistic update to prevent split-brain state between client and database
        setClients(previousClients);
        console.error('[useClientDirectory] Reverted optimistic updates due to database errors:', errors);
      }
    },
    [clients, currentAgentName, isDemoMode, isPasswordChangeRequired, storageScope, handleAccessRecheck]
  );

  return {
    clients,
    setClients,
    updateClients,
    searchQuery,
    setSearchQuery,
    filteredClients,
    recordClientInteraction,
  };
}
