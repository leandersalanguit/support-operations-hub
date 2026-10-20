import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthWorkflow } from '../useAuthWorkflow';
import {
  getCustomerSessionGeneration,
  scopedSessionKey,
  writeScopedSession,
} from '../../infrastructure/storage/scopedSessionStore';

const authMocks = vi.hoisted(() => ({
  authStateCallback: null as ((event: string, session: { user: any } | null) => void) | null,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  refreshSession: vi.fn(),
  getMyAccessState: vi.fn(),
}));

vi.mock('../../infrastructure/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      refreshSession: authMocks.refreshSession,
    },
  },
}));

vi.mock('../../infrastructure/supabase/staffAccessRepo', () => ({
  getMyAccessState: authMocks.getMyAccessState,
  isStaffAccessRestricted: (state: any, userId?: string) =>
    !state || state.userId !== userId || !state.active || state.passwordChangeRequired,
}));

vi.mock('../../infrastructure/supabase/passwordChangeAdapter', () => ({
  completeRequiredPasswordChange: vi.fn(),
}));

const activeState = (userId: string) => ({
  userId,
  active: true,
  role: 'support_agent' as const,
  passwordChangeRequired: false,
});
const makeUser = (id: string) => ({
  id,
  email: `${id}@example.test`,
  user_metadata: { role: 'team_lead', must_change_password: false, needs_password_reset: false },
  app_metadata: {},
});
const pendingQueue = [{
  id: 'queued-a', operation: 'insert', interactionId: 'interaction-a', payload: { id: 'interaction-a' },
  ownerUserId: 'user-a', projectId: 'test-project', queuedAt: Date.now(), reviewRequired: false, retryCount: 0,
}];
const scopeA = { projectId: 'test-project', userId: 'user-a' };

describe('useAuthWorkflow server access state and auth transitions', () => {
  let renderer: ReactTestRenderer | undefined;
  let latest: ReturnType<typeof useAuthWorkflow>;

  function Harness() {
    latest = useAuthWorkflow();
    return null;
  }

  beforeEach(() => {
    authMocks.authStateCallback = null;
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authMocks.authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    authMocks.getMyAccessState.mockResolvedValue(null);
    authMocks.refreshSession.mockResolvedValue({ error: null });
    vi.stubGlobal('sessionStorage', new MemoryStorage());
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps metadata aliases unable to bypass unknown server access state, then accepts active server state', async () => {
    await act(async () => {
      renderer = create(<Harness />);
      await Promise.resolve();
    });
    authMocks.getMyAccessState.mockResolvedValueOnce(null).mockResolvedValueOnce(activeState('user-a'));

    await act(async () => {
      authMocks.authStateCallback?.('SIGNED_IN', { user: makeUser('user-a') });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.isPasswordChangeRequired).toBe(true);
    expect(latest.userRole).toBe('support_agent');

    authMocks.getMyAccessState.mockResolvedValueOnce(activeState('user-a'));
    await act(async () => {
      await latest.refreshAccessState('user-a');
    });
    expect(latest.isPasswordChangeRequired).toBe(false);
    expect(latest.userRole).toBe('support_agent');
  });

  it('purges the old UUID scope on SIGNED_IN A to SIGNED_IN B without SIGNED_OUT', async () => {
    await act(async () => {
      renderer = create(<Harness />);
      await Promise.resolve();
    });
    authMocks.getMyAccessState.mockResolvedValue(activeState('user-a'));
    await act(async () => {
      authMocks.authStateCallback?.('SIGNED_IN', { user: makeUser('user-a') });
      await Promise.resolve();
      await Promise.resolve();
    });

    writeScopedSession(scopeA, 'queue', pendingQueue);
    const generationBeforeSwitch = getCustomerSessionGeneration();
    authMocks.getMyAccessState.mockResolvedValue(activeState('user-b'));
    await act(async () => {
      authMocks.authStateCallback?.('SIGNED_IN', { user: makeUser('user-b') });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sessionStorage.getItem(scopedSessionKey(scopeA, 'queue'))).toBeNull();
    expect(getCustomerSessionGeneration()).toBeGreaterThan(generationBeforeSwitch);
    expect(latest.currentUser?.id).toBe('user-b');
  });

  it('ignores an old user access response that resolves after the replacement login', async () => {
    await act(async () => {
      renderer = create(<Harness />);
      await Promise.resolve();
    });
    let resolveA!: (state: ReturnType<typeof activeState>) => void;
    let resolveB!: (state: ReturnType<typeof activeState>) => void;
    authMocks.getMyAccessState
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));

    await act(async () => {
      authMocks.authStateCallback?.('SIGNED_IN', { user: makeUser('user-a') });
    });
    await act(async () => {
      authMocks.authStateCallback?.('SIGNED_IN', { user: makeUser('user-b') });
    });
    await act(async () => {
      resolveB(activeState('user-b'));
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      resolveA({ ...activeState('user-a'), active: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.currentUser?.id).toBe('user-b');
    expect(latest.staffAccessState?.userId).toBe('user-b');
    expect(latest.isPasswordChangeRequired).toBe(false);
  });
});

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
