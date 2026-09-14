/**
 * @file types.ts
 * @description Domain entity definitions and contracts for Client Onboarding Scheduling.
 */

export interface OnboardingSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 5 = Friday
  startTime: string; // HH:mm:ss or HH:mm, e.g. '21:00'
  endTime: string;   // HH:mm:ss or HH:mm, e.g. '22:00'
  label: string;     // e.g. '9:00 PM - 10:00 PM'
  isActive: boolean;
  displayOrder: number;
}

export type OnboardingSessionStatus = 'booked' | 'completed' | 'cancelled';

export interface ScheduledSession {
  id: string;
  clientName: string;
  clientPhone?: string;
  product: string;
  clientTimezone: string;
  slotDate: string; // YYYY-MM-DD in Philippine Time
  slotId: string;
  startIso: string; // ISO 8601 UTC string
  endIso: string;   // ISO 8601 UTC string
  status: OnboardingSessionStatus;
  bookedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OnboardingFormData {
  clientName: string;
  clientPhone: string;
  product: string;
  clientTimezone: string;
  slotDate: string;
  slotId: string;
  notes?: string;
}

export interface ConvertedTimeResult {
  clientDate: string;         // e.g. 'Monday, August 10, 2026'
  clientDayOfWeek: string;    // e.g. 'Monday'
  clientMonthAndDay: string;  // e.g. 'August 10'
  clientTime: string;         // e.g. '8:00 PM'
  clientTimezoneName: string; // e.g. 'Pacific Time'
  phtDateDisplay: string;     // e.g. 'Tuesday, Aug 11, 2026'
  phtTimeDisplay: string;     // e.g. '11:00 AM PHT'
  copyableMessage: string;    // Exact message template
  startIso: string;           // ISO 8601 UTC
  endIso: string;             // ISO 8601 UTC
}

export interface TimezoneOption {
  value: string;        // IANA time zone identifier, e.g. 'America/Los_Angeles'
  label: string;        // Display label, e.g. 'Pacific Time (US & Canada)'
  genericName: string;  // e.g. 'Pacific Time'
  group: 'US/Canada' | 'Europe' | 'Asia/Pacific' | 'Other';
}
