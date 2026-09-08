/**
 * @file useClientMatch.ts
 * @description Hook to look up a matched client from client records by name and aggregate
 * all known phone numbers (from client record array, single string, and past call interactions).
 */

import { useMemo } from 'react';
import { ClientRecord, Interaction } from '../types';
import { validatePhoneNumber, normalizeClientPhones } from '../domain/client/phone';

export interface UseClientMatchResult {
  matchedClient: ClientRecord | null;
  clientPhoneNumbers: string[];
}

export function useClientMatch(
  clientName?: string,
  clients?: ClientRecord[],
  interactions?: Interaction[]
): UseClientMatchResult {
  // Match currently known client based on entered client name
  const matchedClient = useMemo(() => {
    if (!clients || !clientName) return null;
    const trimmed = clientName.trim().toLowerCase();
    if (!trimmed) return null;
    return clients.find((c) => c.name.toLowerCase() === trimmed) || null;
  }, [clients, clientName]);

  // Collect all unique phone numbers known for the matched client
  const clientPhoneNumbers = useMemo(() => {
    if (!matchedClient) return [];
    const numbersSet = new Set<string>(normalizeClientPhones(matchedClient));

    if (interactions && interactions.length > 0 && matchedClient.name) {
      const clientNameLower = matchedClient.name.trim().toLowerCase();
      interactions.forEach((i) => {
        if (
          i.channel === 'Call' &&
          i.channelDetails &&
          i.clientName &&
          i.clientName.trim().toLowerCase() === clientNameLower
        ) {
          const phone = i.channelDetails.trim();
          if (phone && validatePhoneNumber(phone).isValid) {
            numbersSet.add(phone);
          }
        }
      });
    }

    return Array.from(numbersSet);
  }, [matchedClient, interactions]);

  return {
    matchedClient,
    clientPhoneNumbers,
  };
}
