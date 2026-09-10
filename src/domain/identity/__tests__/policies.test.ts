import { describe, it, expect } from 'vitest';
import {
  getUserRole,
  isTeamLead,
  formatAgentDisplayName,
  getAgentFirstName,
  formatAgentFullName,
  normalizeAuthEmail,
  canModifyInteractionPolicy,
  checkInteractionModificationPermission,
} from '../policies';

describe('Domain - Identity & Authorization Policies', () => {
  describe('getUserRole & isTeamLead', () => {
    it('identifies team_lead, lead, or admin role from app_metadata', () => {
      expect(getUserRole({ app_metadata: { role: 'team_lead' } })).toBe('team_lead');
      expect(getUserRole({ app_metadata: { role: 'admin' } })).toBe('team_lead');
      expect(getUserRole({ app_metadata: { role: 'lead' } })).toBe('team_lead');
      expect(isTeamLead({ app_metadata: { role: 'team_lead' } })).toBe(true);
    });

    it('defaults to support_agent if app_metadata role is absent or non-lead', () => {
      expect(getUserRole({ app_metadata: { role: 'agent' } })).toBe('support_agent');
      expect(getUserRole(null)).toBe('support_agent');
      expect(isTeamLead(null)).toBe(false);
    });
  });

  describe('Agent Name Formatters', () => {
    it('formats raw string into First Name + Last Initial', () => {
      expect(formatAgentDisplayName('michael.scott')).toBe('Michael S.');
      expect(formatAgentDisplayName('jim halpert')).toBe('Jim H.');
      expect(formatAgentDisplayName('dwight_schrute@dundermifflin.com')).toBe('Dwight S.');
      expect(formatAgentDisplayName('pam')).toBe('Pam');
    });

    it('extracts agent first name', () => {
      expect(getAgentFirstName('Michael Scott')).toBe('Michael');
      expect(getAgentFirstName('jim.halpert@dundermifflin.com')).toBe('Jim');
    });

    it('formats agent full name', () => {
      expect(formatAgentFullName('michael.scott')).toBe('Michael Scott');
      expect(formatAgentFullName('dwight_schrute')).toBe('Dwight Schrute');
    });

    it('normalizes local auth handle into email address', () => {
      expect(normalizeAuthEmail('jim')).toBe('jim@shift.local');
      expect(normalizeAuthEmail('pam@dundermifflin.com')).toBe('pam@dundermifflin.com');
    });
  });

  describe('canModifyInteractionPolicy', () => {
    const teamLeadUser = {
      id: 'lead-1',
      email: 'michael.scott@dundermifflin.com',
      app_metadata: { role: 'team_lead' },
      user_metadata: { name: 'Michael Scott' },
    };

    const agentUser = {
      id: 'agent-1',
      email: 'jim.halpert@dundermifflin.com',
      app_metadata: { role: 'support_agent' },
      user_metadata: { name: 'Jim Halpert' },
    };

    it('permits Team Lead to modify any agent interaction', () => {
      expect(canModifyInteractionPolicy('Dwight S.', teamLeadUser)).toBe(true);
      expect(canModifyInteractionPolicy('Jim H.', teamLeadUser)).toBe(true);
    });

    it('permits Support Agent to modify their own interaction', () => {
      expect(canModifyInteractionPolicy('Jim H.', agentUser, 'support_agent', 'Jim H.')).toBe(true);
      expect(canModifyInteractionPolicy('Jim Halpert', agentUser)).toBe(true);
    });

    it('forbids Support Agent from modifying another agent interaction', () => {
      expect(canModifyInteractionPolicy('Dwight S.', agentUser, 'support_agent', 'Jim H.')).toBe(false);
      expect(canModifyInteractionPolicy('Michael S.', agentUser, 'support_agent', 'Jim H.')).toBe(false);
    });

    it('returns structured permission result and message from checkInteractionModificationPermission', () => {
      const allowedResult = checkInteractionModificationPermission('edit', 'Jim H.', agentUser, 'support_agent', 'Jim H.');
      expect(allowedResult.allowed).toBe(true);

      const forbiddenResult = checkInteractionModificationPermission('delete', 'Dwight S.', agentUser, 'support_agent', 'Jim H.');
      expect(forbiddenResult.allowed).toBe(false);
      expect(forbiddenResult.errorMessage).toMatch(/only authorized to delete your own entries/i);
    });
  });
});
