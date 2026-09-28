import { describe, it, expect } from 'vitest';
import {
  sanitizeCatalogProductName,
  validateCatalogProductName,
} from '../validation';

describe('sanitizeCatalogProductName', () => {
  it('strips leading and trailing whitespace', () => {
    expect(sanitizeCatalogProductName('  Spire Photo Booth  ')).toBe('Spire Photo Booth');
  });

  it('collapses multiple internal whitespace into a single space', () => {
    expect(sanitizeCatalogProductName('Mirror   Me    Booth')).toBe('Mirror Me Booth');
    expect(sanitizeCatalogProductName('Retro\t\tBooth\n')).toBe('Retro Booth');
  });

  it('handles null, undefined, or empty string gracefully', () => {
    expect(sanitizeCatalogProductName('')).toBe('');
    expect(sanitizeCatalogProductName(undefined)).toBe('');
    expect(sanitizeCatalogProductName(null)).toBe('');
  });

  it('strips non-printable ASCII control characters', () => {
    const raw = 'Spire\u0000\u001F Pro';
    expect(sanitizeCatalogProductName(raw)).toBe('Spire Pro');
  });
});

describe('validateCatalogProductName', () => {
  const existingProducts = ['Mirror Me Booth', 'Retro Booth', 'Spire', 'Air Graffiti'];

  it('rejects empty or whitespace-only product name', () => {
    const res = validateCatalogProductName('   ', existingProducts);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/cannot be empty/i);
  });

  it('rejects product names shorter than 2 characters', () => {
    const res = validateCatalogProductName('A', existingProducts);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/at least 2 characters/i);
  });

  it('rejects product names longer than 100 characters', () => {
    const longName = 'A'.repeat(101);
    const res = validateCatalogProductName(longName, existingProducts);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/cannot exceed 100 characters/i);
  });

  it('rejects duplicate names case-insensitively', () => {
    const res = validateCatalogProductName('spire', existingProducts);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/already exists/i);

    const res2 = validateCatalogProductName('  MIRROR ME BOOTH  ', existingProducts);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toMatch(/already exists/i);
  });

  it('allows keeping the same name during a rename operation', () => {
    const res = validateCatalogProductName('Spire', existingProducts, 'Spire');
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('accepts valid distinct product names', () => {
    const res = validateCatalogProductName('Spire Pro Edition', existingProducts);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
