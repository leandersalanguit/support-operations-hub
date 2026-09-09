/**
 * @file client.ts
 * @description Supabase client initialization and robust network retry transport helpers.
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    !rawUrl.includes('your-project') &&
    !rawKey.includes('your-anon-key')
);

/**
 * Semantic alias indicating whether a valid user database is configured and detected.
 */
export const isUserDatabaseDetected = isSupabaseConfigured;

// Fallback to placeholder endpoint if unconfigured so static/demo deployments never crash at startup
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(
  isSupabaseConfigured ? rawUrl : fallbackUrl,
  isSupabaseConfigured ? rawKey : fallbackKey
);

/**
 * Checks if an error is network-transport related (socket closed, offline, gateway timeout, etc.)
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;
  const msg = (typeof error === 'string' ? error : (errObj?.message as string) || String(error) || '').toLowerCase();
  const isAbort =
    errObj?.name === 'AbortError' ||
    msg.includes('aborterror') ||
    msg.includes('network request was aborted') ||
    msg.includes('the user aborted a request');

  return (
    isAbort ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('connection_closed') ||
    msg.includes('connection_reset') ||
    msg.includes('connection closed') ||
    msg.includes('err_connection') ||
    msg.includes('socket') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

/**
 * Retries an asynchronous database operation with exponential backoff if network transport fails.
 */
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 600
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      if (attempt > retries || !isNetworkError(err)) {
        throw err;
      }
      console.warn(
        `[Supabase Network Retry] Attempt ${attempt}/${retries} failed (${err.message}). Retrying in ${delayMs * attempt}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
