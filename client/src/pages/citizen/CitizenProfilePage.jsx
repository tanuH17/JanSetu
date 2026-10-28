import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { JURISDICTIONS, ROLES } from '../../lib/constants';
import { validateFullName, validatePhoneNumber } from '../../lib/validation';
import RoleBadge from '../../components/common/RoleBadge';
import Alert from '../../components/common/Alert';
import { User, Mail, Phone, MapPin, Shield, Loader2, Save } from 'lucide-react';

export default function CitizenProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [state, setState] = useState(profile?.state || 'Uttar Pradesh');
  const [district, setDistrict] = useState(profile?.district || 'Lucknow');
  const [constituency, setConstituency] = useState(profile?.constituency || 'Lucknow Central');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSaveSuccess(false);

    if (!validate()) return;

    if (!isSupabaseConfigured) {
      setServerError('Supabase credentials are not configured yet.');
      return;
    }

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
          // Notice: role is NEVER sent or editable here
        })
        .eq('id', user.id);

      if (error) {
        setServerError(error.message);
      } else {
        setSaveSuccess(true);
        await refreshProfile();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update profile information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Profile &amp; Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your verified identity, registered constituency, and contact details.
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

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Account Identity Summary */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-xl flex items-center justify-center">
            {(profile?.full_name || user?.email)?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{profile?.full_name || 'Citizen'}</h2>
              <RoleBadge role={profile?.role || ROLES.CITIZEN} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Profile Update Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>
              {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">
                Mobile Number
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
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>
              {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
            </div>
          </div>

          {/* Email (Read-only for security) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Registered Email Address</label>
              <span className="text-[11px] text-slate-400">Managed via Supabase Auth</span>
            </div>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Jurisdiction Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Assigned Assembly Constituency &amp; District</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">State</label>
                <select
                  value={state}
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
                <label className="block text-[11px] font-medium text-slate-600 mb-1">District</label>
                <select
                  value={district}
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
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Constituency / Assembly Ward
              </label>
              <select
                value={constituency}
                onChange={(e) => setConstituency(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
              >
                {selectedDistrictObj?.constituencies?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security Information */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Your role is fixed to <strong>Citizen</strong>. Role modifications are guarded by database triggers and can only be altered by an authorized administrator in PostgreSQL.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
