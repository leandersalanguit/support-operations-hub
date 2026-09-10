import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FileText } from 'lucide-react';
import { InteractionFormInputs } from '../InteractionForm';

interface InteractionNotesFieldProps {
  register: UseFormRegister<InteractionFormInputs>;
  errors: FieldErrors<InteractionFormInputs>;
  compact?: boolean;
}

export const InteractionNotesField: React.FC<InteractionNotesFieldProps> = ({
  register,
  errors,
  compact = false,
}) => {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>{compact ? 'Additional Notes' : 'Additional Notes & Troubleshooting Details'}</span>
        </span>
        <span className="text-rose-500 font-bold">*</span>
      </label>
      <textarea
        rows={compact ? 3 : 4}
        placeholder={compact ? 'Enter interaction notes, troubleshooting steps, or follow-up details...' : 'Enter interaction notes, issue description, troubleshooting steps taken, and resolution or follow-up details...'}
        {...register('additionalNotes', {
          required: 'Additional notes / summary is required',
          validate: (val) => (val && val.trim().length > 0) || 'Additional notes / summary is required',
        })}
        className={`w-full ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3'} text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none resize-y placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          errors.additionalNotes
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
        }`}
      />
      {errors.additionalNotes && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {errors.additionalNotes.message}
        </p>
      )}
    </div>
  );
};
