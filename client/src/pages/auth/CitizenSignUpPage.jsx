import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES, JURISDICTIONS } from '../../lib/constants';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateFullName,
  validatePhoneNumber,
} from '../../lib/validation';
import AuthCard from '../../components/auth/AuthCard';
import PasswordInput from '../../components/auth/PasswordInput';
import Alert from '../../components/common/Alert';
import { Loader2, CheckCircle2, User, Mail, Phone, MapPin } from 'lucide-react';

export default function CitizenSignUpPage() {
  const { signUpCitizen } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    constituency: 'Lucknow Central',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Handle district selection and auto-populate available constituencies
  const selectedStateObj = JURISDICTIONS.find((j) => j.state === formData.state) || JURISDICTIONS[0];
  const selectedDistrictObj =
    selectedStateObj.districts.find((d) => d.name === formData.district) || selectedStateObj.districts[0];

  const handleStateChange = (e) => {
    const newState = e.target.value;
    const stateObj = JURISDICTIONS.find((j) => j.state === newState) || JURISDICTIONS[0];
    const firstDistrict = stateObj.districts[0];
    setFormData({
      ...formData,
      state: newState,
      district: firstDistrict.name,
      constituency: firstDistrict.constituencies[0] || '',
    });
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    const districtObj = selectedStateObj.districts.find((d) => d.name === newDistrict);
    setFormData({
      ...formData,
      district: newDistrict,
      constituency: districtObj?.constituencies[0] || '',
    });
  };

  const validateForm = () => {
    const newErrors = {};

    const nameErr = validateFullName(formData.fullName);
    if (nameErr) newErrors.fullName = nameErr;

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validatePhoneNumber(formData.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    const confirmErr = validatePasswordConfirmation(formData.password, formData.confirmPassword);
    if (confirmErr) newErrors.confirmPassword = confirmErr;

    if (!formData.termsAccepted) {
      newErrors.terms = 'You must accept the terms of use and privacy policy to register.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { error } = await signUpCitizen({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phone,
        state: formData.state,
        district: formData.district,
        constituency: formData.constituency,
      });

      if (error) {
        setServerError(error.message);
      } else {
        setSubmitSuccess(true);
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred during citizen sign up.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <AuthCard
          title="Registration Submitted"
          subtitle="Welcome to the JanSetu Civic Platform"
          role={ROLES.CITIZEN}
          footerLink="/citizen/sign-in"
          footerLinkText="Go to Citizen Sign In"
          footerPrompt="Ready to log in?"
        >
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Registration Request Received</h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              If registration can proceed for <strong className="text-slate-900">{formData.email}</strong>, follow the instructions sent to that address.
            </p>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 text-left space-y-2">
              <p className="font-semibold">Next Step:</p>
              <p>
                If your Supabase project has email confirmations enabled, please check your inbox to verify your email address. If email confirmation is disabled in your project settings, you can proceed straight to sign in.
              </p>
            </div>

            <Link
              to="/citizen/sign-in"
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              Sign In Now
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Citizen Registration"
        subtitle="Create your resident account to report civic issues and track constituency projects."
        role={ROLES.CITIZEN}
        footerLink="/citizen/sign-in"
        footerLinkText="Sign In Here"
        footerPrompt="Already have an account?"
      >
        {serverError && (
          <div className="mb-6">
            <Alert type="error" message={serverError} onClose={() => setServerError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ramesh Sharma"
                className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.fullName
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                }`}
              />
            </div>
            {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="citizen@example.com"
                autoComplete="email"
                className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Mobile Number
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Optional</span>
            </div>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9876543210"
                className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.phone
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                }`}
              />
            </div>
            {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
          </div>

          {/* Jurisdiction (State / District / Constituency) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Pilot Jurisdiction / Locality</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="state" className="block text-[11px] font-medium text-slate-600 mb-1">
                  State
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={handleStateChange}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j.state} value={j.state}>
                      {j.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="district" className="block text-[11px] font-medium text-slate-600 mb-1">
                  District
                </label>
                <select
                  id="district"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {selectedStateObj.districts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="constituency" className="block text-[11px] font-medium text-slate-600 mb-1">
                Constituency / Assembly Ward
              </label>
              <select
                id="constituency"
                value={formData.constituency}
                onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                {selectedDistrictObj?.constituencies?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password (min 12 chars required) */}
          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            showStrength={true}
            autoComplete="new-password"
            helperText="Minimum 12 characters. Passphrases and special symbols permitted."
          />

          {/* Confirm Password */}
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {/* Terms and Privacy Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs text-slate-600 leading-normal">
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-blue-600 hover:underline">
                  Terms of Use
                </Link>{' '}
                and acknowledge the{' '}
                <Link to="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.terms && <p className="text-xs text-rose-600 mt-1">{errors.terms}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all cursor-pointer mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Citizen Account</span>
            )}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
