/**
 * @file useAuthWorkflow.ts
 * @description Application workflow hook managing Supabase authentication,
 * session restoration, password reset gatekeeping, and agent role/profile resolution.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../infrastructure/supabase/client';
import {
  getUserRole,
  formatAgentDisplayName,
  formatAgentFullName,
  normalizeAuthEmail,
  UserRole,
} from '../domain';
import { checkPasswordBreach } from '../utils/passwordSecurity';
import {
  MOCK_DEMO_PERSONAS,
  DEFAULT_MOCK_PERSONA_ID,
  getMockPersonaById,
  MockPersona,
} from '../data/mockDemoData';

const DEMO_STORAGE_KEY = 'support_demo_persona_id';

function createMockUser(persona: MockPersona): User {
  return {
    id: persona.id,
    app_metadata: {
      provider: 'demo',
      role: persona.role,
    },
    user_metadata: {
      name: persona.name,
      role: persona.role,
      roleTitle: persona.roleTitle,
      avatarLetter: persona.avatarLetter,
      must_change_password: false,
      needs_password_reset: false,
    },
    aud: 'authenticated',
    confirmation_sent_at: '',
    recovery_sent_at: '',
    email_change_sent_at: '',
    new_email: '',
    invited_at: '',
    action_link: '',
    email: persona.email,
    phone: '',
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone_confirmed_at: '',
    last_sign_in_at: new Date().toISOString(),
    role: persona.role,
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
  } as unknown as User;
}

export function checkMustChangePassword(user: User | null | undefined): boolean {
  if (!user) return false;
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;

  if (
    userMeta.must_change_password === false ||
    userMeta.needs_password_reset === false ||
    userMeta.mustChangePassword === false ||
    userMeta.needsPasswordReset === false
  ) {
    return false;
  }

  return Boolean(
    userMeta.must_change_password ||
    userMeta.needs_password_reset ||
    userMeta.mustChangePassword ||
    userMeta.needsPasswordReset ||
    appMeta.must_change_password ||
    appMeta.needs_password_reset ||
    appMeta.mustChangePassword ||
    appMeta.needsPasswordReset
  );
}

export function useAuthWorkflow() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('demo')) return true;
    return Boolean(sessionStorage.getItem(DEMO_STORAGE_KEY));
  });

  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_MOCK_PERSONA_ID;
    const urlParams = new URLSearchParams(window.location.search);
    const paramVal = urlParams.get('demo');
    if (paramVal && MOCK_DEMO_PERSONAS.some((p) => p.id === paramVal)) {
      return paramVal;
    }
    return sessionStorage.getItem(DEMO_STORAGE_KEY) || DEFAULT_MOCK_PERSONA_ID;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const hasDemo = urlParams.has('demo') || Boolean(sessionStorage.getItem(DEMO_STORAGE_KEY));
    if (hasDemo) {
      const paramVal = urlParams.get('demo');
      const targetId = (paramVal && MOCK_DEMO_PERSONAS.some((p) => p.id === paramVal))
        ? paramVal
        : sessionStorage.getItem(DEMO_STORAGE_KEY) || DEFAULT_MOCK_PERSONA_ID;
      return createMockUser(getMockPersonaById(targetId));
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(() => !isDemoMode);
  const [isPasswordChangeRequired, setIsPasswordChangeRequired] = useState<boolean>(false);

  const userRole: UserRole = getUserRole(currentUser);
  const isTeamLead = userRole === 'team_lead';

  const currentAgentName: string = currentUser
    ? (currentUser.user_metadata?.name && formatAgentDisplayName(currentUser.user_metadata.name)) ||
      (currentUser.email && formatAgentDisplayName(currentUser.email)) ||
      'Support Agent'
    : 'Support Agent';

  const currentAgentFullName: string = currentUser
    ? (currentUser.user_metadata?.name && formatAgentFullName(currentUser.user_metadata.name)) ||
      (currentUser.email && formatAgentFullName(currentUser.email)) ||
      'Support Agent'
    : 'Support Agent';

  const enterDemoMode = useCallback((personaId = DEFAULT_MOCK_PERSONA_ID) => {
    const persona = getMockPersonaById(personaId);
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, persona.id);
    } catch {}
    setIsDemoMode(true);
    setActivePersonaId(persona.id);
    setCurrentUser(createMockUser(persona));
    setIsPasswordChangeRequired(false);
    setAuthLoading(false);
  }, []);

  const switchDemoPersona = useCallback((personaId: string) => {
    const persona = getMockPersonaById(personaId);
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, persona.id);
    } catch {}
    setActivePersonaId(persona.id);
    setCurrentUser(createMockUser(persona));
  }, []);

  const exitDemoMode = useCallback(() => {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      if (typeof window !== 'undefined' && window.location.search.includes('demo')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('demo');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch {}
    setIsDemoMode(false);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setAuthLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          setCurrentUser(session.user);
          setIsPasswordChangeRequired(checkMustChangePassword(session.user));
        }
      })
      .catch((err) => {
        console.error('Session load error:', err);
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setCurrentUser(session.user);
        setIsPasswordChangeRequired(checkMustChangePassword(session.user));
      } else if (!isDemoMode) {
        setCurrentUser(null);
        setIsPasswordChangeRequired(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const signIn = useCallback(async (emailOrHandle: string, password: string) => {
    const email = normalizeAuthEmail(emailOrHandle);
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }, []);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      exitDemoMode();
      return { data: { user: null, session: null }, error: null };
    }
    return await supabase.auth.signOut();
  }, [isDemoMode, exitDemoMode]);

  const updatePassword = useCallback(async (newPassword: string, metadata?: Record<string, unknown>) => {
    const { isPwned, breachCount } = await checkPasswordBreach(newPassword);
    if (isPwned) {
      return {
        data: { user: null },
        error: new Error(
          `This password has appeared in ${breachCount.toLocaleString()} known data breaches. Please choose a more secure password.`
        ),
      };
    }

    const mergedMetadata = {
      must_change_password: false,
      needs_password_reset: false,
      mustChangePassword: false,
      needsPasswordReset: false,
      ...metadata,
    };
    const res = await supabase.auth.updateUser({
      password: newPassword,
      data: mergedMetadata,
    });
    if (!res.error) {
      setIsPasswordChangeRequired(false);
    }
    return res;
  }, []);

  return {
    currentUser,
    authLoading,
    isPasswordChangeRequired,
    setIsPasswordChangeRequired,
    isSupabaseConfigured,
    userRole,
    isTeamLead,
    currentAgentName,
    currentAgentFullName,
    isDemoMode,
    activePersonaId,
    enterDemoMode,
    switchDemoPersona,
    exitDemoMode,
    signIn,
    signOut,
    updatePassword,
  };
}
