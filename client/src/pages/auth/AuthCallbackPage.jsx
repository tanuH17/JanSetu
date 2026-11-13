import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardPathForRole } from '../../lib/constants';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import AuthCard from '../../components/auth/AuthCard';
import Alert from '../../components/common/Alert';

export default function AuthCallbackPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Verifying your credentials…');

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);

        const errorParam = params.get('error') || hashParams.get('error');
        const errorDescription = params.get('error_description') || hashParams.get('error_description');
        const type = params.get('type') || hashParams.get('type');
        const code = params.get('code');

        if (errorParam || errorDescription) {
          setError(errorDescription || errorParam || 'Authentication failed. Please request a new link.');
          return;
        }

        // 1. PKCE Code Exchange: Critical for modern Supabase recovery and sign-in links
        if (code) {
          setStatusMessage('Exchanging authorization token…');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setError(exchangeError.message || 'The authorization code is invalid or has expired.');
            }
            return;
          }
        }

        // 2. Read authenticated session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError) {
          setError('This confirmation or recovery link is invalid or has expired.');
          return;
        }

        // 3. Route to password reset if this was a recovery flow
        if (type === 'recovery' || hashParams.get('type') === 'recovery') {
          navigate('/reset-password', { replace: true });
          return;
        }

        // 4. Standard email confirmation or sign-in: route to authorized dashboard
        if (sessionData?.session?.user) {
          setStatusMessage('Loading user profile…');
          const loaded = (await refreshProfile()) || profile;
          navigate(dashboardPathForRole(loaded?.role), { replace: true });
          return;
        }

        // 5. If no session was established and no recovery requested:
        navigate('/verify-email', { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'An unexpected error occurred while completing authentication.');
        }
      }
    }

    completeAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, profile, refreshProfile]);

  return (
    <div className="py-12 px-4 max-w-md mx-auto">
      <AuthCard
        title="Completing Verification"
        subtitle="Please wait while we verify your session with the JanSetu identity service."
        badgeText="Authentication"
      >
        {error ? (
          <div className="space-y-4">
            <Alert type="error" message={error} />
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Request a New Reset Link
              </Link>
              <Link
                to="/citizen/sign-in"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-600">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
            <p className="text-sm font-medium">{statusMessage}</p>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
