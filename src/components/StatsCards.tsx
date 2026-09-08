/**
 * @file StatsCards.tsx
 * @description Dashboard summary cards component. Displays 5 metric cards for today's shift:
 * 1. Today's Shift Logs: Total interactions today + total overall count
 * 2. Solved: Count of solved interactions today + percentage resolved
 * 3. In Event: Count of interactions where client is at a live event
 * 4. Follow-Up / Waiting: Count of interactions needing follow-up or waiting for client update
 * 5. Channels: Split of calls vs chats today
 * 
 * The component filters interactions to today's date using `getTodayDateString()`, 
 * then computes various counts from the filtered list.
 */

import React, { useMemo } from 'react';
import { Interaction } from '../types';
import { CheckCircle2, Zap, PhoneCall, MessageSquare, Clock } from 'lucide-react';
import { calculateShiftMetrics } from '../domain';

/**
 * Props for the StatsCards component.
 * @interface StatsCardsProps
 */
interface StatsCardsProps {
  /**
   * The full array of all Interaction objects (not just today's).
   * @type {Interaction[]}
   */
  interactions: Interaction[];
}

/**
 * Dashboard summary cards component. 
 * Renders 5 metric cards computed from the provided interactions, filtered for the current day.
 * Wrapped in React.memo to prevent unnecessary re-renders when parent state changes
 * unrelated to the interactions array (e.g. modal open/close).
 * 
 * @component
 * @param {StatsCardsProps} props - The component props.
 * @param {Interaction[]} props.interactions - The full array of all Interaction objects.
 * @returns {JSX.Element} The rendered statistics cards grid.
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ interactions }) => {
  const stats = useMemo(() => calculateShiftMetrics(interactions as any), [interactions]);

  const { totalToday, solvedCount, resolutionRate, inEventCount, followUpCount, callCount, chatCount } = stats;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {/* Total Today */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-fotoblue-300 dark:hover:border-fotoblue-600 transition-colors">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Shift Logs</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalToday}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{interactions.length} total logged</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-600 dark:text-fotoblue-400 border border-fotoblue-200/60 dark:border-fotoblue-800/60 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Solved */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
        <div>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Solved</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{solvedCount}</p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">
            {resolutionRate}% resolved
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* In Event (Live Event Support) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-fotoblue-300 dark:hover:border-fotoblue-600 transition-colors">
        <div>
          <p className="text-xs font-bold text-fotoblue-700 dark:text-fotoblue-300 uppercase tracking-wider">In Event</p>
          <p className="text-2xl font-black text-fotoblue-900 dark:text-fotoblue-100 mt-1">{inEventCount}</p>
          <p className="text-[11px] text-fotoblue-600/80 dark:text-fotoblue-400/80 mt-0.5 font-medium">Live event support</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-600 dark:text-fotoblue-400 border border-fotoblue-200/60 dark:border-fotoblue-800/60 flex items-center justify-center">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* Pending Follow-up */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-600 transition-colors">
        <div>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Follow-Up / Waiting</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{followUpCount}</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium">Open items</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Channel Split */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1 flex items-center justify-between hover:border-fotodeep-300 dark:hover:border-fotodeep-600 transition-colors">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Channels</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm font-black text-fotoblue-700 dark:text-fotoblue-300">
              <PhoneCall className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" /> {callCount}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1 text-sm font-black text-fotodeep-600 dark:text-fotodeep-300">
              <MessageSquare className="w-3.5 h-3.5 text-fotodeep-500 dark:text-fotodeep-400" /> {chatCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Calls vs Chats</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fotoblue-50 to-fotodeep-50 dark:from-fotoblue-950/60 dark:to-fotodeep-950/60 text-fotoblue-600 dark:text-fotoblue-400 border border-fotoblue-200/60 dark:border-fotoblue-800/60 flex items-center justify-center">
          <MessageSquare className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
});
