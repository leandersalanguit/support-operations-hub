import { describe, it, expect } from 'vitest';
import {
  getDayOfWeekFromDate,
  formatDateDisplay,
  resolveInteractionTimestamp,
  getTodayDateString,
} from '../timestamp';

describe('Domain - Timestamp & Operational Date Utilities', () => {
  describe('getDayOfWeekFromDate', () => {
    it('returns the correct day of week avoiding UTC day shift', () => {
      expect(getDayOfWeekFromDate('2026-09-10')).toBe('Thursday');
      expect(getDayOfWeekFromDate('2026-09-09')).toBe('Wednesday');
      expect(getDayOfWeekFromDate('2026-09-06')).toBe('Sunday');
    });

    it('returns empty string for invalid or empty dates', () => {
      expect(getDayOfWeekFromDate('')).toBe('');
      expect(getDayOfWeekFromDate('invalid')).toBe('');
    });
  });

  describe('formatDateDisplay', () => {
    it('formats YYYY-MM-DD into readable human string', () => {
      expect(formatDateDisplay('2026-09-10')).toBe('Thursday, Sep 10, 2026');
    });
  });

  describe('resolveInteractionTimestamp', () => {
    it('forces time to 00:00:00 for historical dates prior to today', () => {
      const historicalDate = '2025-01-01';
      const result = resolveInteractionTimestamp(historicalDate);
      expect(result.time).toBe('00:00:00');
      expect(new Date(result.createdAt).getFullYear()).toBe(2025);
    });

    it('preserves current operational time for today', () => {
      const today = getTodayDateString();
      const result = resolveInteractionTimestamp(today);
      expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(result.time).not.toBe('00:00:00');
    });
  });
});
