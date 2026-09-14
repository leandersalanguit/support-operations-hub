/**
 * @file OutreachMessageCard.tsx
 * @description Converted client local time preview, exact copyable outreach message template,
 * booking status alerts, and reference calendar booking action.
 */

import React from 'react';
import {
  Globe,
  Clock,
  Copy,
  Check,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { ConvertedTimeResult, OnboardingSlot } from '../../domain/onboarding/types';

interface OutreachMessageCardProps {
  convertedTime: ConvertedTimeResult | null;
  selectedSlot: OnboardingSlot | null;
  isSlotBooked: (slotId: string) => boolean;
  handleCopyMessage: () => Promise<boolean>;
  isMessageCopied: boolean;
  bookCurrentSlot: () => Promise<any>;
  isBooking: boolean;
  bookingError: string | null;
  bookingSuccessMessage: string | null;
}

export const OutreachMessageCard: React.FC<OutreachMessageCardProps> = ({
  convertedTime,
  selectedSlot,
  isSlotBooked,
  handleCopyMessage,
  isMessageCopied,
  bookCurrentSlot,
  isBooking,
  bookingError,
  bookingSuccessMessage,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            4. Converted Time & Outreach Message
          </h3>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-fotoblue-50 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800/80 font-mono font-medium">
          Auto-Converted
        </span>
      </div>

      {convertedTime ? (
        <>
          {/* Converted Time Display Pill */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                Client Local Time ({convertedTime.clientTimezoneName})
              </span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  {convertedTime.clientDate} at {convertedTime.clientTime}
                </span>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700/50">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                Philippine Time Reference
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-medium">
                {convertedTime.phtDateDisplay} ({convertedTime.phtTimeDisplay})
              </span>
            </div>
          </div>

          {/* Exact Copyable Message Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Client Message Template:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isMessageCopied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-fotoblue-600 hover:bg-fotoblue-500 text-white shadow-xs active:scale-95'
                }`}
              >
                {isMessageCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>

            {/* Message Quote Display */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line select-all font-medium">
              {convertedTime.copyableMessage}
            </div>
          </div>

          {/* Booking Button & Status Messages */}
          <div className="pt-2">
            {bookingError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccessMessage && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <span>{bookingSuccessMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={bookCurrentSlot}
              disabled={
                isBooking || !selectedSlot || isSlotBooked(selectedSlot.id)
              }
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-500 hover:to-fotodeep-500 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>
                {isBooking
                  ? 'Booking Slot on Reference Calendar...'
                  : 'Book Slot on Reference Calendar'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
          Select an operational slot on the left to preview the converted time and
          generate the copyable client message.
        </div>
      )}
    </div>
  );
};
