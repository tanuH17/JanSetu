import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigErrors } from '../lib/supabase';
import { normalizeEmail } from '../lib/validation';
import { publicAuthErrorMessage } from '../lib/authErrors';

const AuthContext = createContext(null);

const PROFILE_SELECT = `
  id,
  full_name,
  phone_number,
  role,
  state,
  district,
  constituency,
  department_id,
  designation,
  bio,
  is_verified,
  created_at,
  updated_at,
  departments:department_id (
    id,
    name,
    code,
    jurisdiction
  )
`;

async function loadProfile(userId, attempts = 3) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
    if (!error && data) return data;
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
  }
  if (lastError) {
    console.warn('Profile fetch failed');
  }
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null);
      return null;
    }
    const data = await loadProfile(userId);
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        if (mounted) setAuthError(publicAuthErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signUpCitizen = async ({ email, password, fullName, phoneNumber, state, district, constituency }) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: { message: 'Supabase credentials are not configured. See the setup notice at the top of the screen.' },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone_number: phoneNumber ? phoneNumber.trim() : null,
          state: state || 'Uttar Pradesh',
          district: district || 'Lucknow',
          constituency: constituency || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      const message = publicAuthErrorMessage(error, 'signup');
      setAuthError(message);
      return { data: null, error: { message } };
    }

    return { data, error: null };
  };

  const signIn = async ({ email, password, expectedRole }) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: { message: 'Supabase credentials are not configured. Add them in client/.env.local.' },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      const message = publicAuthErrorMessage(error, 'signin');
      setAuthError(message);
      return { data: null, error: { message } };
    }

    const loadedProfile = await fetchProfile(data.user.id);

    if (expectedRole && loadedProfile?.role !== expectedRole) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      const message =
        'This portal is reserved for authorized accounts. Signing in here does not grant extra permissions.';
      setAuthError(message);
      return { data: null, error: { message } };
    }

    if (expectedRole && !loadedProfile) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      const message = 'Your account profile could not be verified. Contact a project administrator.';
      return { data: null, error: { message } };
    }

    return { data, profile: loadedProfile, error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthError(null);
    }
  };

  const requestPasswordReset = async (email) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase is not configured yet.' } };
    }
    return supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
  };

  const updateUserPassword = async (newPassword) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase is not configured yet.' } };
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { data: null, error: { message: publicAuthErrorMessage(error, 'reset') } };
    }
    return { data, error: null };
  };

  const refreshProfile = async () => {
    if (user) return fetchProfile(user.id);
    return null;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    configErrors: supabaseConfigErrors,
    signUpCitizen,
    signIn,
    signOut,
    requestPasswordReset,
    updateUserPassword,
    refreshProfile,
    role: profile?.role ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
