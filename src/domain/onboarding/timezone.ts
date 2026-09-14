/**
 * @file timezone.ts
 * @description Pure domain functions for timezone conversion and customer slot messaging.
 * Converts Philippine Time (PHT, UTC+8) operational slots to the client's local date/time
 * and produces exact copyable outreach templates.
 */

import { ConvertedTimeResult, TimezoneOption } from './types';

export const COMMON_CLIENT_TIMEZONES: TimezoneOption[] = [
  // US & Canada
  {
    value: 'America/New_York',
    label: 'Eastern Time (US & Canada)',
    genericName: 'Eastern Time',
    group: 'US/Canada',
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (US & Canada)',
    genericName: 'Central Time',
    group: 'US/Canada',
  },
  {
    value: 'America/Denver',
    label: 'Mountain Time (US & Canada)',
    genericName: 'Mountain Time',
    group: 'US/Canada',
  },
  {
    value: 'America/Phoenix',
    label: 'Mountain Time - Arizona (no DST)',
    genericName: 'Mountain Standard Time',
    group: 'US/Canada',
  },
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (US & Canada)',
    genericName: 'Pacific Time',
    group: 'US/Canada',
  },
  {
    value: 'America/Anchorage',
    label: 'Alaska Time',
    genericName: 'Alaska Time',
    group: 'US/Canada',
  },
  {
    value: 'Pacific/Honolulu',
    label: 'Hawaii Time',
    genericName: 'Hawaii Time',
    group: 'US/Canada',
  },

  // Europe
  {
    value: 'Europe/London',
    label: 'London, Dublin (GMT/BST)',
    genericName: 'UK Time',
    group: 'Europe',
  },
  {
    value: 'Europe/Paris',
    label: 'Paris, Berlin, Rome (CET/CEST)',
    genericName: 'Central European Time',
    group: 'Europe',
  },

  // Asia / Pacific
  {
    value: 'Australia/Sydney',
    label: 'Sydney, Melbourne (AEST/AEDT)',
    genericName: 'Sydney Time',
    group: 'Asia/Pacific',
  },
  {
    value: 'Asia/Singapore',
    label: 'Singapore (SGT)',
    genericName: 'Singapore Time',
    group: 'Asia/Pacific',
  },
  {
    value: 'Asia/Tokyo',
    label: 'Tokyo, Osaka (JST)',
    genericName: 'Japan Time',
    group: 'Asia/Pacific',
  },
  {
    value: 'Asia/Manila',
    label: 'Philippine Time (PHT)',
    genericName: 'Philippine Time',
    group: 'Asia/Pacific',
  },
];

/**
 * Normalizes HH:mm or HH:mm:ss to standard HH:mm:ss.
 */
function normalizeTime(time: string): string {
  const parts = time.split(':');
  const h = (parts[0] || '00').padStart(2, '0');
  const m = (parts[1] || '00').padStart(2, '0');
  const s = (parts[2] || '00').padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Resolves a readable timezone display name (e.g. 'Pacific Time' or 'Eastern Time').
 */
export function resolveTimezoneDisplayName(ianaTimezone: string): string {
  const matched = COMMON_CLIENT_TIMEZONES.find((t) => t.value === ianaTimezone);
  if (matched) {
    return matched.genericName;
  }

  try {
    // Attempt to extract localized generic name via Intl
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'longGeneric',
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      return tzPart.value;
    }
  } catch {
    // Fall back to clean city/region from IANA string
  }

  const parts = ianaTimezone.split('/');
  return (parts[parts.length - 1] || ianaTimezone).replace(/_/g, ' ');
}

/**
 * Formats the exact client outreach invitation message.
 *
 * Example:
 * "We have an available slot on Monday, August 10, at 8:00 PM Pacific Time.
 * Kindly let us know if this time works for you."
 */
export function formatClientSlotMessage(
  clientDayOfWeek: string,
  clientMonthAndDay: string,
  clientTime: string,
  clientTimezoneName: string
): string {
  return `We have an available slot on ${clientDayOfWeek}, ${clientMonthAndDay}, at ${clientTime} ${clientTimezoneName}.\nKindly let us know if this time works for you.`;
}

/**
 * Converts a slot in Philippine Time (PHT, UTC+8) to the target client timezone.
 * Handles cross-midnight day shifts (e.g., Sunday 9 PM PHT = Sunday 6 AM PDT).
 *
 * @param slotDate YYYY-MM-DD in PHT
 * @param slotStartTime HH:mm or HH:mm:ss in PHT (e.g. '21:00')
 * @param slotEndTime HH:mm or HH:mm:ss in PHT (e.g. '22:00')
 * @param clientTimezone IANA timezone string (e.g. 'America/Los_Angeles')
 */
export function convertPhtSlotToClientTimezone(
  slotDate: string,
  slotStartTime: string,
  slotEndTime: string,
  clientTimezone: string
): ConvertedTimeResult {
  const startNormalized = normalizeTime(slotStartTime);
  const endNormalized = normalizeTime(slotEndTime);

  // Philippine Standard Time has a fixed offset of UTC+08:00 (no DST)
  const startIsoPht = `${slotDate}T${startNormalized}+08:00`;
  const endIsoPht = `${slotDate}T${endNormalized}+08:00`;

  const startDate = new Date(startIsoPht);
  const endDate = new Date(endIsoPht);

  const targetTz = clientTimezone || 'America/Los_Angeles';
  const tzDisplayName = resolveTimezoneDisplayName(targetTz);

  // Extract client localized parts
  const clientFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = clientFormatter.formatToParts(startDate);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const clientDayOfWeek = partMap.weekday || '';
  const clientMonth = partMap.month || '';
  const clientDay = partMap.day || '';
  const clientYear = partMap.year || '';
  const clientHour = partMap.hour || '';
  const clientMinute = partMap.minute || '';
  const clientDayPeriod = partMap.dayPeriod || '';

  const clientMonthAndDay = `${clientMonth} ${clientDay}`;
  const clientDate = `${clientDayOfWeek}, ${clientMonthAndDay}, ${clientYear}`;
  const clientTime = `${clientHour}:${clientMinute} ${clientDayPeriod}`.trim();

  // PHT display reference
  const phtDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const phtDateDisplay = phtDateFormatter.format(startDate);

  const phtTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const phtTimeDisplay = `${phtTimeFormatter.format(startDate)} PHT`;

  const copyableMessage = formatClientSlotMessage(
    clientDayOfWeek,
    clientMonthAndDay,
    clientTime,
    tzDisplayName
  );

  return {
    clientDate,
    clientDayOfWeek,
    clientMonthAndDay,
    clientTime,
    clientTimezoneName: tzDisplayName,
    phtDateDisplay,
    phtTimeDisplay,
    copyableMessage,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
}
