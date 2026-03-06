import { supabase } from './supabase';
import { setUser, clearUser } from '@/store/slices/auth-slice';
import type { AppDispatch } from '@/store';
import { getPublicKey } from './encryption';

export async function login(email: string, password: string, dispatch: AppDispatch): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user!;
  dispatch(setUser({
    uid: user.id,
    email: user.email ?? email,
    displayName: user.user_metadata?.display_name ?? null,
  }));
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  dispatch: AppDispatch,
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  const user = data.user!;

  // Upsert profile row with public key so encryption works immediately
  await supabase.from('users').upsert({
    id: user.id,
    email,
    display_name: displayName,
    public_key: getPublicKey(),
  });

  dispatch(setUser({ uid: user.id, email, displayName }));
}

export async function logout(dispatch: AppDispatch): Promise<void> {
  await supabase.auth.signOut();
  dispatch(clearUser());
}

export async function restoreSession(dispatch: AppDispatch): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const user = session.user;
  dispatch(setUser({
    uid: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.display_name ?? null,
  }));
  return true;
}
