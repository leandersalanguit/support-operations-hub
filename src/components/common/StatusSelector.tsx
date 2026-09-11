/**
 * @file StatusSelector.tsx
 * @description Reusable interaction status selector component with color-coded status indicator.
 * Uses a semantic, accessible native HTML select element with custom styling to ensure
 * fast type-ahead keyboard navigation, zero popover clipping, and full mobile accessibility.
 */

import React, { useMemo } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { StatusType, STATUS_OPTIONS } from '../../domain/interaction/types';

export interface StatusSelectorProps {
  value: StatusType | string;
  onChange: (val: StatusType) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export const StatusSelector: React.FC<StatusSelectorProps> = React.memo(({
  value,
  onChange,
  error,
  required = true,
  disabled = false,
  label = 'Interaction Status',
}) => {
  const selectedOption = useMemo(() => {
    return STATUS_OPTIONS.find((opt) => opt.label === value) || null;
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="interaction-status-select"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      </div>

      <div className="relative">
        {selectedOption && (
          <span
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${selectedOption.dotColor} pointer-events-none`}
            aria-hidden="true"
          />
        )}
        <select
          id="interaction-status-select"
          value={value}
          onChange={(e) => onChange(e.target.value as StatusType)}
          disabled={disabled}
          className={`w-full ${selectedOption ? 'pl-8' : 'px-3.5'} pr-9 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none cursor-pointer appearance-none transition-colors ${
            !value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
          } ${
            error
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            -- Select Status --
          </option>
          {STATUS_OPTIONS.map((opt) => (
            <option
              key={opt.label}
              value={opt.label}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
});
