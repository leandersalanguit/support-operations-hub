/**
 * @file LicenseSelector.tsx
 * @description Reusable support license and eligibility selector supporting dynamic support tiers
 * fetched from PostgreSQL via configRepo.
 */

import React from 'react';
import { ShieldCheck, Check, X, Cloud, Mail } from 'lucide-react';
import { SupportLicense } from '../../domain/interaction/license';
import { SupportTier } from '../../infrastructure/supabase/configRepo';

export interface LicenseSelectorProps {
  license: SupportLicense;
  supportTiers?: SupportTier[];
  onChangeLicense: (val: SupportLicense) => void;
  error?: string;
  compact?: boolean;
}

/**
 * Fallback inactive support tiers used when no dynamic tiers are returned from Supabase.
 */
export const FALLBACK_INACTIVE_TIERS: SupportTier[] = [
  { code: 'support_inactive', label: 'Support Inactive', exportLabel: 'Support Inactive', isDefault: false },
  { code: 'renewal_sent', label: 'Renewal Sent', exportLabel: 'Renewal Sent', isDefault: false },
];

/**
 * Determines whether a tier from the database represents the active support license ("Yes").
 * Evaluated dynamically based on database configuration (isDefault: true, or exportLabel: 'Yes').
 */
export function isTierActive(tier: SupportTier): boolean {
  if (tier.isDefault) return true;
  const exportLabel = (tier.exportLabel || '').toLowerCase().trim();
  if (exportLabel === 'yes') return true;
  return tier.code === 'support_active';
}

export const LicenseSelector: React.FC<LicenseSelectorProps> = React.memo(({
  license,
  supportTiers = [],
  onChangeLicense,
  error,
  compact = false,
}) => {
  // Resolve active tier dynamically from database fetch
  const activeTier = supportTiers.find((t) => isTierActive(t));
  const activeCode = activeTier?.code || 'support_active';
  const isLicenseActive = license === activeCode || license === 'support_active' || license === 'Yes';

  // Dynamic inactive tiers from Supabase (excluding the active tier)
  const dbInactiveTiers = supportTiers.filter((t) => !isTierActive(t));

  // Fallback called renewal_sent and support_inactive if no dynamic inactive tiers in Supabase
  const inactiveTiers = dbInactiveTiers.length > 0 ? dbInactiveTiers : FALLBACK_INACTIVE_TIERS;

  if (compact) {
    return (
      <div
        className={`p-3 rounded-xl border bg-white dark:bg-slate-800 flex flex-col justify-between transition-all ${
          error
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : isLicenseActive
            ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/30'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isLicenseActive
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Support License</span>
                <span className="text-rose-500">*</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Support eligibility</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold">
          <button
            type="button"
            onClick={() => onChangeLicense(activeCode)}
            title={activeTier ? `${activeTier.label} (Active Support License)` : 'Active Support License'}
            className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isLicenseActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Yes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLicenseActive) {
                onChangeLicense(inactiveTiers[0]?.code || 'support_inactive');
              }
            }}
            className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              !isLicenseActive
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>No</span>
          </button>
        </div>

        {/* Sub-menu when license is inactive */}
        {!isLicenseActive && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Sub-menu:
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                Default: {inactiveTiers[0]?.label || 'Support Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded-lg text-[11px] font-bold">
              {inactiveTiers.map((tier) => {
                const isSelected =
                  license === tier.code ||
                  (!isLicenseActive && !inactiveTiers.some((t) => t.code === license) && tier.code === inactiveTiers[0].code);
                const isRenewal =
                  tier.code.toLowerCase().includes('renewal') ||
                  tier.code.toLowerCase().includes('link');

                return (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => onChangeLicense(tier.code)}
                    className={`py-1 px-1 rounded transition-all text-center cursor-pointer ${
                      isSelected
                        ? isRenewal ? 'bg-purple-600 text-white shadow-xs' : 'bg-fotoblue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                    }`}
                    title={tier.label}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <div
        className={`p-4 rounded-xl border bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          error
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : isLicenseActive
            ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/30'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isLicenseActive
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>Support License</span>
              <span className="text-rose-500">*</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Does the client have active support license or support eligibility?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:w-48 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => onChangeLicense(activeCode)}
            title={activeTier ? `${activeTier.label} (Active Support License)` : 'Active Support License'}
            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isLicenseActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Yes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLicenseActive) {
                onChangeLicense(inactiveTiers[0]?.code || 'support_inactive');
              }
            }}
            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              !isLicenseActive
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>No</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}

      {/* Sub-menu when license is inactive */}
      {!isLicenseActive && (
        <div className="mt-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              License Renewal Status / Action
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Default: {inactiveTiers[0]?.label || 'Support Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {inactiveTiers.map((tier) => {
              const isSelected =
                license === tier.code ||
                (!isLicenseActive && !inactiveTiers.some((t) => t.code === license) && tier.code === inactiveTiers[0].code);
              const isRenewal =
                tier.code.toLowerCase().includes('renewal') ||
                tier.code.toLowerCase().includes('link');

              return (
                <button
                  key={tier.code}
                  type="button"
                  onClick={() => onChangeLicense(tier.code)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? isRenewal
                        ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 ring-1 ring-purple-400 shadow-2xs'
                        : 'border-fotoblue-500 bg-fotoblue-50/80 dark:bg-fotoblue-950/60 text-fotoblue-950 dark:text-fotoblue-200 ring-1 ring-fotoblue-400 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                      isSelected
                        ? isRenewal
                          ? 'bg-purple-600 text-white'
                          : 'bg-fotoblue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isRenewal ? <Mail className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{tier.label}</span>
                      {tier.isDefault && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-fotoblue-100 dark:bg-fotoblue-900/60 text-fotoblue-800 dark:text-fotoblue-200 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isRenewal
                        ? 'Renewal link was sent to the client to reactivate coverage.'
                        : 'Client is using account without active support license.'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
