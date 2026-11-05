import { createClient } from '@/lib/supabase/client';
import type { Language, User } from '@/types';

const PROFILE_COLUMNS = 'id, email, name, target_languages, cecrl_level_by_lang, created_at';

export async function fetchProfile(uid: string): Promise<User | null> {
  const { data, error } = await createClient()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data as User | null;
}

/** Only name and target_languages are editable: email and CECRL levels are not. */
export async function updateProfile(
  uid: string,
  changes: { name: string; target_languages: Language[] }
): Promise<User> {
  const { data, error } = await createClient()
    .from('profiles')
    .update(changes)
    .eq('id', uid)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return data as User;
}

export function getDisplayName(profile: Pick<User, 'name' | 'email'> | null): string {
  return profile?.name?.trim() || profile?.email?.split('@')[0] || '';
}
