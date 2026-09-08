/**
 * @file LicenseSelector.tsx
 * @description Reusable support license and eligibility selector supporting dynamic support tiers
 * fetched from PostgreSQL via configRepo.
 */

import React from 'react';
import { ShieldCheck, Check, Cloud, Mail } from 'lucide-react';
import { SupportLicense } from '../../domain/interaction/license';
import { SupportTier } from '../../infrastructure/supabase/configRepo';

export interface LicenseSelectorProps {
  license: SupportLicense;
  supportTiers?: SupportTier[];
  onChangeLicense: (val: SupportLicense) => void;
  error?: string;
  compact?: boolean;
}

export const LicenseSelector: React.FC<LicenseSelectorProps> = React.memo(({
  license,
  supportTiers = [],
  onChangeLicense,
  error,
  compact = false,
}) => {
  const isLicenseActive = license === 'support_active';
  const inactiveTiers = supportTiers.filter((t) => t.code !== 'support_active');

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
            onClick={() => onChangeLicense('support_active')}
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
                onChangeLicense('support_inactive');
              }
            }}
            className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              !isLicenseActive
                ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
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
                Default: Support Inactive
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded-lg text-[11px] font-bold">
              {inactiveTiers.length > 0 ? (
                inactiveTiers.map((tier) => {
                  const isSelected =
                    (tier.code === 'renewal_sent' && license === 'renewal_sent') ||
                    (tier.code === 'support_inactive' && license === 'support_inactive');
                  const optionValue: SupportLicense = tier.code === 'renewal_sent' ? 'renewal_sent' : 'support_inactive';
                  return (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => onChangeLicense(optionValue)}
                      className={`py-1 px-1 rounded transition-all text-center cursor-pointer ${
                        isSelected
                          ? tier.code === 'renewal_sent' ? 'bg-purple-600 text-white shadow-xs' : 'bg-fotoblue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                      }`}
                      title={tier.label}
                    >
                      {tier.label}
                    </button>
                  );
                })
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onChangeLicense('support_inactive')}
                    className={`py-1 px-1 rounded transition-all text-center cursor-pointer ${
                      license === 'support_inactive'
                        ? 'bg-fotoblue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                    }`}
                    title="Support Inactive: Client account without active support license"
                  >
                    Support Inactive
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLicense('renewal_sent')}
                    className={`py-1 px-1 rounded transition-all text-center cursor-pointer ${
                      license === 'renewal_sent'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                    }`}
                    title="Renewal Sent: Sent client an email with renewal link after our interaction"
                  >
                    Renewal Sent
                  </button>
                </>
              )}
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
            onClick={() => onChangeLicense('support_active')}
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
                onChangeLicense('support_inactive');
              }
            }}
            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
              !isLicenseActive
                ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
            }`}
          >
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
              Default: Support Inactive
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {inactiveTiers.length > 0 ? (
              inactiveTiers.map((tier) => {
                const isSelected =
                  (tier.code === 'renewal_sent' && license === 'renewal_sent') ||
                  (tier.code === 'support_inactive' && license === 'support_inactive');
                const optionValue: SupportLicense = tier.code === 'renewal_sent' ? 'renewal_sent' : 'support_inactive';
                return (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => onChangeLicense(optionValue)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-fotoblue-500 bg-fotoblue-50/80 dark:bg-fotoblue-950/60 text-fotoblue-950 dark:text-fotoblue-200 ring-1 ring-fotoblue-400 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                        isSelected
                          ? 'bg-fotoblue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tier.code === 'renewal_sent' ? <Mail className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
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
                        {tier.code === 'renewal_sent'
                          ? 'Renewal link was sent to the client to reactivate coverage.'
                          : 'Client is using account without active support license.'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <>
                {/* Support Inactive Option */}
                <button
                  type="button"
                  onClick={() => onChangeLicense('support_inactive')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    license === 'support_inactive'
                      ? 'border-fotoblue-500 bg-fotoblue-50/80 dark:bg-fotoblue-950/60 text-fotoblue-950 dark:text-fotoblue-200 ring-1 ring-fotoblue-400 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                      license === 'support_inactive'
                        ? 'bg-fotoblue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Support Inactive</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-fotoblue-100 dark:bg-fotoblue-900/60 text-fotoblue-800 dark:text-fotoblue-200 rounded">
                        Default
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Client is using account without active support license.
                    </p>
                  </div>
                </button>

                {/* Renewal Sent Option */}
                <button
                  type="button"
                  onClick={() => onChangeLicense('renewal_sent')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    license === 'renewal_sent'
                      ? 'border-fotoblue-500 bg-fotoblue-50/80 dark:bg-fotoblue-950/60 text-fotoblue-950 dark:text-fotoblue-200 ring-1 ring-fotoblue-400 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                      license === 'renewal_sent'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold">Renewal Sent</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Renewal link was sent to the client to reactivate coverage.
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

