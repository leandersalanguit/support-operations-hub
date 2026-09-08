/**
 * @file policies.ts
 * @description Pure domain policies governing identity display conventions and
 * role-based authorization to modify or delete interactions.
 */

import { UserRole, AuthUserLike } from './types';

/**
 * Extracts the user's role strictly from server-controlled auth metadata (app_metadata).
 */
export function getUserRole(user: AuthUserLike | null | undefined): UserRole {
  if (!user) return 'support_agent';
  const role = user.app_metadata?.role;
  if (role === 'team_lead' || role === 'lead' || role === 'admin') {
    return 'team_lead';
  }
  return 'support_agent';
}

/**
 * Checks if the user is a Team Lead.
 */
export function isTeamLead(user: AuthUserLike | null | undefined): boolean {
  return getUserRole(user) === 'team_lead';
}

/**
 * Formats a raw agent name, handle, or email into "First Name + Last Initial" (e.g. "Michael S.").
 */
export function formatAgentDisplayName(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return '';
  const cleanInput = raw.includes('@') ? raw.split('@')[0] : raw;
  const parts = cleanInput.trim().split(/[._\s]+/).filter(Boolean);
  if (parts.length === 0) return '';

  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  if (parts.length === 1) {
    return firstName;
  }

  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Extracts only the first name (e.g. "Michael", "Alex") for compact displays & exports.
 */
export function getAgentFirstName(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return '';
  const cleanInput = raw.includes('@') ? raw.split('@')[0] : raw;
  const parts = cleanInput.trim().split(/[._\s]+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
}

/**
 * Formats any raw agent string into full name format (e.g. "Michael Scott").
 */
export function formatAgentFullName(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return '';
  const cleanInput = raw.includes('@') ? raw.split('@')[0] : raw;
  const parts = cleanInput.trim().split(/[._\s]+/).filter(Boolean);
  if (parts.length === 0) return '';

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes an email or handle input (e.g. "alex" -> "alex@shift.local").
 */
export function normalizeAuthEmail(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.includes('@')) {
    return `${trimmed.toLowerCase()}@shift.local`;
  }
  return trimmed.toLowerCase();
}

/**
 * Authorization Policy: Checks whether the current user is permitted to edit or delete an interaction.
 *
 * Rules:
 * - Team leads can always edit and delete any entry.
 * - Support agents can only edit or delete entries authored by themselves.
 */
export function canModifyInteractionPolicy(
  interactionAgent: string | undefined | null,
  currentUser: AuthUserLike | null | undefined,
  userRole?: UserRole,
  currentAgentName?: string
): boolean {
  if (!interactionAgent) return false;

  const effectiveRole = userRole || getUserRole(currentUser);
  if (effectiveRole === 'team_lead' || isTeamLead(currentUser)) {
    return true;
  }

  const rawItemAgent = interactionAgent.trim();
  if (!rawItemAgent) return false;

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const userDisplay = currentAgentName || formatAgentDisplayName(currentUser?.user_metadata?.name || currentUser?.email);
  const userFull = formatAgentFullName(currentUser?.user_metadata?.name || currentUser?.email);
  const userEmail = currentUser?.email || '';
  const userMetaName = currentUser?.user_metadata?.name || '';
  const userFirst = getAgentFirstName(userDisplay) || getAgentFirstName(userEmail) || getAgentFirstName(userMetaName);

  const normItemAgent = normalize(rawItemAgent);
  const normFormattedItem = normalize(formatAgentDisplayName(rawItemAgent));
  const normFullItem = normalize(formatAgentFullName(rawItemAgent));

  const candidates = [
    userDisplay,
    formatAgentDisplayName(userDisplay),
    userFull,
    formatAgentFullName(userFull),
    userEmail,
    userEmail.split('@')[0],
    formatAgentDisplayName(userEmail),
    userMetaName,
    formatAgentDisplayName(userMetaName),
  ]
    .filter(Boolean)
    .map((s) => normalize(s));

  if (
    candidates.includes(normItemAgent) ||
    candidates.includes(normFormattedItem) ||
    candidates.includes(normFullItem)
  ) {
    return true;
  }

  const itemFirst = normalize(getAgentFirstName(rawItemAgent));
  if (itemFirst && userFirst && itemFirst === normalize(userFirst)) {
    const itemFormatted = formatAgentDisplayName(rawItemAgent);
    const userFormatted = formatAgentDisplayName(userDisplay);
    if (itemFormatted && userFormatted) {
      return normalize(itemFormatted) === normalize(userFormatted);
    }
    return true;
  }

  return false;
}

/**
 * Checks whether the current user is authorized to perform an edit or delete action
 * on a given interaction. Returns a boolean and a formatted error message if forbidden.
 */
export function checkInteractionModificationPermission(
  action: 'edit' | 'delete',
  interactionAgent: string | undefined | null,
  currentUser: AuthUserLike | null | undefined,
  userRole?: UserRole,
  currentAgentName?: string
): { allowed: boolean; errorMessage?: string } {
  const allowed = canModifyInteractionPolicy(interactionAgent, currentUser, userRole, currentAgentName);
  if (!allowed) {
    const actionLabel = action === 'edit' ? 'edit' : 'delete';
    return {
      allowed: false,
      errorMessage: `You are only authorized to ${actionLabel} your own entries. Team Leads can ${actionLabel} any entry.`,
    };
  }
  return { allowed: true };
}
