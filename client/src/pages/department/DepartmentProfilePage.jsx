import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES } from '../../lib/constants';
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
  Building2,
  ShieldCheck,
  KeyRound,
  Bell,
  Lock,
  Save,
  Loader2,
} from 'lucide-react';

export default function DepartmentProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [bio, setBio] = useState(profile?.bio || '');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const officialName = profile?.full_name || 'Department Official';
  const designation = profile?.designation || 'Nodal Executive Officer';
  const deptName = profile?.departments?.name || 'Assigned Department';
  const deptCode = profile?.departments?.code || 'UNASSIGNED';
  const district = profile?.district || 'Lucknow';
  const state = profile?.state || 'Uttar Pradesh';
  const isVerified = Boolean(profile?.is_verified);

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
      // Security note: department_id, district, state, role, is_verified are never modified here
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phone ? phone.trim() : null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      await refreshProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setServerError(err.message || 'Failed to update department official profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Department Official Profile &amp; Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your operational municipal division, official contact details, and system preferences.
        </p>
      </div>

      {saveSuccess && (
        <Alert
          type="success"
          message="Department official profile updated successfully."
          onClose={() => setSaveSuccess(false)}
        />
      )}

      {serverError && (
        <Alert type="error" message={serverError} onClose={() => setServerError(null)} />
      )}

      {/* Identity Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <AvatarUploader
            currentAvatarUrl={profile?.avatar_url}
            onAvatarUpdated={() => {
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
            }}
          />

          <div className="space-y-1 sm:text-right">
            <h2 className="text-sm font-bold text-slate-900">{officialName}</h2>
            <div className="flex sm:justify-end items-center gap-2">
              <RoleBadge role={ROLES.DEPARTMENT} />
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Official
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Pending Verification
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
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" /> Official Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-600'
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
                ? 'border-indigo-600 text-indigo-600'
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
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" /> Security &amp; Access
          </button>
        </div>

        {/* Tab 1: Official Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6" noValidate>
            {/* Protected Assignment Details Notice */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Operational Department Allocation
              </span>
              <p className="text-indigo-900/80">
                Department assignments are administratively provisioned and locked. Officials cannot alter division assignments.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800">{deptName}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block">Code / Division</span>
                  <span className="font-semibold text-slate-800">{deptCode}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block">Jurisdiction</span>
                  <span className="font-semibold text-slate-800">{district}, {state}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block">Designation</span>
                  <span className="font-semibold text-slate-800">{designation}</span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
                  Official Full Name <span className="text-rose-500">*</span>
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
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {errors.fullName && <p className="text-[11px] text-rose-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">
                  Desk / Direct Phone Number
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
                    placeholder="0522-2233445"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-rose-500">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bio" className="block text-xs font-semibold text-slate-700">
                Departmental Role &amp; Public Hours
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Office hours: 10:00 AM – 5:00 PM. Nodal officer for municipal sewer & pipeline complaints."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Department Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Update Department Official Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Maintain operational account security by updating your password regularly.
            </p>
            <ChangePasswordForm />
          </div>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === 'notifications' && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Notification Preferences</h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure dispatch alerts when new complaints are routed to your department queue.
            </p>
            <NotificationPreferencesForm />
          </div>
        )}

        {/* Tab 4: Security */}
        {activeTab === 'security' && (
          <div className="mt-6 space-y-6 max-w-lg">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Security &amp; Authorization Audit</h3>
              <p className="text-xs text-slate-500">
                Department officials can view and update only records belonging to their assigned department.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active Department ID:</span>
                <span className="font-mono text-[11px] text-slate-800">{profile?.department_id || 'Not Assigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">RLS Isolation:</span>
                <span className="font-semibold text-emerald-600">Enforced by PostgreSQL</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-1">Account Deactivation Request</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Transferring departments or leaving office? Request deactivation for this operational login.
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
