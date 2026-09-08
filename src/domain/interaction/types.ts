/**
 * @file types.ts
 * @description Core domain entity definitions and taxonomies for customer support interactions.
 */

import { SupportLicense } from './license';

export type ChannelType = 'Call' | 'Chat';

export type InteractionStatus =
  | 'Solved'
  | 'Waiting for an update from client'
  | 'Not solved'
  | 'In progress'
  | 'Provided an alternative solution'
  | 'Need to follow up';

export type StatusType = InteractionStatus;

export interface SupportInteraction {
  id: string;
  createdAt: string;              // ISO 8601 string
  date: string;                   // YYYY-MM-DD
  dayOfWeek: string;              // e.g. "Wednesday"
  time?: string;                  // HH:mm:ss
  agent: string;                  // Canonical agent display name
  agentId?: string;               // Optional Supabase Auth UID
  clientId?: string;              // Relational foreign key to ClientProfile
  clientName: string;
  channel: ChannelType;
  channelDetails: string;         // Phone number or ticket URL / ID
  clientProduct: string;          // Product or equipment name
  caseClassification: string;     // Support category
  status: InteractionStatus;
  license: SupportLicense;        // Support license and eligibility state
  inEvent: boolean;               // True if customer is at a live event
  firstTimeUser: boolean;         // True if first-time operator
  additionalNotes: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export type InteractionFormData = Omit<SupportInteraction, 'id' | 'createdAt' | 'time'> & {
  time?: string;
};

export const CLIENT_PRODUCTS = [
  'Dunder Mifflin Workstation',
  'Sabre Business Laptop',
  'Dunder Mifflin Desk Phone',
  'Sabre Conference Hub',
  'Dunder Mifflin Office Printer',
  'Sabre Document Scanner',
  'Dunder Mifflin Network Switch',
  'Sabre Access Badge Reader',
  'Dunder Mifflin Email',
  'Sabre HR Portal',
  'Dunder Mifflin Sales Portal',
  'Sabre Expense Manager',
  'Dunder Mifflin Order Manager',
  'Sabre FileShare',
  'Dunder Mifflin Video Meetings',
  'Sabre Print Manager',
  'Dunder Mifflin CRM',
  'Sabre Employee Portal',
  'Dunder Mifflin Inventory System',
  'Sabre Remote Access',
  'Dunder Mifflin VoIP System',
  'Sabre Office Suite',
  'Dunder Mifflin Customer Database',
  'Sabre Security Console',
] as const;

export type ProductIdentifier = typeof CLIENT_PRODUCTS[number];

export const CASE_CLASSIFICATIONS = [
  'General Inquiry',
  'Computer & Workstation',
  'Laptop & Mobile Device',
  'Printer & Copier',
  'Phone & VoIP',
  'Network & Connectivity',
  'Email & Calendar',
  'Sales Applications',
  'Order Management',
  'HR & Employee Systems',
  'File Storage & Sharing',
  'Video Conferencing',
  'Account & Access',
  'Password & Authentication',
  'Software Installation',
  'Hardware Replacement',
  'Security & Compliance',
  'System Performance',
  'Remote Access',
  'Other',
] as const;

export type CaseClassification = typeof CASE_CLASSIFICATIONS[number];

export interface StatusBadgeConfig {
  label: InteractionStatus;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}

export const STATUS_OPTIONS: StatusBadgeConfig[] = [
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
