/**
 * @file types.ts
 * @description Domain entity definitions for clients (CRM) and product ownership.
 */

export interface ClientProfile {
  id: string;
  name: string;
  phoneNumbers: string[];
  phoneNumber?: string; // Derived primary contact for backward compatibility
  /** Products added through the client directory. Legacy cached profiles treat all owned products as manual. */
  manuallyOwnedProducts?: string[];
  /** Products associated with at least one support interaction. */
  interactionProducts?: string[];
  ownedProducts: string[];
  createdAt: string;
  updatedAt: string;
  lastLoggedBy?: string;
}

/**
 * Backward-compatible domain alias for ClientProfile.
 */
export type ClientRecord = ClientProfile;

export type ClientFormData = Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

