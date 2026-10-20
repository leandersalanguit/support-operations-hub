import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { createPasswordChangeHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const allowedOrigins = (Deno.env.get('SUPPORT_HUB_ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!supabaseUrl || !anonKey || !serviceRoleKey || allowedOrigins.length === 0) {
  throw new Error('Required password-change function configuration is missing.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const handler = createPasswordChangeHandler({
  allowedOrigins,
  verifyUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  },
  getAccessState: async (_userId, token) => {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await userClient.rpc('get_my_access_state');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? { active: row.active === true, password_change_required: row.password_change_required === true } : null;
  },
  consumeAttempt: async (userId) => {
    const { data, error } = await admin.rpc('consume_password_change_attempt', { p_user_id: userId });
    if (error) throw error;
    return data === true;
  },
  updatePassword: async (userId, newPassword) => {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;
  },
  completePasswordChange: async (userId) => {
    const { data, error } = await admin.rpc('complete_required_password_change', { p_user_id: userId });
    if (error) throw error;
    return data === true;
  },
});

Deno.serve(handler);
