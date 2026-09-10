/**
 * @file AuthModal.tsx
 * @description Authentication modal and gatekeeper screen for Support Operations Hub.
 * Handles agent sign-in, guest interactive demo preview, and forces first-time password resets for temporary accounts.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { supabase, isSupabaseConfigured } from '../infrastructure/supabase/client';
import { formatAgentDisplayName, normalizeAuthEmail } from '../domain';
import { checkMustChangePassword } from '../application/useAuthWorkflow';
import { checkPasswordBreach } from '../utils/passwordSecurity';
import { MOCK_DEMO_PERSONAS } from '../data/mockDemoData';

interface AuthModalProps {
  /** The current user object if authenticated but requiring a password change */
  user?: SupabaseUser | null;
  /** Whether the user is currently flagged as requiring a password change */
  isPasswordChangeRequired?: boolean;
  /** Callback when authentication or password update is completed successfully */
  onAuthSuccess: (agentName: string) => void;
  /** Optional callback to enter guest / demo mode */
  onEnterDemo?: (personaId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  isPasswordChangeRequired = false,
  onAuthSuccess,
  onEnterDemo,
}) => {
  // Determine if public demo mode is available
  const isDemoAvailable = Boolean(onEnterDemo && !isPasswordChangeRequired && !isSupabaseConfigured);
  const [authTab, setAuthTab] = useState<'demo' | 'signin'>(isDemoAvailable ? 'demo' : 'signin');

  // Sign-in state
  const [handle, setHandle] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // First-time password change state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<boolean>(false);

  // Ref to track the post-password-change navigation timer so it can be
  // cancelled if the component unmounts before the delay fires (e.g. because
  // the auth state change unmounts the modal first).
  const authSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (authSuccessTimerRef.current) clearTimeout(authSuccessTimerRef.current);
    };
  }, []);

  // Derived agent name
  const agentName = formatAgentDisplayName(user?.user_metadata?.name || user?.email);

  /**
   * Handles user sign-in submission
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !password) {
      setErrorMessage('Please enter your username/handle and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const email = normalizeAuthEmail(handle);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Invalid username or password. Please try again.');
        } else {
          setErrorMessage(error.message || 'Failed to sign in.');
        }
        setIsSubmitting(false);
        return;
      }

      if (data?.user) {
        const mustChange = checkMustChangePassword(data.user);
        const name = formatAgentDisplayName(data.user.user_metadata?.name || data.user.email);
        if (!mustChange) {
          onAuthSuccess(name);
        }
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles mandatory first-time password update
   */
  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setChangePasswordError(null);

    try {
      // Check HaveIBeenPwned for known breaches via k-Anonymity
      const { isPwned, breachCount } = await checkPasswordBreach(newPassword);
      if (isPwned) {
        setChangePasswordError(
          `This password has appeared in ${breachCount.toLocaleString()} known data breach${breachCount === 1 ? '' : 'es'}. Please choose a more secure, unique password.`
        );
        setIsUpdatingPassword(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
          needs_password_reset: false,
        },
      });

      if (error) {
        setChangePasswordError(error.message || 'Failed to update password.');
        setIsUpdatingPassword(false);
        return;
      }

      setChangePasswordSuccess(true);
      const activeUser = data?.user || user;
      const name = formatAgentDisplayName(activeUser?.user_metadata?.name || activeUser?.email);

      // Short delay to show success state before transitioning into the dashboard.
      authSuccessTimerRef.current = setTimeout(() => {
        onAuthSuccess(name);
      }, 1000);
    } catch (err: any) {
      console.error('Password update error:', err);
      setChangePasswordError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isShowingDemoTab = isDemoAvailable && authTab === 'demo' && !isPasswordChangeRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Decorative background glow */}
      <div className="absolute w-96 h-96 bg-fotoblue-500/10 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 bg-fotoblue-600/10 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div
        className={`relative w-full ${
          isShowingDemoTab ? 'max-w-3xl' : 'max-w-md'
        } bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200`}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-fotoblue-900 via-fotoblue-800 to-slate-900 text-white px-6 py-6 text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center justify-center p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl mb-2.5 shadow-inner ring-1 ring-white/20">
            <AppLogo className="h-7 w-auto" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Support Operations Hub
          </h2>
          <p className="text-xs text-fotoblue-200/80 mt-1 font-medium">
            {isPasswordChangeRequired
              ? 'First-Time Security Setup'
              : isShowingDemoTab
              ? 'Scranton Branch Interactive Sandbox'
              : 'Support Agent Sign-In'}
          </p>
        </div>

        {/* Dual Mode Switcher Tabs (if demo mode is available and not forcing a password change) */}
        {isDemoAvailable && (
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAuthTab('demo')}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authTab === 'demo'
                  ? 'bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Interactive Demo (No Login)</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('signin')}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authTab === 'signin'
                  ? 'bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Staff Sign-In</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {isPasswordChangeRequired ? (
            /* VIEW 1: Mandatory First-Time Password Reset */
            <form onSubmit={handleFirstTimePasswordChange} className="space-y-4">
              <div className="bg-fotoblue-50 dark:bg-fotoblue-950/50 border border-fotoblue-200 dark:border-fotoblue-800 rounded-2xl p-4 text-fotoblue-900 dark:text-fotoblue-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-fotoblue-950 dark:text-fotoblue-100">
                      Welcome, {agentName}!
                    </h3>
                    <p className="text-xs text-fotoblue-700 dark:text-fotoblue-300 mt-1 leading-relaxed">
                      Please set your own permanent private password to protect your shift logs.
                    </p>
                  </div>
                </div>
              </div>

              {changePasswordError && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <span>Password updated successfully! Entering dashboard...</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Private Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    disabled={isUpdatingPassword || changePasswordSuccess}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your new password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    disabled={isUpdatingPassword || changePasswordSuccess}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword || changePasswordSuccess}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-fotoblue-600 to-fotoblue-700 hover:from-fotoblue-700 hover:to-fotoblue-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : isShowingDemoTab ? (
            /* VIEW 2: Overhauled Public Demo Sandbox Landing */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>Live Browser Sandbox &bull; Zero Setup Required</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Welcome to Dunder Mifflin Scranton Support
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Test-drive our shift operations dashboard with live customer phone lookups, role-based security rules, and offline sync. Choose who you&apos;d like to explore as:
                </p>
              </div>

              {/* 3 Persona Cards Grid with Aligned Support Agent Roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {MOCK_DEMO_PERSONAS.map((persona) => {
                  const isLead = persona.role === 'team_lead';
                  const isDwight = persona.id === 'dwight-schrute';

                  return (
                    <div
                      key={persona.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/70 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:bg-slate-100/70 dark:hover:bg-slate-850 transition-all flex flex-col justify-between shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-md ${
                              isLead ? 'bg-emerald-600' : isDwight ? 'bg-sky-600' : 'bg-sky-500'
                            }`}
                          >
                            {persona.avatarLetter}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              isLead
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/80'
                                : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/80'
                            }`}
                          >
                            {persona.roleTitle}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                          {persona.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {persona.characterTitle}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-snug">
                          {persona.description}
                        </p>

                        <div
                          className={`mt-3 p-2 rounded-lg border text-[10px] font-medium ${
                            isLead
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                              : 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/80'
                          }`}
                        >
                          {isLead ? '⭐' : '🛡️'} <strong>System:</strong> {persona.permissionSummary}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEnterDemo(persona.id)}
                        className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer ${
                          isLead
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : isDwight
                            ? 'bg-sky-600 hover:bg-sky-500 text-white'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                        }`}
                      >
                        <span>{persona.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Feature trust badges */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                <div>⚡ <strong>100% In-Browser</strong>: Safe sandbox, no DB mutations</div>
                <div>🔄 <strong>Instant Reset</strong>: Revert to pristine sample state anytime</div>
                <div>👥 <strong>Real RBAC</strong>: Test Agent (Jim/Dwight) vs Lead (Michael)</div>
              </div>
            </div>
          ) : (
            /* VIEW 3: Standard Staff Credentials Sign-In */
            <form onSubmit={handleSignIn} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Agent Handle or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="agent@domain.com"
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-fotoblue-600 to-fotoblue-700 hover:from-fotoblue-700 hover:to-fotoblue-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Support Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick switch to demo preview from inside sign-in */}
              {isDemoAvailable && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setAuthTab('demo')}
                    className="text-xs text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
                  >
                    Just visiting? Explore the <strong>Interactive Demo</strong> &rarr;
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-fotoblue-500" />
            <span>Support Operations Hub &bull; Dunder Mifflin Scranton</span>
          </p>
        </div>
      </div>
    </div>
  );
};
