/**
 * @file clientRepo.ts
 * @description Strongly typed Supabase implementation of IClientRepository.
 */

import { IClientRepository } from '../../domain/client/repository';
import { ClientProfile } from '../../domain/client/types';
import { resolveClientName } from '../../domain/client/nameResolution';
import { supabase, isSupabaseConfigured, withNetworkRetry, createAccessRecheckError, toSupabaseOperationError } from './client';
import { mapDbToClient } from './mappers';
import { generateUUID } from '../../utils/uuid';

export class SupabaseClientRepository implements IClientRepository {
  private async getInteractionProducts(clientIds: string[]): Promise<Array<{ client_id: string; product_name: string }>> {
    if (clientIds.length === 0) return [];

    const pageSize = 500;
    const products: Array<{ client_id: string; product_name: string }> = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('client_product_interactions')
        .select('client_id, product_name')
        .in('client_id', clientIds)
        .order('interaction_id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw toSupabaseOperationError(error);
      const page = data || [];
      products.push(...page);
      if (page.length < pageSize) return products;
    }
  }

  async getAll(): Promise<ClientProfile[]> {
    if (!isSupabaseConfigured) return [];

    return await withNetworkRetry(async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone_numbers,
          created_at,
          updated_at,
          last_logged_by,
          client_products (
            product_name
          )
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase fetch clients error:', error);
        throw toSupabaseOperationError(error);
      }

      const clients = (data || []).map(mapDbToClient);
      const clientIds = clients.map((client) => client.id);
      const interactions = await this.getInteractionProducts(clientIds);

      const productsByClient = new Map<string, string[]>();
      for (const row of interactions || []) {
        const products = productsByClient.get(row.client_id) || [];
        products.push(row.product_name);
        productsByClient.set(row.client_id, products);
      }

      return clients.map((client) => {
        const interactionProducts = Array.from(new Set(productsByClient.get(client.id) || []));
        const manuallyOwnedProducts = client.manuallyOwnedProducts || client.ownedProducts;
        return {
          ...client,
          manuallyOwnedProducts,
          interactionProducts,
          ownedProducts: Array.from(new Set([...manuallyOwnedProducts, ...interactionProducts])),
        };
      });
    });
  }

  async upsertClientWithProduct(params: {
    clientName: string;
    phoneNumber?: string;
    productName?: string;
    agentName?: string;
  }): Promise<ClientProfile> {
    const { canonicalClientName } = resolveClientName(params.clientName);
    const trimmedName = (canonicalClientName || params.clientName).trim();
    if (!trimmedName) {
      throw new Error('Client name is required');
    }

    const trimmedPhone = params.phoneNumber?.trim() || undefined;
    const trimmedProduct = params.productName?.trim() || undefined;
    const agent = params.agentName?.trim() || undefined;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured) {
      const fallbackNumbers = trimmedPhone ? [trimmedPhone] : [];
      return {
        id: generateUUID(),
        name: trimmedName,
        phoneNumber: trimmedPhone,
        phoneNumbers: fallbackNumbers,
        ownedProducts: trimmedProduct ? [trimmedProduct] : [],
        manuallyOwnedProducts: [],
        interactionProducts: trimmedProduct ? [trimmedProduct] : [],
        createdAt: now,
        updatedAt: now,
        lastLoggedBy: agent,
      };
    }

    return await withNetworkRetry(async () => {
      // 1. Look up existing client (case-insensitive)
      const { data: existingClient, error: findError } = await supabase
        .from('clients')
        .select('id, name, phone_numbers, created_at, updated_at, last_logged_by')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (findError) {
        throw toSupabaseOperationError(findError);
      }

      let clientId: string;
      let clientCreatedAt = now;
      let currentPhoneNumbers: string[] = [];

      if (existingClient) {
        clientId = existingClient.id;
        clientCreatedAt = existingClient.created_at;

        if (Array.isArray(existingClient.phone_numbers) && existingClient.phone_numbers.length > 0) {
          currentPhoneNumbers = [...existingClient.phone_numbers];
        } else if ((existingClient as any).phone_number) {
          currentPhoneNumbers = (existingClient as any).phone_number.split(/[,;\n]+/).map((p: string) => p.trim()).filter(Boolean);
        }

        if (trimmedPhone && !currentPhoneNumbers.includes(trimmedPhone)) {
          currentPhoneNumbers.push(trimmedPhone);
        }

        interface ClientRecordUpdate {
          updated_at: string;
          last_logged_by: string | null;
          phone_numbers: string[];
        }

        const updatePayload: ClientRecordUpdate = {
          updated_at: now,
          last_logged_by: agent || existingClient.last_logged_by || null,
          phone_numbers: currentPhoneNumbers,
        };

        const { data: updatedClient, error: updateError } = await supabase
          .from('clients')
          .update(updatePayload)
          .eq('id', clientId)
          .select('id')
          .maybeSingle();

        if (updateError) {
          throw toSupabaseOperationError(updateError);
        }
        if (!updatedClient) throw createAccessRecheckError();
      } else {
        currentPhoneNumbers = trimmedPhone ? [trimmedPhone] : [];

        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert([
            {
              name: trimmedName,
              phone_numbers: currentPhoneNumbers,
              created_at: now,
              updated_at: now,
              last_logged_by: agent || null,
            },
          ])
          .select('id, name, phone_numbers, created_at, updated_at, last_logged_by')
          .single();

        if (insertError) {
          throw toSupabaseOperationError(insertError);
        }

        clientId = newClient.id;
        clientCreatedAt = newClient.created_at;
      }

      // 2. Fetch manual and interaction-derived products after database triggers run.
      const { data: productsData, error: productsError } = await supabase
        .from('client_products')
        .select('product_name')
        .eq('client_id', clientId);
      if (productsError) throw toSupabaseOperationError(productsError);

      const manuallyOwnedProducts: string[] = productsData
        ? (productsData as Array<{ product_name: string }>).map((p) => p.product_name).filter(Boolean)
        : [];

      const interactionProductsData = await this.getInteractionProducts([clientId]);

      const interactionProducts = Array.from(new Set(
        (interactionProductsData || [])
          .map((row) => row.product_name)
          .filter(Boolean)
      ));
      const ownedProducts = Array.from(new Set([...manuallyOwnedProducts, ...interactionProducts]));

      return {
        id: clientId,
        name: trimmedName,
        phoneNumber: currentPhoneNumbers[0] || trimmedPhone,
        phoneNumbers: currentPhoneNumbers,
        ownedProducts,
        manuallyOwnedProducts,
        interactionProducts,
        createdAt: clientCreatedAt,
        updatedAt: now,
        lastLoggedBy: agent,
      };
    });
  }

  async update(client: ClientProfile, agentName?: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const trimmedName = client.name.trim();
    if (!trimmedName) throw new Error('Client name cannot be empty');

    const now = new Date().toISOString();
    const phoneNumbers = client.phoneNumbers || (client.phoneNumber ? [client.phoneNumber] : []);

    await withNetworkRetry(async () => {
      // 1. Upsert client row
      const { data: upsertedClient, error: upsertError } = await supabase
        .from('clients')
        .upsert(
          {
            id: client.id,
            name: trimmedName,
            phone_numbers: phoneNumbers,
            created_at: client.createdAt || now,
            updated_at: now,
            last_logged_by: agentName || client.lastLoggedBy || null,
          },
          { onConflict: 'id' }
        )
        .select('id')
        .single();

      if (upsertError) throw toSupabaseOperationError(upsertError);
      if (!upsertedClient) throw createAccessRecheckError();

      // 2. Refresh client_products
      if (Array.isArray(client.ownedProducts)) {
        const manuallyOwnedProducts = client.manuallyOwnedProducts ?? client.ownedProducts;
        const uniqueProducts = Array.from(new Set(manuallyOwnedProducts.filter(Boolean)));
        const { data: existingProducts, error: readProductsError } = await supabase
          .from('client_products')
          .select('id, product_name')
          .eq('client_id', client.id);
        if (readProductsError) throw toSupabaseOperationError(readProductsError);
        const existingRows = Array.isArray(existingProducts)
          ? existingProducts as Array<{ id: string; product_name: string }>
          : [];
        const desiredProducts = new Set(uniqueProducts);
        const desiredProductNames = new Set(existingRows.map((row) => row.product_name));
        const removedProductIds = existingRows
          .filter((row) => !desiredProducts.has(row.product_name))
          .map((row) => row.id);

        if (removedProductIds.length > 0) {
          const { data: deletedProducts, error: deleteProductsError } = await supabase
            .from('client_products')
            .delete()
            .in('id', removedProductIds)
            .select('id');
          if (deleteProductsError) throw toSupabaseOperationError(deleteProductsError);
          if (!Array.isArray(deletedProducts) || deletedProducts.length !== removedProductIds.length) {
            throw createAccessRecheckError();
          }
        }

        const addedProducts = uniqueProducts.filter((productName) => !desiredProductNames.has(productName));
        if (addedProducts.length > 0) {
          const productRows = addedProducts.map((p) => ({
            client_id: client.id,
            product_name: p,
          }));
          const { error: insertError } = await supabase
            .from('client_products')
            .upsert(productRows, { onConflict: 'client_id,product_name', ignoreDuplicates: true });

          if (insertError) throw toSupabaseOperationError(insertError);
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    await withNetworkRetry(async () => {
      const { data, error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw toSupabaseOperationError(error);
      if (!data) throw createAccessRecheckError();
    });
  }
}

export const clientRepo = new SupabaseClientRepository();
