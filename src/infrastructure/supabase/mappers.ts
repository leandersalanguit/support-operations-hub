/**
 * @file mappers.ts
 * @description Pure data mappers between PostgreSQL database schemas (snake_case)
 * and Domain models (camelCase).
 */

import { SupportInteraction, InteractionFormData, InteractionStatus, ChannelType } from '../../domain/interaction/types';
import { SupportLicense } from '../../domain/interaction/license';
import { ClientProfile } from '../../domain/client/types';
import { normalizeClientPhones } from '../../domain/client/phone';
import { isValidUUID } from '../../utils/uuid';

export interface DbInteraction {
  id: string;
  created_at: string;
  date: string;
  day_of_week: string;
  time: string;
  agent: string;
  agent_id?: string | null;
  client_id?: string | null;
  client_name: string;
  channel: 'Call' | 'Chat';
  channel_details: string;
  client_product: string;
  case_classification: string;
  status: string;
  license?: string | null;
  in_event: boolean;
  first_time_user: boolean;
  additional_notes: string;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
}

export interface DbClient {
  id: string;
  name: string;
  phone_numbers?: string[] | null;
  created_at: string;
  updated_at: string;
  last_logged_by?: string | null;
  client_products?: { product_name: string }[];
}

/**
 * Maps a database interaction row to the domain SupportInteraction entity.
 */
export function mapDbToInteraction(db: DbInteraction): SupportInteraction {
  const license: SupportLicense = db.license || 'support_active';

  return {
    id: db.id,
    createdAt: db.created_at,
    date: db.date,
    dayOfWeek: db.day_of_week,
    time: db.time || '00:00:00',
    agent: db.agent,
    agentId: db.agent_id || undefined,
    clientId: db.client_id || undefined,
    clientName: db.client_name,
    channel: db.channel as ChannelType,
    channelDetails: db.channel_details || '',
    clientProduct: db.client_product,
    caseClassification: db.case_classification,
    status: db.status as InteractionStatus,
    license,
    inEvent: Boolean(db.in_event),
    firstTimeUser: Boolean(db.first_time_user),
    additionalNotes: db.additional_notes || '',
    lastModifiedBy: db.last_modified_by || undefined,
    lastModifiedAt: db.last_modified_at || undefined,
  };
}

/**
 * Maps a domain interaction entity or form data into a database insert/update payload.
 */
export function mapInteractionToDb(
  interaction: SupportInteraction | (InteractionFormData & { id?: string; createdAt?: string; time?: string })
): Partial<DbInteraction> {
  const payload: Partial<DbInteraction> = {
    date: interaction.date,
    day_of_week: interaction.dayOfWeek,
    time: interaction.time || '00:00:00',
    agent: interaction.agent,
    client_name: interaction.clientName,
    channel: interaction.channel,
    channel_details: interaction.channelDetails || '',
    client_product: interaction.clientProduct,
    case_classification: interaction.caseClassification,
    status: interaction.status,
    license: interaction.license || 'support_active',
    in_event: interaction.inEvent,
    first_time_user: interaction.firstTimeUser,
    additional_notes: interaction.additionalNotes || '',
  };

  if ('agentId' in interaction && interaction.agentId && isValidUUID(interaction.agentId)) {
    payload.agent_id = interaction.agentId;
  }
  if ('clientId' in interaction && interaction.clientId && isValidUUID(interaction.clientId)) {
    payload.client_id = interaction.clientId;
  }
  if ('id' in interaction && interaction.id && isValidUUID(interaction.id)) {
    payload.id = interaction.id;
  }
  if ('createdAt' in interaction && interaction.createdAt) {
    payload.created_at = interaction.createdAt;
  }
  if ('lastModifiedBy' in interaction && interaction.lastModifiedBy) {
    payload.last_modified_by = interaction.lastModifiedBy;
  }
  if ('lastModifiedAt' in interaction && interaction.lastModifiedAt) {
    payload.last_modified_at = interaction.lastModifiedAt;
  }

  return payload;
}

/**
 * Maps a database client row with relational products to a domain ClientProfile.
 */
export function mapDbToClient(db: DbClient): ClientProfile {
  const numbers = normalizeClientPhones(db);

  const ownedProducts = Array.isArray(db.client_products)
    ? db.client_products.map((p) => p.product_name).filter(Boolean)
    : [];

  return {
    id: db.id,
    name: db.name,
    phoneNumbers: numbers,
    phoneNumber: numbers[0] || undefined,
    ownedProducts,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    lastLoggedBy: db.last_logged_by || undefined,
  };
}
