/**
 * @file ClientPhoneDisplay.tsx
 * @description Formats contact numbers cleanly with primary phone, copy-to-clipboard,
 * and an outside-click expandable popover when a client has multiple phone numbers.
 */

import React, { useState, useRef } from 'react';
import { Copy, Check, ChevronDown, X } from 'lucide-react';
import { useClickOutside } from '../common';

export interface ClientPhoneDisplayProps {
  phones: string[];
  copiedPhone: string | null;
  onCopyPhone: (phone: string) => void;
}

export const ClientPhoneDisplay: React.FC<ClientPhoneDisplayProps> = ({
  phones,
  copiedPhone,
  onCopyPhone,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setIsOpen(false), {
    enabled: isOpen,
    closeOnEscape: true,
  });

  if (phones.length === 0) {
    return <span className="text-xs text-slate-400 italic">No phone number</span>;
  }

  const primary = phones[0];
  const extras = phones.slice(1);

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative" ref={ref}>
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200">
        <span>{primary}</span>
        <button
          type="button"
          onClick={() => onCopyPhone(primary)}
          className="text-slate-400 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 cursor-pointer p-0.5 transition-colors"
          title="Copy phone number"
        >
          {copiedPhone === primary ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {extras.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isOpen
                ? 'bg-fotoblue-50 dark:bg-fotoblue-950/70 border-fotoblue-400 text-fotoblue-800 dark:text-fotoblue-200'
                : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title={`View ${extras.length} more phone numbers`}
          >
            <span>+{extras.length} more</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-1.5 animate-fadeIn">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span>Other Numbers ({extras.length})</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                {extras.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 text-xs"
                  >
                    <span className="font-mono text-slate-800 dark:text-slate-200">{p}</span>
                    <button
                      type="button"
                      onClick={() => onCopyPhone(p)}
                      className="text-slate-400 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 cursor-pointer p-0.5"
                      title="Copy number"
                    >
                      {copiedPhone === p ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
