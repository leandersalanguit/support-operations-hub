/**
 * @file license.ts
 * @description Pure domain value object representing the support license and eligibility state of an interaction.
 */

import { InactiveSupportOption } from '../../types';

export type SupportLicense = 'support_active' | 'renewal_sent' | 'support_inactive';

/**
 * Checks whether the license represents an active support license agreement.
 */
export function isLicenseActive(license: SupportLicense): boolean {
  return license === 'support_active';
}

/**
 * Returns a human-friendly display label for UI badges.
 */
export function toDisplayLabel(license: SupportLicense): string {
  switch (license) {
    case 'support_active':
      return 'License Active';
    case 'renewal_sent':
      return 'Renewal Sent';
    case 'support_inactive':
      return 'Support Inactive';
  }
}

/**
 * Returns standard spreadsheet cell text matching support hub conventions.
 */
export function toSpreadsheetLabel(license: SupportLicense): string {
  switch (license) {
    case 'support_active':
      return 'Yes';
    case 'renewal_sent':
      return 'Renewal Sent';
    case 'support_inactive':
      return 'Support Inactive';
  }
}

/**
 * Constructs a SupportLicense value from boolean and inactive support option fields.
 */
export function resolveLicense(
  validLicense: boolean,
  inactiveOption?: InactiveSupportOption | string | null
): SupportLicense {
  if (validLicense) {
    return 'support_active';
  }
  return inactiveOption === 'Renewal Sent' ? 'renewal_sent' : 'support_inactive';
}
