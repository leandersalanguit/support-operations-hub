export interface StorageScope {
  projectId: string;
  userId: string;
}

export interface SessionEnvelope<T> {
  scope: StorageScope;
  writtenAt: number;
  data: T;
}

export const CUSTOMER_CACHE_TTL_MS = 30 * 60 * 1000;
export const QUEUE_RETRY_TTL_MS = 8 * 60 * 60 * 1000;
const PREFIX = 'support_hub_session_v1:';
const CHANNEL_NAME = 'support-hub-auth-state';
const STORAGE_EVENT_KEY = 'support_hub_auth_event';
const ACCESS_EVENT_KEY = 'support_hub_access_event';

// A scope alone cannot distinguish logout followed by a login to the same
// account. Keep a per-tab epoch so requests from an earlier auth session stay
// stale even when the UUID and project ID match again.
let customerSessionGeneration = 0;

export function getCustomerSessionGeneration(): number {
  return customerSessionGeneration;
}

export function invalidateCustomerSessionGeneration(): number {
  return ++customerSessionGeneration;
}

export function isCustomerSessionGenerationCurrent(generation: number): boolean {
  return generation === customerSessionGeneration;
}

export function scopedSessionKey(scope: StorageScope, name: string): string {
  return `${PREFIX}${encodeURIComponent(scope.projectId)}:${encodeURIComponent(scope.userId)}:${name}`;
}

function sameScope(left: StorageScope, right: StorageScope): boolean {
  return left.projectId === right.projectId && left.userId === right.userId;
}

export function writeScopedSession<T>(
  scope: StorageScope,
  name: string,
  data: T,
  now = Date.now()
): boolean {
  try {
    const envelope: SessionEnvelope<T> = { scope: { ...scope }, writtenAt: now, data };
    sessionStorage.setItem(scopedSessionKey(scope, name), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function readScopedSession<T>(
  scope: StorageScope,
  name: string,
  validate: (value: unknown) => value is T,
  maxAgeMs: number | null = CUSTOMER_CACHE_TTL_MS,
  now = Date.now()
): T | null {
  try {
    const raw = sessionStorage.getItem(scopedSessionKey(scope, name));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Partial<SessionEnvelope<unknown>>;
    if (
      !envelope.scope || !sameScope(envelope.scope, scope) ||
      typeof envelope.writtenAt !== 'number' || envelope.writtenAt > now ||
      (maxAgeMs !== null && now - envelope.writtenAt > maxAgeMs) ||
      !validate(envelope.data)
    ) {
      sessionStorage.removeItem(scopedSessionKey(scope, name));
      return null;
    }
    return envelope.data;
  } catch {
    try { sessionStorage.removeItem(scopedSessionKey(scope, name)); } catch {}
    return null;
  }
}

export function clearCustomerSession(scope?: StorageScope): void {
  invalidateCustomerSessionGeneration();
  try {
    if (scope) {
      for (const name of ['interactions', 'clients', 'queue']) {
        sessionStorage.removeItem(scopedSessionKey(scope, name));
      }
      return;
    }
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {}
}

export function clearScopedSessionEntry(scope: StorageScope | undefined, name: string): void {
  if (!scope) return;
  try { sessionStorage.removeItem(scopedSessionKey(scope, name)); } catch {}
}

export function notifyCustomerSessionCleared(): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'clear-customer-session' });
      channel.close();
    }
  } catch {}
  try {
    localStorage.setItem(STORAGE_EVENT_KEY, `${Date.now()}:${Math.random()}`);
  } catch {}
}

export function notifyStaffAccessInvalidated(): void {
  notifyCustomerSessionCleared();
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'staff-access-invalidated' });
      channel.close();
    }
  } catch {}
  try { localStorage.setItem(ACCESS_EVENT_KEY, `${Date.now()}:${Math.random()}`); } catch {}
}

export function subscribeStaffAccessInvalidated(onInvalidated: () => void): () => void {
  let channel: BroadcastChannel | undefined;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'staff-access-invalidated') onInvalidated();
      });
    }
  } catch {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_EVENT_KEY) onInvalidated();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    channel?.close();
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function subscribeCustomerSessionCleared(onClear: () => void): () => void {
  let channel: BroadcastChannel | undefined;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'clear-customer-session') onClear();
      });
    }
  } catch {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_EVENT_KEY) onClear();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    channel?.close();
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
