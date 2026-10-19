import { describe, expect, it } from 'vitest';
import { sanitizeResourcePayload } from '../adminFormValidation';
import { ADMIN_RESOURCE_CONFIGS } from '../adminResourceConfig';

describe('admin resource status payloads', () => {
  const installerConfig = ADMIN_RESOURCE_CONFIGS['admin-installers'];

  it('keeps new resources active by default', () => {
    const sanitized = sanitizeResourcePayload(installerConfig, {
      name: 'New installer',
      url: 'https://example.com/installer',
    });

    expect(sanitized.is_active).toBe(true);
  });

  it('omits active status when sanitizing an update', () => {
    const sanitized = sanitizeResourcePayload(
      installerConfig,
      {
        name: 'Updated installer',
        url: 'https://example.com/installer',
        is_active: false,
      },
      'update'
    );

    expect(sanitized).not.toHaveProperty('is_active');
  });
});
