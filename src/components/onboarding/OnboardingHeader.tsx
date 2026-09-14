/**
 * @file OnboardingHeader.tsx
 * @description Top header banner for the Onboarding Scheduler dashboard,
 * displaying page title, live PHT clock, and operational shift notice.
 */

import React, { useState, useEffect } from 'react';
import { CalendarCheck, ArrowLeft, Clock, Info } from 'lucide-react';

interface OnboardingHeaderProps {
  onNavigateToSummary?: () => void;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  onNavigateToSummary,
}) => {
  const [currentPhtTime, setCurrentPhtTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now);
        setCurrentPhtTime(`${formatted} PHT (UTC+8)`);
      } catch {
        setCurrentPhtTime('');
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          {onNavigateToSummary && (
            <button
              type="button"
              onClick={onNavigateToSummary}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mr-1"
              title="Back to Shift Summary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fotoblue-600 to-fotodeep-600 flex items-center justify-center text-white shadow-xs">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Client Onboarding Scheduler
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Philippine Time (PHT, UTC+8) operational schedule & client timezone converter
            </p>
          </div>
        </div>
      </div>

      {/* Live Philippine Time Clock & Shift Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 border border-fotoblue-200/70 dark:border-fotoblue-900 text-fotoblue-800 dark:text-fotoblue-300 text-xs font-mono font-semibold">
          <Clock className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />
          <span>{currentPhtTime || 'Loading PHT clock...'}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Shift: Sun 9PM - Fri 4AM PHT</span>
        </div>
      </div>
    </div>
  );
};
