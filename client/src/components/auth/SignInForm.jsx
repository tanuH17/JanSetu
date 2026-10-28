import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { validateEmail } from '../../lib/validation';
import PasswordInput from './PasswordInput';
import Alert from '../common/Alert';

export default function SignInForm({
  onSubmit,
  submitLabel,
  emailPlaceholder = 'name@example.com',
  emailLabel = 'Email address',
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const next = {};
    const emailErr = validateEmail(email);
    if (emailErr) next.email = emailErr;
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await onSubmit({ email, password });
      if (result?.error) {
        setServerError(result.error);
      }
    } catch (err) {
      setServerError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && <Alert type="error" message={serverError} onClose={() => setServerError(null)} />}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          {emailLabel} <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={emailPlaceholder}
            className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
            }`}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-rose-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          autoComplete="current-password"
          enforceNewPasswordRules={false}
        />
        <div className="flex justify-end pt-1">
          <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
            Forgot your password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
