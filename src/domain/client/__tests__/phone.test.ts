import { describe, it, expect } from 'vitest';
import {
  formatPhoneNumber,
  validatePhoneNumber,
  sanitizePhoneInput,
  normalizeClientPhones,
  didAppendUSCountryCode,
} from '../phone';

describe('Domain - Phone Sanitization & Validation', () => {
  describe('validatePhoneNumber', () => {
    it('validates standard 10-digit US phone numbers', () => {
      const result = validatePhoneNumber('570-555-0143');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('validates international phone numbers with plus prefix', () => {
      const result = validatePhoneNumber('+44 20 7946 0950');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects incomplete numbers with fewer than 7 digits', () => {
      const result = validatePhoneNumber('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/at least 7 digits/i);
    });

    it('rejects empty or whitespace phone strings', () => {
      const result = validatePhoneNumber('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/required/i);
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10-digit US number with +1 prefix and space grouping', () => {
      expect(formatPhoneNumber('5705550143')).toBe('+1 570 555 0143');
    });

    it('formats 11-digit number starting with 1 as standard US', () => {
      expect(formatPhoneNumber('15705550143')).toBe('+1 570 555 0143');
    });

    it('preserves and normalizes UK country code (+44)', () => {
      const formatted = formatPhoneNumber('+44 207 946 0950');
      expect(formatted).toBe('+44 207 946 0950');
    });
  });

  describe('sanitizePhoneInput', () => {
    it('strips letters and disallowed punctuation while keeping valid phone symbols', () => {
      expect(sanitizePhoneInput('(570) 555-0143 ext. 12')).toBe('(570) 555-0143 . 12');
    });
  });

  describe('normalizeClientPhones', () => {
    it('extracts and deduplicates phones from ClientPhoneCarrier object', () => {
      const carrier = {
        phoneNumber: '570-555-0143',
        phoneNumbers: ['570-555-0143', '+1 (570) 555-0199'],
      };
      const normalized = normalizeClientPhones(carrier);
      expect(normalized).toContain('+1 570 555 0143');
      expect(normalized).toContain('+1 570 555 0199');
      expect(normalized.length).toBe(2);
    });

    it('returns empty array when client is null or undefined', () => {
      expect(normalizeClientPhones(null)).toEqual([]);
      expect(normalizeClientPhones(undefined)).toEqual([]);
    });
  });

  describe('didAppendUSCountryCode', () => {
    it('returns true if a 10-digit number without country code gets +1 prepended', () => {
      const formatted = formatPhoneNumber('5705550143');
      expect(didAppendUSCountryCode('5705550143', formatted)).toBe(true);
    });

    it('returns false if an explicit country code was already supplied', () => {
      const formattedUk = formatPhoneNumber('+44 20 7946 0950');
      expect(didAppendUSCountryCode('+44 20 7946 0950', formattedUk)).toBe(false);

      const formattedUs = formatPhoneNumber('+1 570 555 0143');
      expect(didAppendUSCountryCode('+1 570 555 0143', formattedUs)).toBe(false);
    });
  });
});
