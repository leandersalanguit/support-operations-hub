/**
 * @file SupportLicenseBadge.tsx
 * @description Standardized support license status badge pill for table rows and cards.
 * Evaluates active status, renewal sent state, or inactive state based on license code and support tier taxonomies.
 */

import React from 'react';
import { SupportTier } from '../../infrastructure/supabase/configRepo';
import { isLicenseActive } from '../../domain/interaction/license';
import { isTierActive } from '../common/LicenseSelector';

export interface SupportLicenseBadgeProps {
  license?: string;
  supportTiers?: SupportTier[];
}

export const SupportLicenseBadge: React.FC<SupportLicenseBadgeProps> = React.memo(({
  license,
  supportTiers,
}) => {
  const matchedTier = supportTiers?.find((t) => t.code === license);
  const isAct = isLicenseActive(license || '') || (matchedTier ? isTierActive(matchedTier) : false);
  const isRen = !isAct && (
    license === 'renewal_sent' ||
    /renewal|link|send|sent/i.test(`${license || ''} ${matchedTier?.label || ''}`)
  );
  const titleText = isAct
    ? `Support License: Valid${matchedTier ? ` (${matchedTier.label})` : ''}`
    : `Support License: Inactive (${matchedTier?.label || (isRen ? 'Renewal Sent' : 'Support Inactive')})`;
  const badgeText = isAct
    ? (matchedTier?.code === 'support_active' ? 'License' : matchedTier?.label || 'License')
    : matchedTier
    ? matchedTier.label
    : isRen
    ? 'Renewal'
    : 'Inactive';

  return (
    <span
      title={titleText}
      className={`w-full max-w-[82px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
        isAct
          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 font-semibold'
          : isRen
          ? 'text-purple-700 dark:text-purple-300 bg-purple-50/90 dark:bg-purple-950/40 font-semibold'
          : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isAct
            ? 'bg-emerald-500'
            : isRen
            ? 'bg-purple-500'
            : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
      <span className="truncate">
        {badgeText}
      </span>
    </span>
  );
});
