/**
 * @file timestamp.ts
 * @description Pure domain logic and utilities for operational shift timestamps,
 * day of week calculations, and historical date normalization.
 */

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface LogTimestamp {
  date: string;       // YYYY-MM-DD
  dayOfWeek: string;  // e.g. "Wednesday"
  time: string;       // HH:mm:ss
  createdAt: string;  // ISO 8601 string
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string to day of week name (e.g., 'Monday').
 * Parses date parts directly to prevent UTC timezone day shifts.
 */
export function getDayOfWeekFromDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  return DAYS_OF_WEEK[date.getDay()] || '';
}

/**
 * Formats a YYYY-MM-DD string to a human-friendly display (e.g. 'Wednesday, Aug 20, 2026').
 */
export function formatDateDisplay(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  const dayName = DAYS_OF_WEEK[date.getDay()];
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  return `${dayName}, ${monthName} ${day}, ${year}`;
}

/**
 * Formats an ISO timestamp string to localized short time (e.g., '02:32 PM').
 */
export function formatTimeDisplay(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Returns current local time formatted as HH:mm:ss.
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Resolves the operational `time` and `createdAt` timestamp for an interaction.
 *
 * DOMAIN INVARIANT:
 * If an interaction date is earlier than today's date (historical entry),
 * the operational time falls back to midnight ('00:00:00') and createdAt to midnight local time.
 * This prevents historical log imports or late retrospective entries from distorting
 * current shift volume and timing metrics.
 */
export function resolveInteractionTimestamp(dateString: string): { time: string; createdAt: string } {
  const today = getTodayDateString();

  if (dateString && dateString < today) {
    const [year, month, day] = dateString.split('-').map(Number);
    const historicalDate =
      year && month && day
        ? new Date(year, month - 1, day, 0, 0, 0)
        : new Date(dateString);
    return {
      time: '00:00:00',
      createdAt: historicalDate.toISOString(),
    };
  }

  const now = new Date();
  return {
    time: getCurrentTimeString(),
    createdAt: now.toISOString(),
  };
}
