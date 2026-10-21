import { describe, expect, it } from 'vitest';
import {
  getDefaultSupportLicense,
  isLicenseActive,
  isSupportLicenseActive,
  isSupportTierActive,
  resolveSupportLicenseSelection,
  toDisplayLabel,
  toSpreadsheetLabel,
} from '../license';

describe('support license status', () => {
  it.each([
    ['support_active', true],
    ['yes', true],
    ['premium_active', false],
    ['support_inactive', false],
    ['inactive', false],
    ['renewal_sent', false],
  ])('classifies %s as active=%s', (license, expected) => {
    expect(isLicenseActive(license)).toBe(expected);
  });

  it('uses the configured default independently from active status', () => {
    const defaultInactiveTier = {
      code: 'support_inactive',
      label: 'Support Inactive',
      exportLabel: 'No',
      isDefault: true,
    };

    expect(getDefaultSupportLicense([defaultInactiveTier])).toBe('support_inactive');
    expect(isSupportTierActive(defaultInactiveTier)).toBe(false);
  });

  it('uses configured export labels to classify custom tier status', () => {
    expect(isSupportTierActive({ code: 'premium', exportLabel: 'Yes' })).toBe(true);
    expect(isSupportTierActive({ code: 'premium', exportLabel: 'No' })).toBe(false);
    expect(isSupportTierActive({ code: 'support_active', exportLabel: 'No' })).toBe(false);
    expect(isSupportLicenseActive('support_active', [{ code: 'support_active', exportLabel: 'No' }])).toBe(false);
    expect(isSupportLicenseActive('premium', [{ code: 'premium', exportLabel: 'Yes' }])).toBe(true);
  });

  it('applies a delayed default only while the fallback is untouched', () => {
    const tiers = [
      { code: 'premium', label: 'Premium', exportLabel: 'Yes', isDefault: true },
      { code: 'support_inactive', label: 'Inactive', exportLabel: 'No' },
    ];

    expect(resolveSupportLicenseSelection('support_active', [], {})).toBe('support_active');
    expect(resolveSupportLicenseSelection('support_active', tiers, {})).toBe('premium');
    expect(resolveSupportLicenseSelection('support_active', tiers, { userSelected: true })).toBe('support_active');
    expect(resolveSupportLicenseSelection('legacy_custom', tiers, { storedLicense: 'legacy_custom' })).toBe('legacy_custom');
  });

  it('keeps a valid non-default selection when tiers load', () => {
    const tiers = [
      { code: 'premium', label: 'Premium', exportLabel: 'Yes', isDefault: true },
      { code: 'support_inactive', label: 'Inactive', exportLabel: 'No' },
    ];

    expect(resolveSupportLicenseSelection('support_inactive', tiers)).toBe('support_inactive');
  });

  it('keeps inactive labels when no support tier is available', () => {
    expect(toDisplayLabel('support_inactive')).toBe('Support Inactive');
    expect(toSpreadsheetLabel('support_inactive')).toBe('Support Inactive');
  });
});
