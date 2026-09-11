/**
 * @file ClassificationSelector.tsx
 * @description Reusable case classification selector component with support category taxonomy.
 * Uses a semantic, accessible native HTML select element with custom styling to ensure
 * fast type-ahead keyboard navigation, zero popover clipping, and full mobile accessibility.
 */

import React from 'react';
import { Layers, ChevronDown } from 'lucide-react';

export interface ClassificationSelectorProps {
  value: string;
  onChange: (val: string) => void;
  classifications: string[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const ClassificationSelector: React.FC<ClassificationSelectorProps> = React.memo(({
  value,
  onChange,
  classifications,
  error,
  required = true,
  disabled = false,
}) => {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="case-classification-select"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>Case Classification</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      </div>

      <div className="relative">
        <select
          id="case-classification-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3.5 pr-9 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none cursor-pointer appearance-none transition-colors ${
            !value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
          } ${
            error
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            -- Select Case Classification --
          </option>
          {classifications.map((c) => (
            <option
              key={c}
              value={c}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
            >
              {c}
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
