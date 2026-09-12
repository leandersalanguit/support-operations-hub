/**
 * @file BooleanFieldToggle.tsx
 * @description Compact binary toggle control (Yes/No) with icon and label.
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface BooleanFieldToggleProps {
  label: string;
  icon: LucideIcon;
  value: boolean;
  onChange: (val: boolean) => void;
}

export const BooleanFieldToggle: React.FC<BooleanFieldToggleProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
}) => {
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <div className="flex bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded text-xs font-bold">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            value
              ? 'bg-fotoblue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            !value
              ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
};
