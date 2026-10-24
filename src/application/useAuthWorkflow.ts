/**
 * @file useAuthWorkflow.ts
 * @description Application workflow hook managing Supabase authentication,
 * session restoration, password reset gatekeeping, and agent role/profile resolution.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../infrastructure/supabase/client';
import {
  getUserRole,
  formatAgentDisplayName,
  formatAgentFullName,
  normalizeAuthEmail,
  hasAuthenticatedUserChanged,
  UserRole,
} from '../domain';
import { getMyAccessState, isStaffAccessRestricted, StaffAccessState } from '../infrastructure/supabase/staffAccessRepo';
import { completeRequiredPasswordChange } from '../infrastructure/supabase/passwordChangeAdapter';
import {
  clearCustomerSession,
  getCustomerSessionGeneration,
  isCustomerSessionGenerationCurrent,
  notifyCustomerSessionCleared,
  notifyStaffAccessInvalidated,
  subscribeStaffAccessInvalidated,
} from '../infrastructure/storage/scopedSessionStore';
import {
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

export function useAuthWorkflow() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    // If a user database is detected, demo mode is strictly disabled
    if (isSupabaseConfigured || typeof window === 'undefined') return false;
    return Boolean(sessionStorage.getItem(DEMO_STORAGE_KEY));
  });

  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    if (isSupabaseConfigured || typeof window === 'undefined') return DEFAULT_MOCK_PERSONA_ID;
    return sessionStorage.getItem(DEMO_STORAGE_KEY) || DEFAULT_MOCK_PERSONA_ID;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // If a user database is detected, do not initialize with a mock user
    if (isSupabaseConfigured || typeof window === 'undefined') return null;
    const storedPersonaId = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (storedPersonaId) {
      return createMockUser(getMockPersonaById(storedPersonaId));
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(() => !isDemoMode);
  const [passwordChangeRequiredState, setIsPasswordChangeRequired] = useState<boolean>(!isDemoMode && isSupabaseConfigured);
  const [staffAccessState, setStaffAccessState] = useState<StaffAccessState | null>(null);
  const staffAccessRef = useRef<StaffAccessState | null>(staffAccessState);
  staffAccessRef.current = staffAccessState;
  const accessRequestId = useRef(0);
  const blockingAccessRequestId = useRef<number | null>(null);
  const lastAuthUserId = useRef<string | null>(currentUser?.id || null);

  const refreshAccessState = useCallback(async (
    userId?: string,
    options: { showLoading?: boolean } = {}
  ) => {
    const showLoading = (options.showLoading ?? true) || blockingAccessRequestId.current !== null;
    const requestId = ++accessRequestId.current;
    const finishLoading = () => {
      if (blockingAccessRequestId.current === requestId) {
        blockingAccessRequestId.current = null;
        setAuthLoading(false);
      }
    };
    if (showLoading) {
      blockingAccessRequestId.current = requestId;
      setAuthLoading(true);
    }
    try {
      const state = await getMyAccessState();
      if (requestId !== accessRequestId.current) {
        finishLoading();
        return state;
      }
      if (userId && state?.userId !== userId) {
        setStaffAccessState(null);
        setIsPasswordChangeRequired(true);
        finishLoading();
        return null;
      }
      setStaffAccessState(state);
      setIsPasswordChangeRequired(isStaffAccessRestricted(state, state?.userId));
      if (!state || !state.active) {
        clearCustomerSession();
        if (staffAccessRef.current?.active) notifyStaffAccessInvalidated();
        else notifyCustomerSessionCleared();
      }
      finishLoading();
      return state;
    } catch (error) {
      if (requestId === accessRequestId.current) {
        setStaffAccessState(null);
        setIsPasswordChangeRequired(true);
      }
      finishLoading();
      throw error;
    }
  }, []);

  // If a user database is detected, purge any lingering demo storage
  useEffect(() => {
    if (isSupabaseConfigured && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {}
    }
  }, []);

  const userRole: UserRole = staffAccessState?.role || (isDemoMode ? getUserRole(currentUser) : 'support_agent');
  const isPasswordChangeRequired = !isDemoMode && currentUser
    ? isStaffAccessRestricted(staffAccessState, currentUser.id)
    : passwordChangeRequiredState;
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
    // Guard: demo mode is not permitted when a user database is detected
    if (isSupabaseConfigured) return;

    const persona = getMockPersonaById(personaId);
    if (activePersonaId !== persona.id) {
      clearCustomerSession({ projectId: 'support-hub-demo', userId: activePersonaId });
      notifyCustomerSessionCleared();
    }
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, persona.id);
    } catch {}
    setIsDemoMode(true);
    setActivePersonaId(persona.id);
    setCurrentUser(createMockUser(persona));
    setStaffAccessState(null);
    setIsPasswordChangeRequired(false);
    setAuthLoading(false);
  }, [activePersonaId]);

  const switchDemoPersona = useCallback((personaId: string) => {
    // Guard: demo mode is not permitted when a user database is detected
    if (isSupabaseConfigured) return;

    const persona = getMockPersonaById(personaId);
    clearCustomerSession({ projectId: 'support-hub-demo', userId: activePersonaId });
    notifyCustomerSessionCleared();
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, persona.id);
    } catch {}
    setActivePersonaId(persona.id);
    setCurrentUser(createMockUser(persona));
    setStaffAccessState(null);
  }, [activePersonaId]);

  const exitDemoMode = useCallback(() => {
    clearCustomerSession({ projectId: 'support-hub-demo', userId: activePersonaId });
    notifyCustomerSessionCleared();
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {}
    setIsDemoMode(false);
    setCurrentUser(null);
    setStaffAccessState(null);
    setIsPasswordChangeRequired(false);
  }, [activePersonaId]);

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
          if (hasAuthenticatedUserChanged(lastAuthUserId.current, session.user.id)) {
            clearCustomerSession();
            notifyCustomerSessionCleared();
          }
          lastAuthUserId.current = session.user.id;
          setCurrentUser(session.user);
          refreshAccessState(session.user.id).catch((err) => {
            console.error('Staff access state load error:', err);
          });
        } else {
          setStaffAccessState(null);
          setIsPasswordChangeRequired(false);
        }
      })
      .catch((err) => {
        console.error('Session load error:', err);
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const isSameUser = lastAuthUserId.current === session.user.id;
        if (hasAuthenticatedUserChanged(lastAuthUserId.current, session.user.id)) {
          clearCustomerSession();
          notifyCustomerSessionCleared();
        }
        lastAuthUserId.current = session.user.id;
        setCurrentUser(session.user);
        // Recheck staff access without replacing the shell on same-user refocus events.
        // If a blocking check is active, the new check takes ownership of its loader.
        const isRepeatSignInOrTokenRefresh = isSameUser &&
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED');
        refreshAccessState(session.user.id, {
          showLoading: !isRepeatSignInOrTokenRefresh,
        }).catch((err) => {
          console.error('Staff access state load error:', err);
        });
      } else if (!isDemoMode) {
        if (lastAuthUserId.current) {
          clearCustomerSession();
          notifyCustomerSessionCleared();
        }
        lastAuthUserId.current = null;
        accessRequestId.current++;
        setCurrentUser(null);
        setStaffAccessState(null);
        setIsPasswordChangeRequired(false);
      }
    });

    const unsubscribeAccessInvalidation = subscribeStaffAccessInvalidated(() => {
      refreshAccessState(lastAuthUserId.current || undefined).catch((err) => {
        console.error('Staff access refresh error:', err);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeAccessInvalidation();
    };
  }, [isDemoMode, refreshAccessState]);

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

  const updatePassword = useCallback(async (newPassword: string) => {
    if (newPassword.length < 12 || newPassword.length > 128) {
      throw new Error('Password must contain 12 to 128 characters.');
    }
    const sessionGeneration = getCustomerSessionGeneration();
    const userId = currentUser?.id;
    if (!userId) throw new Error('Staff access could not be confirmed for this session.');
    await completeRequiredPasswordChange(newPassword);
    if (!isCustomerSessionGenerationCurrent(sessionGeneration) || lastAuthUserId.current !== userId) {
      throw new Error('The signed-in session changed before password access could be confirmed.');
    }
    const { error } = await supabase.auth.refreshSession();
    if (!isCustomerSessionGenerationCurrent(sessionGeneration) || lastAuthUserId.current !== userId) {
      throw new Error('The signed-in session changed before password access could be confirmed.');
    }
    if (error) throw new Error('Password changed, but the session could not be refreshed.');
    const state = await refreshAccessState(userId);
    if (!isCustomerSessionGenerationCurrent(sessionGeneration) || lastAuthUserId.current !== userId) return;
    if (!state?.active || state.passwordChangeRequired) {
      throw new Error('Staff access could not be confirmed after the password change.');
    }
  }, [currentUser?.id, refreshAccessState]);

  return {
    currentUser,
    authLoading,
    isPasswordChangeRequired,
    setIsPasswordChangeRequired,
    staffAccessState,
    refreshAccessState,
    isSupabaseConfigured,
    isUserDatabaseDetected: isSupabaseConfigured,
    isDemoAvailable: !isSupabaseConfigured,
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
