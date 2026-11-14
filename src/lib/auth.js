import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Mismo inicio de sesión con Google que la web (proveedor Google de Supabase).
// En el celular se abre una ventana segura del sistema y vuelve a la app con un código.
WebBrowser.maybeCompleteAuthSession();

export const authRedirectUrl = () => Linking.createURL('auth');

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href, queryParams: { prompt: 'select_account' } } });
    if (error) throw error;
    return null;
  }
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // el usuario cerró la ventana
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  const problem = url.searchParams.get('error_description') || new URLSearchParams(url.hash.slice(1)).get('error_description');
  if (problem) throw new Error(problem.includes('redirect') ? 'Falta autorizar la app en Supabase (URL de retorno).' : problem);
  if (!code) throw new Error('Google no devolvió la sesión. Intenta de nuevo.');
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
  return exchange.data.session;
}

export const signOut = () => supabase.auth.signOut();

// Sesión de Supabase (cliente o dueño con Google) y si esa cuenta es administradora.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    // Igual que la web: la cuenta debe estar en admin_users (función is_admin del servidor).
    supabase.rpc('is_admin').then(({ data, error }) => setIsAdmin(!error && data === true));
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const user = session?.user || null;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  return { session, user, name, avatar: user?.user_metadata?.avatar_url || null, isAdmin, ready };
}
