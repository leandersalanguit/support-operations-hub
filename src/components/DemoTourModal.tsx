/**
 * @file DemoTourModal.tsx
 * @description Accessible guide modal highlighting key interactive features
 * for visitors testing the Support Operations Hub demo sandbox.
 */

import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Shield, Users, RefreshCw } from 'lucide-react';

export interface DemoTourModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus close button on open
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 id="tour-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Scranton Operations Tour Guide
              </h3>
              <p className="text-xs text-slate-400">
                Key platform features to test during your demo shift:
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-400"
            aria-label="Close tour guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Points */}
        <div className="space-y-3.5 text-xs text-slate-300">
          {/* Item 1: RBAC */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-sky-500/30">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Role-Based Access Control (RBAC)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  Live Rule Engine
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Both <strong>Jim Halpert</strong> and <strong>Dwight Schrute</strong> are <strong>Support Agents</strong> with standard permissions (they can only edit their own logs). Try editing Dwight&apos;s log while logged in as Jim—you will be blocked! Switch to <strong>Michael Scott (Team Lead)</strong> to test full supervisor override powers.
              </p>
            </div>
          </div>

          {/* Item 2: CRM Autocomplete */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-emerald-500/30">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Live CRM Client Autocomplete</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Instant Lookup
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Type <em>&quot;Vance&quot;</em> (Bob Vance, Vance Refrigeration) or <em>&quot;Dunder&quot;</em> into the Client Phone/Account input on the form. Watch the system automatically pull up past logs, phone records, and owned products.
              </p>
            </div>
          </div>

          {/* Item 3: Reset */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-amber-500/30">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>One-Click Safe Reset</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  In-Memory Store
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Feel free to add calls, edit client notes, or delete records. Clicking <strong>&quot;Reset Demo&quot;</strong> in the top control bar restores the original pristine sample dataset in under 100ms without touching any remote database.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md active:scale-98 focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Got it, let&apos;s explore!
        </button>
      </div>
    </div>
  );
};
