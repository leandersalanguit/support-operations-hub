/**
 * @file diff.ts
 * @description Pure domain logic for computing differences (deletions and modifications)
 * between client profile collections.
 */

import { ClientProfile } from './types';

export interface ClientDiffResult {
  /** Clients present in the original dataset but omitted in the updated dataset */
  deletedClients: ClientProfile[];
  /** Clients with modified name, phone numbers, or owned products */
  changedClients: ClientProfile[];
}

/**
 * Compares two client lists and determines which records were deleted or modified.
 *
 * @param originalClients - The baseline client list.
 * @param updatedClients - The updated client list.
 * @returns Object containing deleted and changed client records.
 */
export function computeClientDiff(
  originalClients: ClientProfile[],
  updatedClients: ClientProfile[]
): ClientDiffResult {
  const updatedIds = new Set(updatedClients.map((c) => c.id));
  const deletedClients = originalClients.filter((c) => !updatedIds.has(c.id));

  const originalMap = new Map(originalClients.map((c) => [c.id, c]));
  const changedClients = updatedClients.filter((c) => {
    const original = originalMap.get(c.id);
    if (!original) return true;
    return (
      original.name !== c.name ||
      JSON.stringify(original.phoneNumbers || []) !== JSON.stringify(c.phoneNumbers || []) ||
      JSON.stringify(original.ownedProducts || []) !== JSON.stringify(c.ownedProducts || [])
    );
  });

  return { deletedClients, changedClients };
}
