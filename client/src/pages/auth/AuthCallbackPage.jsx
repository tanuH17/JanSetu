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

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured yet.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorDescription = params.get('error_description') || hashParams.get('error_description');
      const type = params.get('type') || hashParams.get('type');

      if (errorDescription) {
        setError(errorDescription);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError('This confirmation or recovery link is invalid or has expired.');
        return;
      }

      if (type === 'recovery' || hashParams.get('type') === 'recovery') {
        navigate('/reset-password', { replace: true });
        return;
      }

      if (data.session?.user) {
        const loaded = (await refreshProfile()) || profile;
        navigate(dashboardPathForRole(loaded?.role), { replace: true });
        return;
      }

      navigate('/verify-email', { replace: true });
    }

    completeAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, profile, refreshProfile]);

  return (
    <div className="py-12 px-4">
      <AuthCard title="Completing sign-in" subtitle="Please wait while we verify your session." badgeText="Authentication">
        {error ? (
          <div className="space-y-4">
            <Alert type="error" message={error} />
            <Link
              to="/citizen/sign-in"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" aria-hidden="true" />
            <p className="text-sm">Confirming your account…</p>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
