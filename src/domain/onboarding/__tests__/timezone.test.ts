import { describe, it, expect } from 'vitest';
import {
  convertPhtSlotToClientTimezone,
  formatClientSlotMessage,
  resolveTimezoneDisplayName,
  COMMON_CLIENT_TIMEZONES,
} from '../timezone';

describe('onboarding timezone conversion', () => {
  it('converts Sunday 9:00 PM PHT to Sunday morning Pacific Time (PDT)', () => {
    // 2026-08-09 is a Sunday
    const result = convertPhtSlotToClientTimezone(
      '2026-08-09',
      '21:00',
      '22:00',
      'America/Los_Angeles'
    );

    expect(result.clientDayOfWeek).toBe('Sunday');
    expect(result.clientMonthAndDay).toBe('August 9');
    expect(result.clientTime).toBe('6:00 AM');
    expect(result.clientTimezoneName).toBe('Pacific Time');
    expect(result.phtTimeDisplay).toBe('9:00 PM PHT');
  });

  it('converts Monday 1:00 AM PHT to previous day (Sunday) Pacific Time', () => {
    // 2026-08-10 is Monday in PH; in US Pacific it is Sunday morning
    const result = convertPhtSlotToClientTimezone(
      '2026-08-10',
      '01:00',
      '02:00',
      'America/Los_Angeles'
    );

    expect(result.clientDayOfWeek).toBe('Sunday');
    expect(result.clientMonthAndDay).toBe('August 9');
    expect(result.clientTime).toBe('10:00 AM');
    expect(result.clientTimezoneName).toBe('Pacific Time');
  });

  it('converts PHT to Eastern Time correctly', () => {
    // Sunday 9:00 PM PHT = Sunday 9:00 AM EDT
    const result = convertPhtSlotToClientTimezone(
      '2026-08-09',
      '21:00',
      '22:00',
      'America/New_York'
    );

    expect(result.clientDayOfWeek).toBe('Sunday');
    expect(result.clientMonthAndDay).toBe('August 9');
    expect(result.clientTime).toBe('9:00 AM');
    expect(result.clientTimezoneName).toBe('Eastern Time');
  });

  it('generates the exact requested simple copyable message format', () => {
    const formatted = formatClientSlotMessage(
      'Monday',
      'August 10',
      '8:00 PM',
      'Pacific Time'
    );

    expect(formatted).toBe(
      'We have an available slot on Monday, August 10, at 8:00 PM Pacific Time.\nKindly let us know if this time works for you.'
    );
  });

  it('resolves curated and fallback timezone display names', () => {
    expect(resolveTimezoneDisplayName('America/Los_Angeles')).toBe('Pacific Time');
    expect(resolveTimezoneDisplayName('America/New_York')).toBe('Eastern Time');
    expect(resolveTimezoneDisplayName('Europe/London')).toBe('UK Time');
    expect(COMMON_CLIENT_TIMEZONES.length).toBeGreaterThan(5);
  });
});
