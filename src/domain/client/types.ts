/**
 * @file types.ts
 * @description Domain entity definitions for clients (CRM) and product ownership.
 */

export interface ClientProfile {
  id: string;
  name: string;
  phoneNumbers: string[];
  phoneNumber?: string; // Derived primary contact for backward compatibility
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

