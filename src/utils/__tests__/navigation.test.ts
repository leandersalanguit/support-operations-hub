import { describe, it, expect } from 'vitest';
import { isTabInGroup } from '../navigation';

describe('navigation utilities', () => {
  describe('isTabInGroup', () => {
    it('returns true when activeTab is in groupKeys', () => {
      const group = ['installer', 'manuals', 'marketing-folders'];
      expect(isTabInGroup('installer', group)).toBe(true);
      expect(isTabInGroup('manuals', group)).toBe(true);
    });

    it('returns false when activeTab is not in groupKeys', () => {
      const group = ['installer', 'manuals'];
      expect(isTabInGroup('shift-summary', group)).toBe(false);
      expect(isTabInGroup('admin-dashboard', group)).toBe(false);
    });

    it('handles empty inputs gracefully', () => {
      expect(isTabInGroup('', ['installer'])).toBe(false);
      expect(isTabInGroup('installer', [])).toBe(false);
    });
  });
});
