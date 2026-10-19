import { describe, expect, it } from 'vitest';
import { ADMIN_RESOURCE_CONFIGS } from '../adminResourceConfig';
import { sanitizeResourcePayload, validateResourcePayload } from '../adminFormValidation';

const quickStartConfig = ADMIN_RESOURCE_CONFIGS['admin-quick-start-guides'];

describe('Quick Start Guide optional difficulty', () => {
  it('starts the modal select blank and stores no selection as null', () => {
    const modalValues = Object.fromEntries(
      quickStartConfig.fields.map((field) => [
        field.key,
        field.type === 'tags' ? field.defaultValue || [] : field.defaultValue ?? '',
      ])
    );
    const values = {
      ...modalValues,
      name: 'Quick Setup',
      url: 'https://example.com/quick',
    };

    expect(modalValues.difficulty).toBe('');
    expect(validateResourcePayload(quickStartConfig, values).isValid).toBe(true);
    expect(sanitizeResourcePayload(quickStartConfig, values).difficulty).toBeNull();
  });

  it.each([
    ['blank', ''],
    ['whitespace', '   '],
    ['omitted', undefined],
    ['null', null],
  ])('normalizes %s difficulty to null', (_case, difficulty) => {
    const values: Record<string, unknown> = {
      name: 'Quick Setup',
      url: 'https://example.com/quick',
    };
    if (difficulty !== undefined) values.difficulty = difficulty;

    expect(validateResourcePayload(quickStartConfig, values).isValid).toBe(true);
    expect(sanitizeResourcePayload(quickStartConfig, values).difficulty).toBeNull();
  });

  it('preserves a selected valid difficulty', () => {
    const values = {
      name: 'Quick Setup',
      url: 'https://example.com/quick',
      difficulty: 'Advanced',
    };

    expect(validateResourcePayload(quickStartConfig, values).isValid).toBe(true);
    expect(sanitizeResourcePayload(quickStartConfig, values).difficulty).toBe('Advanced');
  });

  it('clears difficulty on update without including active status', () => {
    const sanitized = sanitizeResourcePayload(
      quickStartConfig,
      {
        name: 'Quick Setup',
        url: 'https://example.com/quick',
        difficulty: '',
        is_active: false,
      },
      'update'
    );

    expect(sanitized.difficulty).toBeNull();
    expect(sanitized).not.toHaveProperty('is_active');
  });
});
