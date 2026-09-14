import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseOnboardingRepository } from '../../../infrastructure/supabase/onboardingRepo';

describe('SupabaseOnboardingRepository (Fallback Mode)', () => {
  let repo: SupabaseOnboardingRepository;

  beforeEach(() => {
    // Clear mock localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    repo = new SupabaseOnboardingRepository();
  });

  it('retrieves Sunday slot: starts at 9PM (first slot of work week)', async () => {
    const sundaySlots = await repo.getSlotsForDay(0);
    expect(sundaySlots).toHaveLength(1);
    expect(sundaySlots[0].startTime).toBe('21:00');
    expect(sundaySlots[0].label).toBe('9:00 PM - 10:00 PM');
  });

  it('retrieves Monday slots: has all 4 operational slots', async () => {
    const mondaySlots = await repo.getSlotsForDay(1);
    expect(mondaySlots).toHaveLength(4);
    const startTimes = mondaySlots.map((s) => s.startTime);
    expect(startTimes).toEqual(['01:00', '04:00', '07:00', '21:00']);
  });

  it('retrieves Friday slots: ends at 4-5 AM (last slot of work week)', async () => {
    const fridaySlots = await repo.getSlotsForDay(5);
    expect(fridaySlots).toHaveLength(2);
    expect(fridaySlots[0].startTime).toBe('01:00');
    expect(fridaySlots[1].startTime).toBe('04:00');
    expect(fridaySlots[1].label).toBe('4:00 AM - 5:00 AM');
  });

  it('retrieves Saturday slots: empty (off-shift)', async () => {
    const saturdaySlots = await repo.getSlotsForDay(6);
    expect(saturdaySlots).toHaveLength(0);
  });

  it('books a session, retrieves it, and cancels it', async () => {
    const booked = await repo.bookSession({
      clientName: 'Acme Corp',
      clientPhone: '555-1234',
      product: 'Dunder Mifflin Workstation',
      clientTimezone: 'America/Los_Angeles',
      slotDate: '2026-08-10',
      slotId: 'mon_0100',
      startIso: '2026-08-09T17:00:00.000Z',
      endIso: '2026-08-09T18:00:00.000Z',
      status: 'booked',
      bookedBy: 'Agent Leander',
      notes: 'Initial setup session',
    });

    expect(booked.id).toBeDefined();
    expect(booked.clientName).toBe('Acme Corp');
    expect(booked.status).toBe('booked');

    // Retrieve sessions
    const sessions = await repo.getSessions({ date: '2026-08-10' });
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const found = sessions.find((s) => s.id === booked.id);
    expect(found).toBeDefined();

    // Cancel session
    await repo.cancelSession(booked.id);
    const afterCancel = await repo.getSessions();
    const cancelled = afterCancel.find((s) => s.id === booked.id);
    expect(cancelled?.status).toBe('cancelled');
  });
});
