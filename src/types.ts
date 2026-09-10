/**
 * @fileoverview Defines core TypeScript types and constants for the Shift Summary App.
 * This file serves as a backwards-compatible facade re-exporting canonical domain models,
 * entities, value objects, and database row schemas.
 */

// Domain interaction types & constants
export type {
  ChannelType,
  InteractionStatus,
  StatusType,
  SupportInteraction as Interaction,
  SupportInteraction,
  InteractionFormData,
  StatusBadgeConfig,
} from './domain/interaction/types';

export {
  CLIENT_PRODUCTS,
  CASE_CLASSIFICATIONS,
  STATUS_OPTIONS,
} from './domain/interaction/types';

// Domain license types & functions
export type {
  SupportLicense,
  InactiveSupportOption,
} from './domain/interaction/license';

export {
  isLicenseActive,
  toDisplayLabel,
  toSpreadsheetLabel,
  resolveLicense,
} from './domain/interaction/license';

// Domain client CRM types
export type {
  ClientProfile,
  ClientProfile as ClientRecord,
  ClientFormData,
} from './domain/client/types';

// Infrastructure database row schemas
export type {
  DbInteraction,
  DbClient,
} from './infrastructure/supabase/mappers';


