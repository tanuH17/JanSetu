import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validatePassword, validatePasswordConfirmation } from '../../lib/validation';
import PasswordInput from '../auth/PasswordInput';
import Alert from '../common/Alert';
import { Loader2, KeyRound } from 'lucide-react';

export default function ChangePasswordForm() {
  const { updateUserPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const newErrors = {};
    const passErr = validatePassword(newPassword);
    if (passErr) newErrors.password = passErr;
    const confirmErr = validatePasswordConfirmation(newPassword, confirmPassword);
    if (confirmErr) newErrors.confirmPassword = confirmErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) {
        setServerError(error.message);
      } else {
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
      {success && (
        <Alert
          type="success"
          message="Password updated successfully. You can now use your new credentials on future sign-ins."
          onClose={() => setSuccess(false)}
        />
      )}

      {serverError && (
        <Alert
          type="error"
          message={serverError}
          onClose={() => setServerError(null)}
        />
      )}

      <PasswordInput
        id="newPassword"
        name="newPassword"
        label="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={errors.password}
        showStrength={true}
        autoComplete="new-password"
        helperText="Minimum 12 characters. Use a strong passphrase."
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating Password…</span>
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </>
        )}
      </button>
    </form>
  );
}
