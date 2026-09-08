/**
 * @file Navbar.tsx
 * @description Top navigation bar component. Displays brand title, mobile menu trigger,
 * a live clock, and Supabase synchronization status badges.
 */

import React, { useState, useEffect } from 'react';
import { Clock, Cloud, RefreshCw, AlertCircle, Menu, LogOut, Moon, Sun } from 'lucide-react';
import { Interaction } from '../types';

/**
 * Isolated live clock component.
 * Updates every second but only re-renders its own tiny DOM subtree,
 * not the entire Navbar or its children.
 */
const LiveClock: React.FC = React.memo(() => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{currentTime}</span>;
});

/**
 * Props for the Navbar component.
 */
export interface NavbarProps {
  /** Array of all current interactions, used for data export functionalities. */
  interactions: Interaction[];
  /** Currently logged in agent name */
  agentName?: string;
  /** Role of currently logged in user ('team_lead' | 'support_agent') */
  userRole?: string;
  /** Whether the app is currently running in interactive demo mode */
  isDemo?: boolean;
  /** Supabase cloud sync status */
  syncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  /** Number of items currently pending cloud sync */
  pendingSyncCount?: number;
  /** Callback triggered to retry processing pending sync items */
  onRetrySync?: () => void;
  /** Current active theme mode */
  theme?: 'light' | 'dark';
  /** Callback triggered when dark/light mode toggle button is clicked */
  onToggleTheme?: () => void;
  /** Callback triggered to reset interactions back to sample data. */
  onResetSampleData: () => void;
  /** Callback triggered to clear all interaction logs. */
  onClearAll: () => void;
  /** Callback triggered when mobile hamburger menu button is clicked */
  onToggleSidebar?: () => void;
  /** Callback triggered when sign out button is clicked */
  onSignOut?: () => void;
}

/**
 * Top navigation bar component.
 * Displays app branding, active tab info, current time, cloud sync status, and theme toggle.
 * Wrapped in React.memo to prevent unnecessary re-renders from parent state changes.
 */
export const Navbar: React.FC<NavbarProps> = React.memo(
  ({
    interactions: _interactions,
    agentName,
    userRole,
    isDemo = false,
    syncStatus = 'connected',
    pendingSyncCount = 0,
    onRetrySync,
    theme = 'light',
    onToggleTheme,
    onResetSampleData: _onResetSampleData,
    onClearAll: _onClearAll,
    onToggleSidebar,
    onSignOut,
  }) => {
    const isDark = theme === 'dark';

    return (
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left branding: Mobile toggle button & app title */}
            <div className="flex items-center space-x-3">
              {/* Mobile hamburger menu toggle button */}
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 cursor-pointer"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo / Brand link */}
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                      Support Shift Hub
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isDemo
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60'
                        : 'bg-fotoblue-100 dark:bg-fotoblue-950/80 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200/60 dark:border-fotoblue-800/60'
                    }`}>
                      {isDemo ? 'Demo Preview' : 'v2.0'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live Shift Interaction Tracker
                  </span>
                </div>
              </div>
            </div>

            {/* Right actions: Theme Toggle, Cloud Sync, Live Clock, Agent Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Theme Toggle Button */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer transition-all shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-fotoblue-400"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600 animate-fadeIn" />
                  )}
                </button>
              )}

              {/* Pending Sync Queue Badge (clickable if onRetrySync provided) */}
              {!isDemo && pendingSyncCount > 0 && (
                <button
                  onClick={onRetrySync}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300/80 dark:border-amber-700/80 shadow-2xs hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-all"
                  title={`${pendingSyncCount} pending offline log(s). Click to sync to cloud now.`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{pendingSyncCount} Pending Sync</span>
                </button>
              )}

              {/* Cloud Sync vs Demo Badge */}
              {isDemo ? (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200/80 dark:border-amber-800/60 shadow-2xs"
                  title="Running in local interactive demo mode without Supabase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Local Demo</span>
                </div>
              ) : (
                <>
                  {pendingSyncCount === 0 && syncStatus === 'connected' && (
                    <div
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs"
                      title="Connected to Supabase Realtime Database"
                    >
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Cloud Sync
                      </span>
                    </div>
                  )}
                  {pendingSyncCount === 0 && syncStatus === 'syncing' && (
                    <div
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/40 text-fotoblue-700 dark:text-fotoblue-300 text-xs font-semibold border border-fotoblue-200/80 dark:border-fotoblue-800/60 shadow-2xs"
                      title="Syncing with Supabase..."
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                  {pendingSyncCount === 0 && syncStatus === 'error' && (
                    <button
                      onClick={onRetrySync}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200/80 dark:border-rose-800/60 shadow-2xs hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                      title="Sync error - click to retry connection"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Sync Error (Retry)</span>
                    </button>
                  )}
                  {pendingSyncCount === 0 && syncStatus === 'offline' && (
                    <div
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200/80 dark:border-amber-800/60 shadow-2xs"
                      title="Running in offline local mode"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Local Only</span>
                    </div>
                  )}
                </>
              )}

              {/* Live Clock Badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono font-medium border border-slate-200/80 dark:border-slate-700/80">
                <Clock className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                <LiveClock />
              </div>

              {/* Logged in Agent Badge & Sign Out */}
              {agentName && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                    title={`Signed in as ${agentName} (${userRole === 'team_lead' ? 'Team Lead' : 'Support Agent'})`}
                  >
                    <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${
                      userRole === 'team_lead' ? 'bg-fotodeep-800 dark:bg-fotodeep-700' : 'bg-fotoblue-600'
                    }`}>
                      {agentName.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] sm:max-w-[140px] truncate">{agentName}</span>
                    {userRole === 'team_lead' && (
                      <span className="ml-1 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-fotodeep-100 dark:bg-fotodeep-900/60 text-fotodeep-900 dark:text-fotodeep-200 border border-fotodeep-300 dark:border-fotodeep-700">
                        Lead
                      </span>
                    )}
                  </div>

                  {onSignOut && (
                    <button
                      onClick={onSignOut}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200/80 dark:border-rose-800/60 hover:border-rose-600 dark:hover:border-rose-600 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }
);

