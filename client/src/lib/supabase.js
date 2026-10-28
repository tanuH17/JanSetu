import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation helper to detect placeholder or missing configuration
export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

export const supabaseConfigErrors = !isConfigured
  ? [
      !supabaseUrl ? 'Missing VITE_SUPABASE_URL' : null,
      !supabaseAnonKey ? 'Missing VITE_SUPABASE_ANON_KEY' : null,
      supabaseUrl && supabaseUrl.includes('your-project-ref') ? 'VITE_SUPABASE_URL still has placeholder value' : null,
      supabaseAnonKey && supabaseAnonKey.includes('your-supabase-anon-key') ? 'VITE_SUPABASE_ANON_KEY still has placeholder value' : null,
    ].filter(Boolean)
  : [];

// Initialize real client if configured, otherwise provide safe fallback to prevent app crashing
let clientInstance;

if (isConfigured) {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  // Safe stub when credentials are not yet entered by user
  console.warn(
    'JanSetu: Supabase credentials are not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );

  const unconfiguredResponse = () =>
    Promise.resolve({
      data: null,
      error: {
        message: 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
      },
    });

  clientInstance = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: unconfiguredResponse,
      signUp: unconfiguredResponse,
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: unconfiguredResponse,
      updateUser: unconfiguredResponse,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: unconfiguredResponse,
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: unconfiguredResponse,
      update: () => ({
        eq: unconfiguredResponse,
      }),
    }),
  };
}

export const supabase = clientInstance;
export const isSupabaseConfigured = isConfigured;
