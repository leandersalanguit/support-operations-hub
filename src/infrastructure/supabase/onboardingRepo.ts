/**
 * @file onboardingRepo.ts
 * @description Strongly typed Supabase implementation of IOnboardingRepository with
 * automatic local/in-memory fallback for offline, unmigrated, or demo environments.
 */

import { IOnboardingRepository } from '../../domain/onboarding/repository';
import { OnboardingSlot, ScheduledSession, OnboardingSessionStatus } from '../../domain/onboarding/types';
import { supabase, isSupabaseConfigured, withNetworkRetry } from './client';
import { generateUUID } from '../../utils/uuid';

const STORAGE_SESSIONS_KEY = 'support_ops_onboarding_sessions';

import { DEFAULT_FALLBACK_ONBOARDING_SLOTS } from '../../data';

function mapDbToSlot(row: any): OnboardingSlot {
  return {
    id: String(row.id),
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time).substring(0, 5),
    endTime: String(row.end_time).substring(0, 5),
    label: String(row.label),
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order || 0),
  };
}

function mapDbToSession(row: any): ScheduledSession {
  return {
    id: String(row.id),
    clientName: String(row.client_name),
    clientPhone: row.client_phone ? String(row.client_phone) : '',
    product: String(row.product),
    clientTimezone: String(row.client_timezone),
    slotDate: String(row.slot_date),
    slotId: String(row.slot_id),
    startIso: String(row.start_iso),
    endIso: String(row.end_iso),
    status: (row.status as OnboardingSessionStatus) || 'booked',
    bookedBy: row.booked_by ? String(row.booked_by) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

// In-memory sessions store to support non-browser environments and zero-latency caching
let inMemorySessions: ScheduledSession[] = [];

function getLocalSessions(options?: {
  date?: string;
  status?: OnboardingSessionStatus;
}): ScheduledSession[] {
  let sessions: ScheduledSession[] = [...inMemorySessions];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          sessions = parsed;
          inMemorySessions = parsed;
        }
      }
    } catch {
      // fallback to in-memory
    }
  }

  if (options?.date) {
    sessions = sessions.filter((s) => s.slotDate === options.date);
  }
  if (options?.status) {
    sessions = sessions.filter((s) => s.status === options.status);
  }

  return sessions;
}

function saveLocalSessions(sessions: ScheduledSession[]): void {
  inMemorySessions = sessions;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn('[onboardingRepo] Failed to save sessions to localStorage:', err);
    }
  }
}

export class SupabaseOnboardingRepository implements IOnboardingRepository {
  async getSlotsForDay(dayOfWeek: number): Promise<OnboardingSlot[]> {
    if (!isSupabaseConfigured) {
      return DEFAULT_FALLBACK_ONBOARDING_SLOTS.filter(
        (s) => s.dayOfWeek === dayOfWeek && s.isActive
      );
    }

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('onboarding_slots')
          .select('*')
          .eq('is_active', true)
          .eq('day_of_week', dayOfWeek)
          .order('display_order', { ascending: true });

        if (error || !data || data.length === 0) {
          return DEFAULT_FALLBACK_ONBOARDING_SLOTS.filter(
            (s) => s.dayOfWeek === dayOfWeek && s.isActive
          );
        }

        return data.map(mapDbToSlot);
      });
    } catch (err: any) {
      console.warn('[onboardingRepo] Failed to query slots from Supabase, using fallback:', err?.message || err);
      return DEFAULT_FALLBACK_ONBOARDING_SLOTS.filter(
        (s) => s.dayOfWeek === dayOfWeek && s.isActive
      );
    }
  }

  async getAllActiveSlots(): Promise<OnboardingSlot[]> {
    if (!isSupabaseConfigured) {
      return [...DEFAULT_FALLBACK_ONBOARDING_SLOTS];
    }

    try {
      return await withNetworkRetry(async () => {
        const { data, error } = await supabase
          .from('onboarding_slots')
          .select('*')
          .eq('is_active', true)
          .order('day_of_week', { ascending: true })
          .order('display_order', { ascending: true });

        if (error || !data || data.length === 0) {
          return [...DEFAULT_FALLBACK_ONBOARDING_SLOTS];
        }

        return data.map(mapDbToSlot);
      });
    } catch {
      return [...DEFAULT_FALLBACK_ONBOARDING_SLOTS];
    }
  }

  async getSessions(options?: {
    date?: string;
    status?: OnboardingSessionStatus;
  }): Promise<ScheduledSession[]> {
    if (!isSupabaseConfigured) {
      return getLocalSessions(options);
    }

    try {
      return await withNetworkRetry(async () => {
        let query = supabase
          .from('onboarding_sessions')
          .select('*')
          .order('start_iso', { ascending: true });

        if (options?.date) {
          query = query.eq('slot_date', options.date);
        }
        if (options?.status) {
          query = query.eq('status', options.status);
        }

        const { data, error } = await query;

        if (error) {
          return getLocalSessions(options);
        }

        const mapped = (data || []).map(mapDbToSession);
        saveLocalSessions(mapped);
        return mapped;
      });
    } catch {
      return getLocalSessions(options);
    }
  }

  async bookSession(
    sessionData: Omit<ScheduledSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ScheduledSession> {
    const id = generateUUID();
    const now = new Date().toISOString();

    const newSession: ScheduledSession = {
      ...sessionData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Save locally first for responsive UI and offline resilience
    const current = getLocalSessions();
    saveLocalSessions([newSession, ...current.filter((s) => s.id !== id)]);

    if (!isSupabaseConfigured) {
      return newSession;
    }

    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase.from('onboarding_sessions').insert({
          id: newSession.id,
          client_name: newSession.clientName,
          client_phone: newSession.clientPhone || '',
          product: newSession.product,
          client_timezone: newSession.clientTimezone,
          slot_date: newSession.slotDate,
          slot_id: newSession.slotId,
          start_iso: newSession.startIso,
          end_iso: newSession.endIso,
          status: newSession.status,
          booked_by: newSession.bookedBy || '',
          notes: newSession.notes || '',
          created_at: newSession.createdAt,
          updated_at: newSession.updatedAt,
        });

        if (error) {
          console.warn('[onboardingRepo] Failed to save session to Supabase, retained locally:', error.message);
        }
      });
    } catch (err) {
      console.warn('[onboardingRepo] Supabase bookSession exception, retained locally:', err);
    }

    return newSession;
  }

  async updateSessionStatus(id: string, status: OnboardingSessionStatus): Promise<void> {
    const now = new Date().toISOString();

    // Update local storage
    const local = getLocalSessions();
    const updated = local.map((s) => (s.id === id ? { ...s, status, updatedAt: now } : s));
    saveLocalSessions(updated);

    if (!isSupabaseConfigured) return;

    try {
      await withNetworkRetry(async () => {
        const { error } = await supabase
          .from('onboarding_sessions')
          .update({ status, updated_at: now })
          .eq('id', id);

        if (error) {
          console.warn('[onboardingRepo] Failed to update session status in Supabase:', error.message);
        }
      });
    } catch (err) {
      console.warn('[onboardingRepo] Supabase updateSessionStatus exception:', err);
    }
  }

  async cancelSession(id: string): Promise<void> {
    return this.updateSessionStatus(id, 'cancelled');
  }
}

export const onboardingRepo = new SupabaseOnboardingRepository();
