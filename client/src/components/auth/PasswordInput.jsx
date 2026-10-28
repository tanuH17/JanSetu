import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { getPasswordStrength, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../lib/validation';

export default function PasswordInput({
  id,
  name,
  label = 'Password',
  value,
  onChange,
  error,
  placeholder = '••••••••••••',
  required = true,
  showStrength = false,
  helperText,
  autoComplete = 'current-password',
  enforceNewPasswordRules = true,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[11px] text-slate-400 font-mono">
            {value.length}/{PASSWORD_MAX_LENGTH}
          </span>
        )}
      </div>

      <div className="relative rounded-xl shadow-xs">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={enforceNewPasswordRules ? PASSWORD_MIN_LENGTH : undefined}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`block w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && value && (
        <div className="pt-1 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Security:</span>
            <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
            <div
              className={`h-full transition-all duration-300 ${
                strength.score >= 1 ? strength.color : 'bg-transparent'
              } flex-1 rounded-full`}
            />
            <div
              className={`h-full transition-all duration-300 ${
                strength.score >= 2 ? strength.color : 'bg-transparent'
              } flex-1 rounded-full`}
            />
            <div
              className={`h-full transition-all duration-300 ${
                strength.score >= 3 ? strength.color : 'bg-transparent'
              } flex-1 rounded-full`}
            />
          </div>
        </div>
      )}

      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-600 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
