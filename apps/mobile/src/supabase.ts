import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import type { AuthTokens } from '@criticool/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseAuthEnabled = Boolean(supabaseUrl && supabasePublishableKey);
export const supabaseRedirectUrl = 'criticool://auth/callback';
export const supabaseResetRedirectUrl = 'criticool://auth/reset-password';

export const supabase = supabaseAuthEnabled
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export type SupabaseSession = Session;

export function tokensFromSupabaseSession(session: SupabaseSession): AuthTokens {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    provider: 'supabase',
  };
}

export function supabaseSessionParamsFromUrl(url: string) {
  const paramString = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(paramString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}
