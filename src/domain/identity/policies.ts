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
  ownerUserId: string | null | undefined,
  currentUser: AuthUserLike | null | undefined,
  role?: UserRole
): boolean {
  if (!currentUser?.id) return false;
  const effectiveRole = role || getUserRole(currentUser);
  if (effectiveRole === 'team_lead') return true;
  return Boolean(ownerUserId && ownerUserId === currentUser.id);
}

export function hasAuthenticatedUserChanged(previousUserId: string | null, nextUserId: string): boolean {
  return Boolean(previousUserId && previousUserId !== nextUserId);
}

/**
 * Checks whether the current user is authorized to perform an edit or delete action
 * on a given interaction. Returns a boolean and a formatted error message if forbidden.
 */
export function checkInteractionModificationPermission(
  action: 'edit' | 'delete',
  ownerUserId: string | null | undefined,
  currentUser: AuthUserLike | null | undefined,
  userRole?: UserRole
): { allowed: boolean; errorMessage?: string } {
  const allowed = canModifyInteractionPolicy(ownerUserId, currentUser, userRole);
  if (!allowed) {
    const actionLabel = action === 'edit' ? 'edit' : 'delete';
    return {
      allowed: false,
      errorMessage: `You are only authorized to ${actionLabel} your own entries. Team Leads can ${actionLabel} any entry.`,
    };
  }
  return { allowed: true };
}
