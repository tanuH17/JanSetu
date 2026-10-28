import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validatePassword, validatePasswordConfirmation } from '../../lib/validation';
import AuthCard from '../../components/auth/AuthCard';
import PasswordInput from '../../components/auth/PasswordInput';
import Alert from '../../components/common/Alert';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { updateUserPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);

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

  if (success) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <AuthCard
          title="Password Updated"
          subtitle="Your JanSetu credentials have been updated securely."
          badgeText="Success"
        >
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your password has been changed successfully. You can now use your new password to sign in.
            </p>

            <Link
              to="/citizen/sign-in"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Set New Password"
        subtitle="Create a new strong password for your JanSetu account (minimum 12 characters)."
        badgeText="Secure Update"
      >
        {serverError && (
          <div className="mb-6">
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
              <span>Save New Password</span>
            )}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
