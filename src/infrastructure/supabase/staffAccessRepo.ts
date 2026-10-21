import { UserRole } from '../../domain/identity/types';
import { supabase } from './client';

export interface StaffAccessState {
  userId: string;
  role: UserRole;
  active: boolean;
  passwordChangeRequired: boolean;
}

export function isStaffAccessRestricted(
  state: StaffAccessState | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  return !currentUserId || !state || state.userId !== currentUserId || !state.active || state.passwordChangeRequired;
}

export async function getMyAccessState(): Promise<StaffAccessState | null> {
  const { data, error } = await supabase.rpc('get_my_access_state');
  if (error) throw new Error('Unable to verify staff access.');

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  if (
    typeof row.user_id !== 'string' ||
    (row.role !== 'team_lead' && row.role !== 'support_agent') ||
    typeof row.active !== 'boolean' ||
    typeof row.password_change_required !== 'boolean'
  ) {
    throw new Error('Unable to verify staff access.');
  }

  return {
    userId: row.user_id,
    role: row.role,
    active: row.active,
    passwordChangeRequired: row.password_change_required,
  };
}
