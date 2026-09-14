/**
 * @file OperationalSlotsPicker.tsx
 * @description Date picker and PHT operational slot selection list for client onboarding sessions.
 */

import React from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Lock,
  AlertCircle,
  Info,
} from 'lucide-react';
import { OnboardingSlot, ScheduledSession } from '../../domain/onboarding/types';
import { formatDateDisplay } from '../../utils/date';

interface OperationalSlotsPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dayOfWeekIndex: number;
  slots: OnboardingSlot[];
  selectedSlot: OnboardingSlot | null;
  onSelectSlot: (slot: OnboardingSlot) => void;
  isLoadingSlots: boolean;
  isSlotBooked: (slotId: string) => boolean;
  getSlotBooking: (slotId: string) => ScheduledSession | undefined;
}

export const OperationalSlotsPicker: React.FC<OperationalSlotsPickerProps> = ({
  selectedDate,
  onSelectDate,
  dayOfWeekIndex,
  slots,
  selectedSlot,
  onSelectSlot,
  isLoadingSlots,
  isSlotBooked,
  getSlotBooking,
}) => {
  const getDayNotice = (day: number) => {
    if (day === 0) {
      return {
        text: 'Sunday Work Shift: First slot opens at 9:00 PM PHT.',
        variant: 'info',
      };
    }
    if (day === 5) {
      return {
        text: 'Friday Work Shift: Operational slots end at 4:00 AM - 5:00 AM PHT.',
        variant: 'info',
      };
    }
    if (day === 6) {
      return {
        text: 'Saturday: Off-Shift (Non-operational day). The next work shift begins Sunday at 9:00 PM PHT.',
        variant: 'off',
      };
    }
    return {
      text: 'Operational Shift Day: 4 daily support windows available.',
      variant: 'active',
    };
  };

  const dayNotice = getDayNotice(dayOfWeekIndex);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
      {/* 1. Date Picker */}
      <div>
        <label
          htmlFor="slot-date-picker"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
        >
          1. Select Date (Philippine Time)
        </label>
        <div className="relative">
          <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="slot-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm font-medium rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 cursor-pointer"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
          Selected:{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formatDateDisplay(selectedDate)}
          </span>
        </div>
      </div>

      {/* Operational Shift Banner for Selected Day */}
      <div
        className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
          dayNotice.variant === 'off'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{dayNotice.text}</span>
      </div>

      {/* 2. Operational Slots */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            2. Operational Slots (PHT)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {slots.length} {slots.length === 1 ? 'slot' : 'slots'} on this day
          </span>
        </div>

        {isLoadingSlots ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading available slots...
          </div>
        ) : slots.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              No operational slots for this date
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              The schedule runs from Sunday 9:00 PM through Friday 4:00 AM PHT.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => {
              const booked = isSlotBooked(slot.id);
              const bookingDetails = getSlotBooking(slot.id);
              const isSelected = selectedSlot?.id === slot.id;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => !booked && onSelectSlot(slot)}
                  disabled={booked}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    booked
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75 cursor-not-allowed'
                      : isSelected
                      ? 'bg-fotoblue-50/80 dark:bg-fotoblue-950/70 border-fotoblue-500 ring-2 ring-fotoblue-500/30 shadow-xs'
                      : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-fotoblue-300 dark:hover:border-fotoblue-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        booked
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : isSelected
                          ? 'bg-fotoblue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {booked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {slot.label} PHT
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {booked && bookingDetails ? (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            Booked: {bookingDetails.clientName}
                          </span>
                        ) : (
                          <span>Available for booking</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {booked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Booked
                      </span>
                    ) : isSelected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-fotoblue-600 text-white shadow-2xs">
                        Selected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Open
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
