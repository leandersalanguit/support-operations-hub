import React from 'react';
import { UseFormRegister, FieldErrors, Control, Controller, UseFormSetValue, UseFormClearErrors } from 'react-hook-form';
import { Phone, MessageSquare } from 'lucide-react';
import { InteractionFormInputs } from '../InteractionForm';
import { ClientRecord } from '../../types';
import { PhoneNumberField } from '../common';
import { validatePhoneNumber } from '../../domain';

interface InteractionChannelFieldsProps {
  register: UseFormRegister<InteractionFormInputs>;
  control: Control<InteractionFormInputs>;
  setValue: UseFormSetValue<InteractionFormInputs>;
  clearErrors: UseFormClearErrors<InteractionFormInputs>;
  errors: FieldErrors<InteractionFormInputs>;
  channel: 'Call' | 'Chat';
  helpdeskName: string;
  matchedClient: ClientRecord | null;
  clientPhoneNumbers: string[];
  suppressPhoneEmptyErrorRef: React.MutableRefObject<boolean>;
  compact?: boolean;
}

export const InteractionChannelFields: React.FC<InteractionChannelFieldsProps> = ({
  register,
  control,
  setValue,
  clearErrors,
  errors,
  channel,
  helpdeskName,
  matchedClient,
  clientPhoneNumbers,
  suppressPhoneEmptyErrorRef,
  compact = false,
}) => {
  return (
    <>
      {/* Channel Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{compact ? 'Channel' : 'Channel Type'}</span>
          <span className="text-rose-500 font-bold">*</span>
        </label>
        <div className={`grid grid-cols-2 ${compact ? 'gap-2 p-1' : 'gap-3 p-1.5'} bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/40 dark:border-slate-700/80 rounded-xl`}>
          <button
            type="button"
            onClick={() => setValue('channel', 'Call', { shouldValidate: true })}
            className={`flex items-center justify-center gap-2 ${compact ? 'py-2 px-3' : 'py-2.5 px-4'} rounded-lg text-sm font-bold transition-all cursor-pointer ${
              channel === 'Call'
                ? 'bg-white dark:bg-slate-800 text-fotoblue-700 dark:text-fotoblue-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
            }`}
          >
            <Phone className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
            <span>{compact ? 'Call' : 'Call (Phone)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setValue('channel', 'Chat', { shouldValidate: true })}
            className={`flex items-center justify-center gap-2 ${compact ? 'py-2 px-3' : 'py-2.5 px-4'} rounded-lg text-sm font-bold transition-all cursor-pointer ${
              channel === 'Chat'
                ? 'bg-white dark:bg-slate-800 text-fotodeep-600 dark:text-fotodeep-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-fotodeep-500 dark:text-fotodeep-400" />
            <span>{compact ? 'Chat' : `Chat (${helpdeskName})`}</span>
          </button>
        </div>
      </div>

      {/* Channel Details */}
      <div className={compact ? 'md:col-span-2' : ''}>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Channel Details ({channel === 'Call' ? 'Phone Number' : (compact ? helpdeskName : `${helpdeskName} Ticket / Link`)})</span>
          <span className="text-rose-500 font-bold">*</span>
        </label>

        {channel === 'Chat' ? (
          <div>
            <div className="flex gap-2">
              <div className="flex items-center px-3.5 bg-fotodeep-50 dark:bg-fotodeep-950/60 border border-fotodeep-200 dark:border-fotodeep-800 rounded-xl text-fotodeep-700 dark:text-fotodeep-300 text-xs font-bold whitespace-nowrap">
                {helpdeskName}
              </div>
              <input
                type="text"
                placeholder={compact ? `Ticket ID or Link (Optional - defaults to '${helpdeskName}')` : `Ticket ID or Link (Optional - defaults to '${helpdeskName}')`}
                {...register('chatTicketDetail')}
                className={`w-full ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xs focus:ring-2 focus:ring-fotodeep-500 focus:border-fotodeep-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500`}
              />
            </div>
            <p className={`text-[11px] text-slate-500 dark:text-slate-400 ${compact ? 'mt-1' : 'mt-1.5'}`}>
              Automatically logged as <strong>{helpdeskName}</strong> if {compact ? 'specific ' : ''}ticket ID is left blank.
            </p>
          </div>
        ) : (
          <Controller
            name="phoneDetail"
            control={control}
            rules={{
              validate: (val) => {
                if (channel === 'Call') {
                  if (suppressPhoneEmptyErrorRef.current && (!val || !val.trim())) {
                    return true;
                  }
                  const res = validatePhoneNumber(val);
                  if (!res.isValid) return res.error;
                }
                return true;
              },
            }}
            render={({ field }) => (
              <PhoneNumberField
                value={field.value}
                onChange={(val) => {
                  if (val) {
                    suppressPhoneEmptyErrorRef.current = false;
                  }
                  field.onChange(val);
                }}
                onBlur={field.onBlur}
                onStartNewNumber={() => {
                  suppressPhoneEmptyErrorRef.current = true;
                  clearErrors('phoneDetail');
                }}
                matchedClient={matchedClient as any}
                clientPhoneNumbers={clientPhoneNumbers}
                error={errors.phoneDetail?.message}
              />
            )}
          />
        )}
      </div>
    </>
  );
};
