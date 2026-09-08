/**
 * @file DemoBanner.tsx
 * @description Encapsulated UI banner displayed during interactive Demo / Guest mode.
 * Houses persona switching, demo data reset, and exit controls, keeping core application
 * shells free of demo-specific business logic.
 */

import React, { useState } from 'react';
import { Sparkles, RefreshCw, LogOut, ChevronDown, Check, UserCheck } from 'lucide-react';
import { MOCK_DEMO_PERSONAS, getMockPersonaById } from '../data/mockDemoData';

export interface DemoBannerProps {
  /** The currently active demo persona ID */
  activePersonaId?: string;
  /** Callback to switch between demo personas */
  onSwitchPersona: (personaId: string) => void;
  /** Callback to restore default demo data */
  onResetDemoData: () => void;
  /** Callback to exit demo mode and return to sign in */
  onExitDemo: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  activePersonaId = 'jim-halpert',
  onSwitchPersona,
  onResetDemoData,
  onExitDemo,
}) => {
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const activePersona = getMockPersonaById(activePersonaId);

  const handleReset = () => {
    setIsResetting(true);
    onResetDemoData();
    setTimeout(() => setIsResetting(false), 600);
  };

  return (
    <aside
      aria-label="Demo mode active notice"
      className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-md border-b border-amber-600/30 z-40 px-3.5 py-2 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs font-medium">
        {/* Left: Persona status badge */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs font-bold uppercase tracking-wider text-[10px] text-white">
            <Sparkles className="w-3 h-3 text-amber-200" />
            Interactive Preview
          </span>
          <span className="text-amber-100 hidden md:inline">&bull;</span>
          <span className="text-white">
            Exploring as{' '}
            <strong className="font-bold underline decoration-white/40 underline-offset-2">
              {activePersona.name}
            </strong>{' '}
            <span className="opacity-90">({activePersona.roleTitle})</span>
          </span>
        </div>

        {/* Right: Quick persona switcher, reset data, and exit buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPersonaMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer ring-1 ring-white/30"
              title="Switch Demo Persona"
              aria-expanded={isPersonaMenuOpen}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-200" />
              <span>Switch Persona</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isPersonaMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPersonaMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-50"
                  onClick={() => setIsPersonaMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Select Persona & Role
                  </div>
                  {MOCK_DEMO_PERSONAS.map((persona) => {
                    const isSelected = persona.id === activePersona.id;
                    return (
                      <button
                        key={persona.id}
                        onClick={() => {
                          onSwitchPersona(persona.id);
                          setIsPersonaMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ${
                            persona.role === 'team_lead' ? 'bg-fotodeep-700' : 'bg-fotoblue-600'
                          }`}
                        >
                          {persona.avatarLetter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs truncate">{persona.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {persona.roleTitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Reset Demo Data */}
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer ring-1 ring-white/30 disabled:opacity-50"
            title="Reset to initial mock logs and CRM records"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-200 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>

          {/* Exit Demo */}
          <button
            onClick={onExitDemo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/35 text-white font-semibold transition-colors cursor-pointer ring-1 ring-white/30"
            title="Exit Demo Mode and return to Sign In screen"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-200" />
            <span>Exit Demo</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
