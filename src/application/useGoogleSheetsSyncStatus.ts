import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GOOGLE_SHEETS_SHORTCUT_URL,
  GOOGLE_SHEETS_SYNC_ENABLED,
  validateGoogleSheetsUrl,
} from '../infrastructure/sheets/googleSheetsSyncAdapter';
import { supabase } from '../infrastructure/supabase/client';

export type GoogleSheetsSyncStatusState = 'disabled' | 'loading' | 'ready' | 'unavailable';

interface ScopedStatus {
  userId: string | null;
  state: GoogleSheetsSyncStatusState;
  pendingCount: number;
  failedCount: number;
  retrying: boolean;
}

const DISABLED_STATUS: ScopedStatus = {
  userId: null,
  state: 'disabled',
  pendingCount: 0,
  failedCount: 0,
  retrying: false,
};

const STATUS_UNAVAILABLE_MESSAGE = 'Sheets sync status is unavailable.';
const STATUS_POLL_INTERVAL_MS = 30_000;

function parseStatusCounts(data: unknown): { pendingCount: number; failedCount: number } {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('Invalid status response');
  const value = row as Record<string, unknown>;
  const pendingCount = value.pending_count;
  const failedCount = value.failed_count;
  if (
    typeof pendingCount !== 'number' || !Number.isInteger(pendingCount) || pendingCount < 0 ||
    typeof failedCount !== 'number' || !Number.isInteger(failedCount) || failedCount < 0
  ) {
    throw new Error('Invalid status response');
  }
  return { pendingCount, failedCount };
}

export function useGoogleSheetsSyncStatus({
  userId,
  isDemo,
}: {
  userId: string | null;
  isDemo: boolean;
}) {
  const [scopedStatus, setScopedStatus] = useState<ScopedStatus>(DISABLED_STATUS);
  const requestEpoch = useRef(0);
  const shortcutUrl = GOOGLE_SHEETS_SHORTCUT_URL
    ? validateGoogleSheetsUrl(GOOGLE_SHEETS_SHORTCUT_URL)
    : null;
  const isAvailableForSession = GOOGLE_SHEETS_SYNC_ENABLED && Boolean(userId) && !isDemo;

  useEffect(() => {
    const epoch = ++requestEpoch.current;
    if (!GOOGLE_SHEETS_SYNC_ENABLED || !userId || isDemo) {
      setScopedStatus(DISABLED_STATUS);
      return () => {
        requestEpoch.current++;
      };
    }

    let active = true;
    const isCurrent = () => active && requestEpoch.current === epoch;
    setScopedStatus({ userId, state: 'loading', pendingCount: 0, failedCount: 0, retrying: false });

    const loadStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_google_sheets_sync_status');
        if (error) throw error;
        const counts = parseStatusCounts(data);
        if (isCurrent()) {
          setScopedStatus({ userId, state: 'ready', ...counts, retrying: false });
        }
      } catch {
        if (isCurrent()) {
          setScopedStatus({ userId, state: 'unavailable', pendingCount: 0, failedCount: 0, retrying: false });
        }
      }
    };

    void loadStatus();
    const interval = setInterval(() => void loadStatus(), STATUS_POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
      requestEpoch.current++;
    };
  }, [userId, isDemo]);

  const retryFailed = useCallback(async () => {
    if (!isAvailableForSession || !userId || scopedStatus.userId !== userId || scopedStatus.failedCount < 1) return;
    const epoch = requestEpoch.current;
    setScopedStatus((current) => current.userId === userId ? { ...current, retrying: true } : current);
    try {
      const { error } = await supabase.rpc('retry_my_failed_google_sheets_sync_events');
      if (error) throw error;
      if (requestEpoch.current !== epoch) return;
      const { data, error: statusError } = await supabase.rpc('get_google_sheets_sync_status');
      if (statusError) throw statusError;
      const counts = parseStatusCounts(data);
      if (requestEpoch.current === epoch) {
        setScopedStatus({ userId, state: 'ready', ...counts, retrying: false });
      }
    } catch {
      if (requestEpoch.current === epoch) {
        setScopedStatus({ userId, state: 'unavailable', pendingCount: 0, failedCount: 0, retrying: false });
      }
    }
  }, [isAvailableForSession, scopedStatus.failedCount, scopedStatus.userId, userId]);

  const currentStatus: ScopedStatus = isAvailableForSession && scopedStatus.userId === userId
    ? scopedStatus
    : isAvailableForSession && userId
      ? { userId, state: 'loading', pendingCount: 0, failedCount: 0, retrying: false }
      : DISABLED_STATUS;

  return {
    state: currentStatus.state,
    pendingCount: currentStatus.pendingCount,
    failedCount: currentStatus.failedCount,
    retrying: currentStatus.retrying,
    shortcutUrl,
    errorMessage: currentStatus.state === 'unavailable' ? STATUS_UNAVAILABLE_MESSAGE : null,
    retryFailed,
  };
}
