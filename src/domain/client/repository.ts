/**
 * @file repository.ts
 * @description Domain contracts for Client CRM persistence.
 */

import { ClientProfile } from './types';

export interface IClientRepository {
  getAll(): Promise<ClientProfile[]>;
  upsertClientWithProduct(params: {
    clientName: string;
    phoneNumber?: string;
    productName?: string;
    agentName?: string;
  }): Promise<ClientProfile>;
  update(client: ClientProfile, agentName?: string): Promise<void>;
  delete(id: string): Promise<void>;
}
