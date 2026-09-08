/**
 * @file useClientDirectory.ts
 * @description Application hook managing the client directory (CRM),
 * owned equipment tracking, search/autocomplete filtering, and optimistic updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { ClientProfile } from '../domain/client/types';
import { formatPhoneNumber, normalizeClientPhones } from '../domain/client/phone';
import {
  loadCachedClients,
  saveCachedClients,
} from '../infrastructure/storage/localStorageRepos';
import { clientRepo } from '../infrastructure/supabase/clientRepo';
import { isSupabaseConfigured } from '../infrastructure/supabase/client';
import { computeClientDiff } from '../utils/clientDiff';
import { getMockInitialClients } from '../data/mockDemoData';

export function useClientDirectory(
  currentUser: User | null | undefined,
  isPasswordChangeRequired: boolean,
  currentAgentName?: string,
  isDemoMode = false
) {
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const cached = loadCachedClients();
    if (cached && cached.length > 0) return cached;
    if (isDemoMode) {
      const mock = getMockInitialClients();
      saveCachedClients(mock);
      return mock;
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // If transitioning to demo mode and clients list is empty, seed mock clients
  useEffect(() => {
    if (isDemoMode) {
      setClients((prev) => {
        if (prev.length === 0) {
          const mock = getMockInitialClients();
          saveCachedClients(mock);
          return mock;
        }
        return prev;
      });
    }
  }, [isDemoMode]);

  // Persist clients cache whenever state changes (debounced 300ms)
  useEffect(() => {
    if (!currentUser || isPasswordChangeRequired) return;
    const timer = setTimeout(() => saveCachedClients(clients), 300);
    return () => clearTimeout(timer);
  }, [clients, currentUser, isPasswordChangeRequired]);

  // Load from Supabase on mount / login (skip in demo mode)
  useEffect(() => {
    if (isDemoMode || !isSupabaseConfigured || !currentUser || isPasswordChangeRequired) return;

    let isMounted = true;
    clientRepo.getAll()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setClients(data);
          saveCachedClients(data);
        }
      })
      .catch((err) => {
        console.warn('Notice: Failed to fetch clients from Supabase:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, isPasswordChangeRequired]);

  // Upsert client and associated product ownership
  const recordClientInteraction = useCallback(async (params: {
    clientName: string;
    phoneNumber?: string;
    productName?: string;
    agentName: string;
  }) => {
    if (!params.clientName.trim()) return;

    const formattedParams = {
      ...params,
      phoneNumber: params.phoneNumber ? formatPhoneNumber(params.phoneNumber) : undefined,
    };

    try {
      const updatedClient = await clientRepo.upsertClientWithProduct(formattedParams);
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
      console.warn('Notice: Failed to sync client interaction:', err);
    }
  }, []);

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
      const normalizedClients = newClients.map((c) => {
        const formattedPhones = normalizeClientPhones(c);
        return {
          ...c,
          phoneNumbers: formattedPhones,
          phoneNumber: formattedPhones[0] || (c.phoneNumber ? formatPhoneNumber(c.phoneNumber) : undefined),
        };
      });

      const previousClients = clients;
      const { deletedClients, changedClients } = computeClientDiff(
        clients as any,
        normalizedClients as any
      );

      setClients(normalizedClients);

      const errors: string[] = [];

      for (const deleted of deletedClients) {
        try {
          await clientRepo.delete(deleted.id);
        } catch (err: any) {
          console.error(`Failed to delete client ${deleted.id}:`, err);
          errors.push(`Delete ${deleted.name || deleted.id}: ${err?.message || err}`);
        }
      }

      for (const changed of changedClients) {
        try {
          await clientRepo.update(changed as any, currentAgentName);
        } catch (err: any) {
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
    [clients, currentAgentName]
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
