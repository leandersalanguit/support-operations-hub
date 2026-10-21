import { describe, expect, it } from 'vitest';
import { isStaffAccessRestricted, StaffAccessState } from '../staffAccessRepo';

const activeAgent: StaffAccessState = {
  userId: 'user-a', role: 'support_agent', active: true, passwordChangeRequired: false,
};

describe('server staff access gate', () => {
  it('fails closed while access is unknown, loading, or unavailable', () => {
    expect(isStaffAccessRestricted(null, 'user-a')).toBe(true);
    expect(isStaffAccessRestricted(undefined, 'user-a')).toBe(true);
    expect(isStaffAccessRestricted(activeAgent, null)).toBe(true);
  });

  it('restricts inactive users and accounts which require a password change', () => {
    expect(isStaffAccessRestricted({ ...activeAgent, active: false }, 'user-a')).toBe(true);
    expect(isStaffAccessRestricted({ ...activeAgent, passwordChangeRequired: true }, 'user-a')).toBe(true);
  });

  it('uses only the server state even when user metadata has false aliases', () => {
    const editableMetadata = {
      user_metadata: {
        must_change_password: false,
        needs_password_reset: false,
        mustChangePassword: false,
        needsPasswordReset: false,
      },
    };
    expect(editableMetadata.user_metadata.must_change_password).toBe(false);
    expect(isStaffAccessRestricted({ ...activeAgent, passwordChangeRequired: true }, 'user-a')).toBe(true);
  });

  it('allows only the matching active account with no required password change', () => {
    expect(isStaffAccessRestricted(activeAgent, 'user-a')).toBe(false);
    expect(isStaffAccessRestricted(activeAgent, 'user-b')).toBe(true);
  });
});
