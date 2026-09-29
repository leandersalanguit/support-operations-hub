import { describe, it, expect } from 'vitest';
import {
  isValidHttpUrl,
  validateResourcePayload,
  sanitizeResourcePayload,
} from '../adminFormValidation';
import { ADMIN_RESOURCE_CONFIGS } from '../adminResourceConfig';

describe('adminFormValidation utilities', () => {
  describe('isValidHttpUrl', () => {
    it('returns true for valid https and http URLs', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
      expect(isValidHttpUrl('http://subdomain.test.org/path/file.pdf?v=1')).toBe(true);
      expect(isValidHttpUrl('https://drive.google.com/drive/folders/12345')).toBe(true);
    });

    it('returns false for invalid URL strings', () => {
      expect(isValidHttpUrl('')).toBe(false);
      expect(isValidHttpUrl('just a string')).toBe(false);
      expect(isValidHttpUrl('ftp://ftp.example.com')).toBe(false);
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('validateResourcePayload', () => {
    it('requires name and url for installers while allowing optional fields to be omitted', () => {
      const installerConfig = ADMIN_RESOURCE_CONFIGS['admin-installers'];

      // Missing both required fields
      const resEmpty = validateResourcePayload(installerConfig, {});
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errors.name).toBeDefined();
      expect(resEmpty.errors.url).toBeDefined();

      // Only name provided, url missing
      const resOnlyName = validateResourcePayload(installerConfig, { name: 'FMPrint' });
      expect(resOnlyName.isValid).toBe(false);
      expect(resOnlyName.errors.url).toBeDefined();

      // Both minimal required fields provided with optional fields omitted
      const resValidMinimal = validateResourcePayload(installerConfig, {
        name: 'FMPrint',
        url: 'https://example.com/download.exe',
      });
      expect(resValidMinimal.isValid).toBe(true);
      expect(Object.keys(resValidMinimal.errors)).toHaveLength(0);
    });

    it('rejects malformed URL in url field', () => {
      const installerConfig = ADMIN_RESOURCE_CONFIGS['admin-installers'];
      const res = validateResourcePayload(installerConfig, {
        name: 'Bad Link Software',
        url: 'invalid-url-string',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.url).toContain('valid URL');
    });

    it('only requires name for case classifications', () => {
      const classConfig = ADMIN_RESOURCE_CONFIGS['admin-case-classifications'];

      const resEmpty = validateResourcePayload(classConfig, {});
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errors.name).toBeDefined();

      const resValid = validateResourcePayload(classConfig, { name: 'Account Issue' });
      expect(resValid.isValid).toBe(true);
    });

    it('validates minimal required fields for manuals, hardware, marketing, and quick start guides', () => {
      // Manuals: name & url required, format/version optional
      const manualRes = validateResourcePayload(ADMIN_RESOURCE_CONFIGS['admin-manuals'], {
        name: 'Booth Guide',
        url: 'https://example.com/manual.pdf',
      });
      expect(manualRes.isValid).toBe(true);

      // Hardware: name & url required, status/model optional
      const hwRes = validateResourcePayload(ADMIN_RESOURCE_CONFIGS['admin-recommended-hardware'], {
        name: 'DSLR Camera',
        url: 'https://example.com/camera',
      });
      expect(hwRes.isValid).toBe(true);

      // Marketing: name & url required
      const mktRes = validateResourcePayload(ADMIN_RESOURCE_CONFIGS['admin-marketing-folders'], {
        name: 'Brand Overlays',
        url: 'https://drive.google.com/assets',
      });
      expect(mktRes.isValid).toBe(true);

      // Quick start: name & url required
      const qsRes = validateResourcePayload(ADMIN_RESOURCE_CONFIGS['admin-quick-start-guides'], {
        name: 'Quick Setup',
        url: 'https://example.com/quick',
      });
      expect(qsRes.isValid).toBe(true);
    });
  });

  describe('sanitizeResourcePayload', () => {
    it('sets is_active to true and cleans arrays and empty values', () => {
      const installerConfig = ADMIN_RESOURCE_CONFIGS['admin-installers'];
      const sanitized = sanitizeResourcePayload(installerConfig, {
        name: '  Trimmed Name  ',
        url: ' https://example.com/app ',
        categories: ['Software', '   ', 'Tools'],
        version: '',
      });

      expect(sanitized.name).toBe('Trimmed Name');
      expect(sanitized.url).toBe('https://example.com/app');
      expect(sanitized.categories).toEqual(['Software', 'Tools']);
      expect(sanitized.is_active).toBe(true);
    });
  });
});
