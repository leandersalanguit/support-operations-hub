/**
 * @file DemoBanner.tsx
 * @description Encapsulated UI banner displayed during interactive Demo / Guest mode.
 * Houses persona switching, demo data reset, tour guide, and exit controls, keeping
 * core application shells free of demo-specific business logic.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, LogOut, ChevronDown, Check, Users, HelpCircle, CheckCircle2 } from 'lucide-react';
import { MOCK_DEMO_PERSONAS, getMockPersonaById } from '../data/mockDemoData';
import { DemoTourModal } from './DemoTourModal';

export interface DemoBannerProps {
  /** The currently active demo persona ID */
  activePersonaId?: string;
  /** Callback to switch between demo personas */
  onSwitchPersona: (personaId: string) => void;
  /** Callback to restore default demo data */
  onResetDemoData: () => void;
  /** Callback to exit demo mode and return to sign in */
  onExitDemo: () => void;
  /** Optional callback or override for opening tour guide */
  onOpenTour?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  activePersonaId = 'jim-halpert',
  onSwitchPersona,
  onResetDemoData,
  onExitDemo,
  onOpenTour,
}) => {
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const activePersona = getMockPersonaById(activePersonaId);

  // Close persona dropdown on escape key
  useEffect(() => {
    if (!isPersonaMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPersonaMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPersonaMenuOpen]);

  const handleReset = () => {
    setIsResetting(true);
    setResetSuccess(false);
    onResetDemoData();
    setTimeout(() => {
      setIsResetting(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2000);
    }, 500);
  };

  const handleOpenTour = () => {
    if (onOpenTour) {
      onOpenTour();
    } else {
      setIsTourModalOpen(true);
    }
  };

  return (
    <>
      <aside
        aria-label="Interactive Demo Control Bar"
        className="bg-slate-900/95 dark:bg-slate-900/95 text-slate-100 border-b border-slate-800 shadow-xs z-40 px-3 sm:px-4 py-2 transition-colors"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs font-medium">
          
          {/* Left: Interactive Demo Live Badge & Active Persona */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold tracking-wide text-[11px]">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Interactive Demo</span>
              <span className="text-sky-400/40 hidden md:inline">&bull;</span>
              <span className="text-[10px] text-sky-200/80 font-mono hidden md:inline">In-Memory Sandbox</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400 hidden lg:inline">Clocked in as:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-medium shadow-2xs">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                    activePersona.role === 'team_lead' ? 'bg-emerald-600' : 'bg-sky-500'
                  }`}
                >
                  {activePersona.avatarLetter}
                </span>
                <span className="font-semibold text-white">{activePersona.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                    activePersona.role === 'team_lead'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-sky-950 text-sky-300 border-sky-800'
                  }`}
                >
                  {activePersona.roleTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Persona Switcher, Tour Guide, Reset, Exit */}
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            
            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPersonaMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-200 hover:text-white font-semibold transition-all cursor-pointer border border-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-sky-400"
                title="Switch Demo Persona"
                aria-expanded={isPersonaMenuOpen}
                aria-haspopup="menu"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch Character</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isPersonaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPersonaMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPersonaMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-80 sm:w-84 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/90 p-2 z-50 animate-fadeIn"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between mb-1">
                      <span>Scranton Branch Staff</span>
                      <span className="text-sky-400 font-mono text-[9px]">Click to Swap</span>
                    </div>

                    <div className="space-y-1">
                      {MOCK_DEMO_PERSONAS.map((persona) => {
                        const isSelected = persona.id === activePersona.id;
                        return (
                          <button
                            key={persona.id}
                            role="menuitem"
                            onClick={() => {
                              onSwitchPersona(persona.id);
                              setIsPersonaMenuOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer group ${
                              isSelected
                                ? 'bg-sky-950/60 border border-sky-800/80 text-white'
                                : 'hover:bg-slate-800/80 border border-transparent text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5 shadow-md ${
                                persona.role === 'team_lead' ? 'bg-emerald-600' : 'bg-sky-500'
                              }`}
                            >
                              {persona.avatarLetter}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <div>
                                  <span className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                                    {persona.name}
                                  </span>
                                  {persona.characterTitle && (
                                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                                      {persona.characterTitle}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                                      persona.role === 'team_lead'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                        : 'bg-sky-950 text-sky-300 border-sky-800'
                                    }`}
                                  >
                                    {persona.roleTitle}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                                {persona.quote}
                              </p>
                              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                Role: {persona.permissionSummary}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tour & Test Guide */}
            <button
              onClick={handleOpenTour}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 hover:text-sky-100 font-semibold transition-all cursor-pointer border border-sky-800/80 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-sky-400"
              title="Learn about testable features (RBAC permissions, CRM search, offline sync)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Tour Guide</span>
            </button>

            {/* Reset Demo Data */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-sky-400 ${
                resetSuccess
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white border-slate-700'
              }`}
              title="Reset mock shift logs and CRM client data"
            >
              {resetSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reset Done!</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isResetting ? 'animate-spin text-sky-400' : ''}`} />
                  <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
                </>
              )}
            </button>

            {/* Exit Demo */}
            <button
              onClick={onExitDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 font-semibold transition-all cursor-pointer border border-slate-700 hover:border-rose-800/70 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-rose-400"
              title="Exit Demo Mode and return to Sign In screen"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400" />
              <span>Exit Demo</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Internal Tour Guide Modal if triggered from banner */}
      <DemoTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </>
  );
};
