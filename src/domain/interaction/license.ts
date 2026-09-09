/**
 * @file license.ts
 * @description Pure domain value object representing the support license and eligibility state of an interaction.
 */

import { InactiveSupportOption } from '../../types';

export type SupportLicense =
  | 'support_active'
  | 'renewal_sent'
  | 'support_inactive'
  | (string & {});

/**
 * Checks whether the license represents an active support license agreement.
 */
export function isLicenseActive(license: SupportLicense): boolean {
  const l = (license || '').toLowerCase();
  return l === 'support_active' || l.includes('active') || l === 'yes';
}

export interface SupportTierLike {
  code: string;
  label?: string;
  exportLabel?: string;
}

/**
 * Returns a human-friendly display label for UI badges.
 */
export function toDisplayLabel(
  license: SupportLicense,
  supportTiers?: SupportTierLike[]
): string {
  if (supportTiers && supportTiers.length > 0) {
    const match = supportTiers.find((t) => t.code === license);
    if (match) {
      return match.label || match.exportLabel || license;
    }
  }

  if (isLicenseActive(license)) {
    return 'License Active';
  }
  const l = (license || '').toLowerCase();
  if (l === 'renewal_sent') {
    return 'Renewal Sent';
  }
  if (l === 'support_inactive') {
    return 'Support Inactive';
  }
  return license || 'Support Inactive';
}

/**
 * Returns standard spreadsheet cell text matching support hub conventions.
 */
export function toSpreadsheetLabel(
  license: SupportLicense,
  supportTiers?: SupportTierLike[]
): string {
  if (supportTiers && supportTiers.length > 0) {
    const match = supportTiers.find((t) => t.code === license);
    if (match) {
      return match.exportLabel || match.label || license;
    }
  }

  if (isLicenseActive(license)) {
    return 'Yes';
  }
  const l = (license || '').toLowerCase();
  if (l === 'renewal_sent') {
    return 'Renewal Sent';
  }
  if (l === 'support_inactive') {
    return 'Support Inactive';
  }
  return license || 'Support Inactive';
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
  if (!inactiveOption) {
    return 'support_inactive';
  }
  const opt = inactiveOption.toLowerCase();
  if (opt.includes('renewal') || opt.includes('link')) {
    return 'renewal_sent';
  }
  return 'support_inactive';
}
