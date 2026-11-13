import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { validatePassword, validatePasswordConfirmation } from '../../lib/validation';
import AuthCard from '../../components/auth/AuthCard';
import PasswordInput from '../../components/auth/PasswordInput';
import Alert from '../../components/common/Alert';
import { Loader2, CheckCircle2, ShieldAlert, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const { updateUserPassword, session: authSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Verify and establish recovery session
  useEffect(() => {
    let cancelled = false;

    async function initRecoverySession() {
      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setServerError('Supabase is not configured yet.');
          setCheckingSession(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);

        const errorDesc = params.get('error_description') || hashParams.get('error_description');
        const code = params.get('code');

        if (errorDesc) {
          if (!cancelled) {
            setServerError(errorDesc);
            setCheckingSession(false);
          }
          return;
        }

        // 1. Direct PKCE code exchange if user landed directly on /reset-password?code=...
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr && !cancelled) {
            setServerError(exchangeErr.message || 'The password reset token is invalid or has expired.');
            setCheckingSession(false);
            return;
          }
        }

        // 2. Check for active session
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          if (session || authSession) {
            setHasValidSession(true);
          } else {
            // Give a short grace period for background onAuthStateChange
            const timeout = setTimeout(async () => {
              if (cancelled) return;
              const { data: retry } = await supabase.auth.getSession();
              if (retry.session) {
                setHasValidSession(true);
              } else {
                setHasValidSession(false);
              }
              setCheckingSession(false);
            }, 800);
            return () => clearTimeout(timeout);
          }
          setCheckingSession(false);
        }
      } catch (err) {
        if (!cancelled) {
          setServerError(err.message || 'Unable to verify password reset session.');
          setCheckingSession(false);
        }
      }
    }

    initRecoverySession();

    // Listen for auth state changes (e.g. PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) {
        setHasValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [authSession]);

  const validate = () => {
    const newErrors = {};
    const passErr = validatePassword(password);
    if (passErr) newErrors.password = passErr;
    const confirmErr = validatePasswordConfirmation(password, confirmPassword);
    if (confirmErr) newErrors.confirmPassword = confirmErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await updateUserPassword(password);
      if (error) {
        setServerError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update password. Your recovery link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // State 1: Checking session
  if (checkingSession) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
        <AuthCard
          title="Verifying Reset Session"
          subtitle="Validating your secure password recovery token…"
          badgeText="Security"
        >
          <div className="flex flex-col items-center gap-3 py-8 text-slate-600">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
            <p className="text-sm font-medium">Validating recovery credentials…</p>
          </div>
        </AuthCard>
      </div>
    );
  }

  // State 2: Success
  if (success) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
        <AuthCard
          title="Password Updated Successfully"
          subtitle="Your JanSetu credentials have been securely updated."
          badgeText="Success"
        >
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your password has been changed successfully. You can now use your new password to sign in across JanSetu portals.
            </p>

            <div className="pt-2">
              <Link
                to="/citizen/sign-in"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                Proceed to Sign In
              </Link>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  // State 3: Invalid or missing session
  if (!hasValidSession) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
        <AuthCard
          title="Recovery Link Expired or Invalid"
          subtitle="We could not establish an active password recovery session."
          badgeText="Recovery Required"
        >
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            {serverError && (
              <Alert type="error" message={serverError} />
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Password recovery links are single-use and time-limited for security. Please request a new link to reset your account password.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Request New Password Reset Link
              </Link>
              <Link
                to="/citizen/sign-in"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  // State 4: Active session verified — render reset form
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <AuthCard
        title="Set New Password"
        subtitle="Create a new strong password for your JanSetu account (minimum 12 characters)."
        badgeText="Secure Update"
      >
        {serverError && (
          <div className="mb-4">
            <Alert type="error" message={serverError} onClose={() => setServerError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            showStrength={true}
            autoComplete="new-password"
            helperText="Minimum 12 characters. Passphrases are welcome."
          />

          <PasswordInput
            id="confirmNewPassword"
            name="confirmNewPassword"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> Save New Password
              </span>
            )}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
