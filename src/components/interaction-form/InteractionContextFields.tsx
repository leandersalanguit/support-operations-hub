import React from 'react';
import { FieldErrors, Control, Controller } from 'react-hook-form';
import { Zap, Sparkles, Check } from 'lucide-react';
import { InteractionFormInputs } from '../InteractionForm';
import { LicenseSelector } from '../common';
import { SupportTier } from '../../infrastructure/supabase/configRepo';

interface InteractionContextFieldsProps {
  control: Control<InteractionFormInputs>;
  errors: FieldErrors<InteractionFormInputs>;
  supportTiers?: SupportTier[];
  compact?: boolean;
}

export const InteractionContextFields: React.FC<InteractionContextFieldsProps> = ({
  control,
  errors,
  supportTiers,
  compact = false,
}) => {
  return (
    <>
      {/* Support License / Eligibility */}
      <Controller
        name="license"
        control={control}
        rules={{
          required: 'Please select a support license option',
        }}
        render={({ field }) => (
          <LicenseSelector
            license={field.value}
            supportTiers={supportTiers}
            onChangeLicense={(val) => field.onChange(val)}
            error={errors.license?.message}
            compact={compact}
          />
        )}
      />

      {/* In Event */}
      <Controller
        name="inEvent"
        control={control}
        rules={{
          validate: (val) => val !== null || 'Please select Yes or No',
        }}
        render={({ field }) => (
          <div>
            <div
              className={`${compact ? 'p-3 flex flex-col justify-between' : 'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'} rounded-xl border bg-white dark:bg-slate-800 transition-all ${
                errors.inEvent
                  ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                  : field.value === true
                  ? 'border-fotoblue-400 bg-fotoblue-50/50 dark:bg-fotoblue-950/40 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`flex items-center ${compact ? 'justify-between mb-2 gap-2' : 'gap-3'}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg ${
                      field.value === true
                        ? 'bg-fotoblue-600 text-white shadow-xs'
                        : field.value === false
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Zap className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span>In Event</span>
                      <span className="text-rose-500">*</span>
                    </p>
                    <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-500 dark:text-slate-400`}>
                      {compact ? 'Live active event' : 'Is the customer currently at a live, active event?'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${compact ? 'grid grid-cols-2 gap-1.5' : 'flex items-center gap-2 sm:w-48'} bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold shrink-0`}>
                <button
                  type="button"
                  onClick={() => field.onChange(true)}
                  className={`${compact ? 'py-1.5' : 'flex-1 py-2'} rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    field.value === true
                      ? 'bg-fotoblue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(false)}
                  className={`${compact ? 'py-1.5' : 'flex-1 py-2'} rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    field.value === false
                      ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>No</span>
                </button>
              </div>
            </div>
            {errors.inEvent && (
              <p className={`${compact ? 'text-[10px] mt-1.5' : 'text-[11px] px-1 mt-1'} text-rose-600 dark:text-rose-400 font-semibold`}>
                {errors.inEvent.message}
              </p>
            )}
          </div>
        )}
      />

      {/* First Time User */}
      <Controller
        name="firstTimeUser"
        control={control}
        rules={{
          validate: (val) => val !== null || 'Please select Yes or No',
        }}
        render={({ field }) => (
          <div>
            <div
              className={`${compact ? 'p-3 flex flex-col justify-between' : 'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'} rounded-xl border bg-white dark:bg-slate-800 transition-all ${
                errors.firstTimeUser
                  ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                  : field.value === true
                  ? 'border-fotoblue-300 dark:border-fotoblue-700 bg-fotoblue-50/30 dark:bg-fotoblue-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`flex items-center ${compact ? 'justify-between mb-2 gap-2' : 'gap-3'}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg ${
                      field.value === true
                        ? 'bg-fotoblue-100 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300'
                        : field.value === false
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Sparkles className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span>First Time User</span>
                      <span className="text-rose-500">*</span>
                    </p>
                    <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-500 dark:text-slate-400`}>
                      {compact ? 'First time using product' : "Is this the customer's first time using or configuring this product?"}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${compact ? 'grid grid-cols-2 gap-1.5' : 'flex items-center gap-2 sm:w-48'} bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold shrink-0`}>
                <button
                  type="button"
                  onClick={() => field.onChange(true)}
                  className={`${compact ? 'py-1.5' : 'flex-1 py-2'} rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    field.value === true
                      ? 'bg-fotoblue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(false)}
                  className={`${compact ? 'py-1.5' : 'flex-1 py-2'} rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    field.value === false
                      ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>No</span>
                </button>
              </div>
            </div>
            {errors.firstTimeUser && (
              <p className={`${compact ? 'text-[10px] mt-1.5' : 'text-[11px] px-1 mt-1'} text-rose-600 dark:text-rose-400 font-semibold`}>
                {errors.firstTimeUser.message}
              </p>
            )}
          </div>
        )}
      />
    </>
  );
};
