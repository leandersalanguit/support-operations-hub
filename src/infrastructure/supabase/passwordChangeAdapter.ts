import { supabase } from './client';

export async function completeRequiredPasswordChange(newPassword: string): Promise<void> {
  const { error } = await supabase.functions.invoke('complete-password-change', {
    body: { newPassword },
  });
  if (error) {
    throw new Error(error.message || 'Password change is temporarily unavailable.');
  }
}
