import { createClient } from '@supabase/supabase-js';
import { clearRememberedPasswordRecovery, rememberPasswordRecoverySession } from '@/lib/passwordRecovery';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurationError = !supabaseUrl || !supabaseAnonKey;

// Keep the JS bundle bootable so a bad release shows a useful error instead of
// a blank WebView. This placeholder never grants access and is not used when
// the required public Supabase configuration exists.
const configuredUrl = supabaseUrl || 'https://unconfigured.zynergia.invalid';
const configuredAnonKey = supabaseAnonKey || 'unconfigured-public-anon-key';

const authStorageKey = `sb-${new URL(configuredUrl).hostname.split('.')[0]}-auth-token`;

export function clearLocalSupabaseSession() {
  if (typeof localStorage === 'undefined') return;
  for (const key of [authStorageKey, `${authStorageKey}-code-verifier`, `${authStorageKey}-user`]) {
    localStorage.removeItem(key);
  }
}

// The anon key is intentionally public. Authorization still depends on RLS;
// privileged keys must never be bundled in the web or mobile client.
export const supabase = createClient(configuredUrl, configuredAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Register before React's lazy routes mount so PASSWORD_RECOVERY cannot be missed.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') rememberPasswordRecoverySession(session);
  if (event === 'SIGNED_OUT') clearRememberedPasswordRecovery();
});
