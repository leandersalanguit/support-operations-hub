/**
 * @file types.ts
 * @description Domain types for support agents, roles, and identity.
 */

export type UserRole = 'team_lead' | 'support_agent';

export interface AgentProfile {
  id: string;
  email: string;
  displayName: string;
  fullName: string;
  role: UserRole;
}

export interface AuthUserLike {
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}
