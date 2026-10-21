import { describe, expect, it } from 'vitest';
import {
  canModifyInteractionPolicy,
  checkInteractionModificationPermission,
  hasAuthenticatedUserChanged,
} from '../policies';
import { AuthUserLike } from '../types';

const agentA: AuthUserLike = {
  id: 'user-a',
  email: 'same.name@example.test',
  user_metadata: { name: 'Alex Smith' },
};
const agentB: AuthUserLike = {
  id: 'user-b',
  email: 'other@example.test',
  user_metadata: { name: 'Alex Smith' },
};
const lead: AuthUserLike = { id: 'lead-id', app_metadata: { role: 'team_lead' } };

describe('canModifyInteractionPolicy', () => {
  it('detects a signed-in account switch without an intermediate signed-out event', () => {
    expect(hasAuthenticatedUserChanged('user-a', 'user-b')).toBe(true);
    expect(hasAuthenticatedUserChanged('user-a', 'user-a')).toBe(false);
    expect(hasAuthenticatedUserChanged(null, 'user-a')).toBe(false);
  });

  it('uses UUID ownership when names match or change', () => {
    expect(canModifyInteractionPolicy('user-a', agentA, 'support_agent')).toBe(true);
    expect(canModifyInteractionPolicy('user-b', agentA, 'support_agent')).toBe(false);
    expect(canModifyInteractionPolicy('user-a', agentB, 'support_agent')).toBe(false);
  });

  it('denies agents when the owner or authenticated user ID is missing', () => {
    expect(canModifyInteractionPolicy(undefined, agentA, 'support_agent')).toBe(false);
    expect(canModifyInteractionPolicy(null, agentA, 'support_agent')).toBe(false);
    expect(canModifyInteractionPolicy('user-a', { email: agentA.email }, 'support_agent')).toBe(false);
    expect(canModifyInteractionPolicy('user-a', null, 'team_lead')).toBe(false);
  });

  it('allows a team lead to modify owned and unresolved interactions', () => {
    expect(canModifyInteractionPolicy('user-a', lead, 'team_lead')).toBe(true);
    expect(canModifyInteractionPolicy(null, lead, 'team_lead')).toBe(true);
  });

  it('returns a permission message for an interaction owned by another UUID', () => {
    expect(checkInteractionModificationPermission('edit', 'user-b', agentA, 'support_agent')).toEqual({
      allowed: false,
      errorMessage: 'You are only authorized to edit your own entries. Team Leads can edit any entry.',
    });
    expect(checkInteractionModificationPermission('delete', 'user-a', agentA, 'support_agent')).toEqual({
      allowed: true,
    });
  });
});
