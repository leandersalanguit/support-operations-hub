/**
 * @fileoverview Defines core TypeScript types and constants for the Shift Summary App.
 * This file contains definitions for communication channels, interaction statuses,
 * the main Interaction data model, and constant arrays for client products and case classifications.
 */

/**
 * Union type representing the communication channel used for the interaction.
 */
export type ChannelType = 'Call' | 'Chat';

/**
 * Union type representing the possible statuses of a support interaction.
 */
export type StatusType =
  | 'Solved'
  | 'Waiting for an update from client'
  | 'Not solved'
  | 'In progress'
  | 'Provided an alternative solution'
  | 'Need to follow up';

import { SupportLicense } from './domain/interaction/license';

export type { SupportLicense };

/**
 * Union type representing the sub-menu option when support license is not active.
 */
export type InactiveSupportOption = 'Renewal Sent' | 'Support Inactive';

/**
 * Represents a complete support interaction record.
 */
export interface Interaction {
  /** Unique identifier for the interaction */
  id: string;
  /** ISO string timestamp indicating when the interaction was created (e.g. 2026-08-20T05:58:00.000Z) */
  createdAt: string; // ISO string timestamp (e.g. 2026-08-20T05:58:00.000Z)
  /** The date of the interaction in YYYY-MM-DD format */
  date: string; // YYYY-MM-DD
  /** The day of the week the interaction occurred (e.g., "Wednesday") */
  dayOfWeek: string; // e.g., "Wednesday"
  /** Optional hidden log time in HH:mm:ss format */
  time?: string; // Hidden log time e.g., "14:32:05"
  /** The name of the support agent handling the interaction */
  agent: string;
  /** The name of the client */
  clientName: string;
  /** The communication channel used */
  channel: ChannelType;
  /** Specific details about the channel, such as Phone number or Helpdesk Ticket link/ID */
  channelDetails: string; // Phone number or Ticket link/ID
  /** The product or equipment related to the interaction */
  clientProduct: string;
  /** The category or classification of the support case */
  caseClassification: string;
  /** The current status of the interaction */
  status: StatusType;
  /** Support license and eligibility state */
  license: SupportLicense;
  /** Indicates if the interaction happened during an event */
  inEvent: boolean;
  /** Indicates if the user is a first-time user */
  firstTimeUser: boolean;
  /** Any additional notes or context regarding the interaction */
  additionalNotes: string;
  /** Name of the agent who last modified this interaction (if any) */
  lastModifiedBy?: string;
  /** ISO timestamp of when this interaction was last modified (if any) */
  lastModifiedAt?: string;
}

/**
 * Represents the form data for an interaction, excluding the automatically generated 'id' and 'createdAt' fields.
 */
export type InteractionFormData = Omit<Interaction, 'id' | 'createdAt'>;

export { CLIENT_PRODUCTS, CASE_CLASSIFICATIONS } from './domain/interaction/types';

/**
 * Configuration options for status displays, mapping each status to its corresponding
 * Tailwind CSS classes for color-coding badges and UI elements.
 */
export const STATUS_OPTIONS: { label: StatusType; color: string; badgeBg: string; badgeBorder: string; badgeText: string; dotColor: string }[] = [
  {
    label: 'Solved',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    label: 'In progress',
    color: 'fotoblue',
    badgeBg: 'bg-fotoblue-50 text-fotoblue-800 dark:bg-fotoblue-950/50 dark:text-fotoblue-300',
    badgeBorder: 'border-fotoblue-200 dark:border-fotoblue-800',
    badgeText: 'text-fotoblue-800 dark:text-fotoblue-300',
    dotColor: 'bg-fotoblue-500',
  },
  {
    label: 'Waiting for an update from client',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
  },
  {
    label: 'Need to follow up',
    color: 'orange',
    badgeBg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    badgeBorder: 'border-orange-200 dark:border-orange-800',
    badgeText: 'text-orange-700 dark:text-orange-300',
    dotColor: 'bg-orange-500',
  },
  {
    label: 'Provided an alternative solution',
    color: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
    dotColor: 'bg-purple-500',
  },
  {
    label: 'Not solved',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    badgeText: 'text-rose-700 dark:text-rose-300',
    dotColor: 'bg-rose-500',
  },
];

/**
 * Client-side domain model representing a unique client, their contact number, and owned products.
 */
export interface ClientRecord {
  /** Unique client identifier (UUID) */
  id: string;
  /** Unique client or company name */
  name: string;
  /** Primary contact phone number */
  phoneNumber?: string;
  /** All known contact phone numbers for the client */
  phoneNumbers?: string[];
  /** List of products and equipment owned by the client */
  ownedProducts: string[];
  /** ISO timestamp when the client was first recorded */
  createdAt: string;
  /** ISO timestamp when the client record was last updated */
  updatedAt: string;
  /** Name of the agent who last logged or updated this client */
  lastLoggedBy?: string;
}

/**
 * PostgreSQL Database Row Schema for the `clients` table.
 */
export interface DbClient {
  id: string;
  name: string;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
  last_logged_by: string | null;
}

/**
 * PostgreSQL Database Row Schema for the `client_products` table.
 */
export interface DbClientProduct {
  id: string;
  client_id: string;
  product_name: string;
  created_at: string;
}

