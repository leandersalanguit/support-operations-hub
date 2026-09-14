/**
 * @file repository.ts
 * @description Domain repository contracts for onboarding slots and scheduled session persistence.
 */

import { OnboardingSlot, ScheduledSession, OnboardingSessionStatus } from './types';

export interface IOnboardingRepository {
  /**
   * Retrieves active operational slots for a given day of the week (0 = Sunday, 1 = Monday, ..., 5 = Friday).
   */
  getSlotsForDay(dayOfWeek: number): Promise<OnboardingSlot[]>;

  /**
   * Retrieves all active operational slots defined in the system.
   */
  getAllActiveSlots(): Promise<OnboardingSlot[]>;

  /**
   * Retrieves scheduled sessions, optionally filtered by PHT slot date and/or status.
   */
  getSessions(options?: {
    date?: string;
    status?: OnboardingSessionStatus;
  }): Promise<ScheduledSession[]>;

  /**
   * Books a new session on the reference calendar.
   */
  bookSession(
    session: Omit<ScheduledSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ScheduledSession>;

  /**
   * Updates an existing session's status (e.g. 'completed' or 'cancelled').
   */
  updateSessionStatus(id: string, status: OnboardingSessionStatus): Promise<void>;

  /**
   * Cancels a scheduled session by ID.
   */
  cancelSession(id: string): Promise<void>;
}
