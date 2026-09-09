import React from 'react';
import { UseFormRegister, FieldErrors, Control, Controller } from 'react-hook-form';
import { Calendar, User } from 'lucide-react';
import { InteractionFormInputs } from '../InteractionForm';
import { ClientRecord } from '../../types';
import { UserRole } from '../../domain';
import { ClientAutocompleteInput } from '../common';
import { getTodayDateString } from '../../utils/date';

interface InteractionGeneralFieldsProps {
  register: UseFormRegister<InteractionFormInputs>;
  control: Control<InteractionFormInputs>;
  errors: FieldErrors<InteractionFormInputs>;
  dayOfWeek: string;
  agentName?: string;
  userRole?: UserRole;
  clients?: ClientRecord[];
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectClientSuggestion: (client: ClientRecord) => void;
  compact?: boolean;
}

export const InteractionGeneralFields: React.FC<InteractionGeneralFieldsProps> = ({
  register,
  control,
  errors,
  dayOfWeek,
  agentName,
  userRole,
  clients,
  onDateChange,
  onSelectClientSuggestion,
  compact = false,
}) => {
  return (
    <>
      {/* Date & Day */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
            <span>Date & Day of Interaction</span>
          </span>
          <span className="text-rose-500 font-bold">*</span>
        </label>
        <div
          className={`flex rounded-xl border bg-white dark:bg-slate-800 overflow-hidden shadow-2xs ${
            errors.date
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50'
              : 'border-slate-300 dark:border-slate-600 focus-within:ring-2 focus-within:ring-fotoblue-500 focus-within:border-fotoblue-500'
          }`}
        >
          <input
            type="date"
            max={getTodayDateString()}
            {...register('date', {
              required: 'Date is required',
              validate: (val) => val <= getTodayDateString() || 'Future dates are not allowed',
            })}
            onChange={onDateChange}
            className={`w-1/2 px-3 ${compact ? 'py-2' : 'py-2.5'} text-sm text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none`}
          />
          <div className={`w-1/2 px-3 ${compact ? 'py-2' : 'py-2.5'} text-sm font-semibold text-fotoblue-900 dark:text-fotoblue-200 bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border-l border-slate-200 dark:border-slate-700 flex items-center justify-center select-none`}>
            {dayOfWeek || 'Select date'}
          </div>
        </div>
        {errors.date && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.date.message}</p>
        )}
      </div>

      {/* Support Agent */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
            <span>{compact ? 'Agent' : 'Support Agent'}</span>
          </span>
          {userRole === 'team_lead' ? (
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              Team Lead (Editable)
            </span>
          ) : agentName ? (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Verified
            </span>
          ) : (
            <span className="text-rose-500 font-bold">*</span>
          )}
        </label>
        <input
          type="text"
          placeholder={compact ? 'e.g. Alex' : 'e.g. Alex M.'}
          readOnly={Boolean(agentName && userRole !== 'team_lead')}
          {...register('agent', {
            required: 'Agent name is required',
            validate: (val) => (val && val.trim().length > 0) || 'Agent name is required',
          })}
          className={`w-full ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} text-sm border rounded-xl shadow-2xs focus:outline-none ${
            agentName && userRole !== 'team_lead'
              ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed border-slate-200 dark:border-slate-700'
              : errors.agent
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100'
              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
          }`}
        />
        {errors.agent && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.agent.message}</p>
        )}
      </div>

      {/* Client Name / Company */}
      <Controller
        name="clientName"
        control={control}
        rules={{
          required: 'Client name is required',
          validate: (val) => (val && val.trim().length > 0) || 'Client name is required',
        }}
        render={({ field }) => (
          <ClientAutocompleteInput
            value={field.value}
            onChange={(val) => field.onChange(val)}
            onSelectClient={(client) => onSelectClientSuggestion(client as any)}
            clients={clients as any}
            error={errors.clientName?.message}
          />
        )}
      />
    </>
  );
};
