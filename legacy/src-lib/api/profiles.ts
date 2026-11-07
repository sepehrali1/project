import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const PROFILE_COLUMNS = 'id, username, display_name, bio, role, is_verified, is_banned, created_at';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateOwnProfile(userId: string, values: { display_name: string; bio: string }) {
  const { error } = await supabase.from('profiles').update(values).eq('id', userId);
  if (error) throw error;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) throw error;
  return data === true;
}
