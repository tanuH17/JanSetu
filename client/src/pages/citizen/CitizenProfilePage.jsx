import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { JURISDICTIONS, ROLES } from '../../lib/constants';
import { validateFullName, validatePhoneNumber } from '../../lib/validation';
import RoleBadge from '../../components/common/RoleBadge';
import Alert from '../../components/common/Alert';
import AvatarUploader from '../../components/profile/AvatarUploader';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm';
import NotificationPreferencesForm from '../../components/profile/NotificationPreferencesForm';
import AccountDeactivationModal from '../../components/profile/AccountDeactivationModal';
import {
  User,
  Phone,
  ShieldCheck,
  KeyRound,
  Bell,
  Lock,
  Save,
  Loader2,
} from 'lucide-react';

export default function CitizenProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [state, setState] = useState(profile?.state || 'Uttar Pradesh');
  const [district, setDistrict] = useState(profile?.district || 'Lucknow');
  const [constituency, setConstituency] = useState(profile?.constituency || 'Lucknow Central');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const selectedStateObj = JURISDICTIONS.find((j) => j.state === state) || JURISDICTIONS[0];
  const selectedDistrictObj =
    selectedStateObj.districts.find((d) => d.name === district) || selectedStateObj.districts[0];

  const handleStateChange = (e) => {
    const newState = e.target.value;
    const stateObj = JURISDICTIONS.find((j) => j.state === newState) || JURISDICTIONS[0];
    const firstDistrict = stateObj.districts[0];
    setState(newState);
    setDistrict(firstDistrict.name);
    setConstituency(firstDistrict.constituencies[0] || '');
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    const districtObj = selectedStateObj.districts.find((d) => d.name === newDistrict);
    setDistrict(newDistrict);
    setConstituency(districtObj?.constituencies[0] || '');
  };

  const validate = () => {
    const newErrors = {};
    const nameErr = validateFullName(fullName);
    if (nameErr) newErrors.fullName = nameErr;

    const phoneErr = validatePhoneNumber(phone);
    if (phoneErr) newErrors.phone = phoneErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSaveSuccess(false);

    if (!validate()) return;
    if (!isSupabaseConfigured || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phone ? phone.trim() : null,
          state,
          district,
          constituency,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      await refreshProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setServerError(err.message || 'Failed to update profile information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Profile &amp; Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your verified identity, registered assembly ward, and account security.
        </p>
      </div>

      {saveSuccess && (
        <Alert
          type="success"
          message="Profile updated successfully."
          onClose={() => setSaveSuccess(false)}
        />
      )}

      {serverError && (
        <Alert type="error" message={serverError} onClose={() => setServerError(null)} />
      )}

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {/* Account Identity Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <AvatarUploader
            currentAvatarUrl={profile?.avatar_url}
            onAvatarUpdated={() => {
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
            }}
          />

          <div className="space-y-1 sm:text-right">
            <div className="flex sm:justify-end items-center gap-2">
              <RoleBadge role={profile?.role || ROLES.CITIZEN} />
              {profile?.is_verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Citizen
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" /> Personal Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" /> Notification Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" /> Account &amp; Privacy
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.fullName && <p className="text-[11px] text-rose-500">{errors.fullName}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">
                  Phone Number
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-rose-500">{errors.phone}</p>}
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label htmlFor="state" className="block text-xs font-semibold text-slate-700">
                  State
                </label>
                <select
                  id="state"
                  value={state}
                  onChange={handleStateChange}
                  className="block w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j.state} value={j.state}>
                      {j.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label htmlFor="district" className="block text-xs font-semibold text-slate-700">
                  District
                </label>
                <select
                  id="district"
                  value={district}
                  onChange={handleDistrictChange}
                  className="block w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedStateObj.districts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Constituency */}
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="constituency" className="block text-xs font-semibold text-slate-700">
                  Constituency / Assembly Ward
                </label>
                <select
                  id="constituency"
                  value={constituency}
                  onChange={(e) => setConstituency(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedDistrictObj.constituencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Information</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Update Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Change your password to keep your JanSetu resident account protected.
            </p>
            <ChangePasswordForm />
          </div>
        )}

        {/* Tab 3: Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Notification Preferences</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select which notifications you want to receive about your submitted grievances and locality alerts.
            </p>
            <NotificationPreferencesForm />
          </div>
        )}

        {/* Tab 4: Account Security */}
        {activeTab === 'security' && (
          <div className="mt-6 space-y-6 max-w-lg">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Privacy &amp; Security</h3>
              <p className="text-xs text-slate-500">
                Your resident account is protected with PostgreSQL Row Level Security.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Account Type:</span>
                <span className="font-semibold text-slate-800">Citizen Resident</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registered Assembly:</span>
                <span className="font-semibold text-slate-800">{constituency}, {district}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Grievance Privacy:</span>
                <span className="font-semibold text-emerald-600">Restricted Complainant Data</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-1">Account Deactivation</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                No longer living in this constituency or want to close your account?
              </p>
              <button
                type="button"
                onClick={() => setDeactivateModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Request Account Deactivation
              </button>
            </div>
          </div>
        )}
      </div>

      <AccountDeactivationModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
      />
    </div>
  );
}
