/**
 * @file onboardingSlots.ts
 * @description Default fallback operational slots for client onboarding sessions
 * (Sunday 9:00 PM to Friday 4:00 AM PHT).
 * Used when Supabase is unconfigured, unreachable, or in demo/offline mode.
 */

import { OnboardingSlot } from '../domain/onboarding/types';

export const DEFAULT_FALLBACK_ONBOARDING_SLOTS: OnboardingSlot[] = [
  // Sunday: First slot of the work week
  {
    id: 'sun_2100',
    dayOfWeek: 0,
    startTime: '21:00',
    endTime: '22:00',
    label: '9:00 PM - 10:00 PM',
    isActive: true,
    displayOrder: 1,
  },

  // Monday
  {
    id: 'mon_0100',
    dayOfWeek: 1,
    startTime: '01:00',
    endTime: '02:00',
    label: '1:00 AM - 2:00 AM',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'mon_0400',
    dayOfWeek: 1,
    startTime: '04:00',
    endTime: '05:00',
    label: '4:00 AM - 5:00 AM',
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'mon_0700',
    dayOfWeek: 1,
    startTime: '07:00',
    endTime: '08:00',
    label: '7:00 AM - 8:00 AM',
    isActive: true,
    displayOrder: 4,
  },
  {
    id: 'mon_2100',
    dayOfWeek: 1,
    startTime: '21:00',
    endTime: '22:00',
    label: '9:00 PM - 10:00 PM',
    isActive: true,
    displayOrder: 5,
  },

  // Tuesday
  {
    id: 'tue_0100',
    dayOfWeek: 2,
    startTime: '01:00',
    endTime: '02:00',
    label: '1:00 AM - 2:00 AM',
    isActive: true,
    displayOrder: 6,
  },
  {
    id: 'tue_0400',
    dayOfWeek: 2,
    startTime: '04:00',
    endTime: '05:00',
    label: '4:00 AM - 5:00 AM',
    isActive: true,
    displayOrder: 7,
  },
  {
    id: 'tue_0700',
    dayOfWeek: 2,
    startTime: '07:00',
    endTime: '08:00',
    label: '7:00 AM - 8:00 AM',
    isActive: true,
    displayOrder: 8,
  },
  {
    id: 'tue_2100',
    dayOfWeek: 2,
    startTime: '21:00',
    endTime: '22:00',
    label: '9:00 PM - 10:00 PM',
    isActive: true,
    displayOrder: 9,
  },

  // Wednesday
  {
    id: 'wed_0100',
    dayOfWeek: 3,
    startTime: '01:00',
    endTime: '02:00',
    label: '1:00 AM - 2:00 AM',
    isActive: true,
    displayOrder: 10,
  },
  {
    id: 'wed_0400',
    dayOfWeek: 3,
    startTime: '04:00',
    endTime: '05:00',
    label: '4:00 AM - 5:00 AM',
    isActive: true,
    displayOrder: 11,
  },
  {
    id: 'wed_0700',
    dayOfWeek: 3,
    startTime: '07:00',
    endTime: '08:00',
    label: '7:00 AM - 8:00 AM',
    isActive: true,
    displayOrder: 12,
  },
  {
    id: 'wed_2100',
    dayOfWeek: 3,
    startTime: '21:00',
    endTime: '22:00',
    label: '9:00 PM - 10:00 PM',
    isActive: true,
    displayOrder: 13,
  },

  // Thursday
  {
    id: 'thu_0100',
    dayOfWeek: 4,
    startTime: '01:00',
    endTime: '02:00',
    label: '1:00 AM - 2:00 AM',
    isActive: true,
    displayOrder: 14,
  },
  {
    id: 'thu_0400',
    dayOfWeek: 4,
    startTime: '04:00',
    endTime: '05:00',
    label: '4:00 AM - 5:00 AM',
    isActive: true,
    displayOrder: 15,
  },
  {
    id: 'thu_0700',
    dayOfWeek: 4,
    startTime: '07:00',
    endTime: '08:00',
    label: '7:00 AM - 8:00 AM',
    isActive: true,
    displayOrder: 16,
  },
  {
    id: 'thu_2100',
    dayOfWeek: 4,
    startTime: '21:00',
    endTime: '22:00',
    label: '9:00 PM - 10:00 PM',
    isActive: true,
    displayOrder: 17,
  },

  // Friday: 1-2 AM and 4-5 AM (4:00 AM is the last slot of the work week)
  {
    id: 'fri_0100',
    dayOfWeek: 5,
    startTime: '01:00',
    endTime: '02:00',
    label: '1:00 AM - 2:00 AM',
    isActive: true,
    displayOrder: 18,
  },
  {
    id: 'fri_0400',
    dayOfWeek: 5,
    startTime: '04:00',
    endTime: '05:00',
    label: '4:00 AM - 5:00 AM',
    isActive: true,
    displayOrder: 19,
  },
];
