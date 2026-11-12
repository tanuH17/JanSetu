import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Copy, Check, Loader2, AlertCircle, MapPin, Tag, FileText, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { JURISDICTIONS, ROLES } from '../../lib/constants';
import StatusBadge from '../common/StatusBadge';
import Alert from '../common/Alert';

// Civic complaint categories mapped to respective municipal department codes
const COMPLAINT_CATEGORIES = [
  { value: 'Roads & Footpaths', label: 'Roads & Footpaths (PWD)', deptCode: 'PWD' },
  { value: 'Water Supply & Drainage', label: 'Water Supply & Drainage', deptCode: 'WATER' },
  { value: 'Sanitation & Waste Management', label: 'Sanitation & Waste Management', deptCode: 'MUNICIPAL' },
  { value: 'Electricity & Street Lighting', label: 'Electricity & Street Lighting', deptCode: 'POWER' },
  { value: 'Public Health & Hygiene', label: 'Public Health & Hygiene', deptCode: 'HEALTH' },
  { value: 'Education & School Infrastructure', label: 'Education & School Infrastructure', deptCode: 'EDUCATION' },
  { value: 'Other Civic Grievance', label: 'Other Civic Grievance', deptCode: null },
];

export default function LodgeComplaintModal({ isOpen, onClose, onSuccess }) {
  const { user, profile } = useAuth();

  // All pilot districts flattened with their state and constituency list
  const allDistricts = JURISDICTIONS.flatMap((j) =>
    j.districts.map((d) => ({
      ...d,
      state: j.state,
    }))
  );

  // Determine initial district & constituency from profile or defaults
  const initialDistrictName = profile?.district || 'Lucknow';
  const initialDistrictObj = allDistricts.find((d) => d.name.toLowerCase() === initialDistrictName.toLowerCase()) || allDistricts[0];
  const initialConstituency = profile?.constituency || (initialDistrictObj?.constituencies?.[0] ?? '');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    district: initialDistrictObj?.name || 'Lucknow',
    constituency: initialConstituency,
    landmark: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync initial form values when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setErrors({});
      setCopied(false);
      setSubmittedData(null);

      const distObj = allDistricts.find((d) => d.name.toLowerCase() === (profile?.district || '').toLowerCase()) || allDistricts[0];
      setFormData({
        title: '',
        description: '',
        category: '',
        district: profile?.district || distObj?.name || 'Lucknow',
        constituency: profile?.constituency || (distObj?.constituencies?.[0] ?? ''),
        landmark: '',
      });
    }
  }, [isOpen, profile]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  // Selected district object for constituency dropdown options
  const selectedDistrictObj = allDistricts.find(
    (d) => d.name.toLowerCase() === formData.district.toLowerCase()
  );
  const availableConstituencies = selectedDistrictObj?.constituencies || [];

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    const distObj = allDistricts.find((d) => d.name === newDistrict);
    const newConst = distObj?.constituencies?.[0] || '';
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
      constituency: newConst,
    }));
    if (errors.district || errors.constituency) {
      setErrors((prev) => ({ ...prev, district: null, constituency: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // 1. Title validation
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Complaint title is required.';
    } else if (trimmedTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long.';
    } else if (trimmedTitle.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters.';
    }

    // 2. Category validation
    if (!formData.category) {
      newErrors.category = 'Please select a complaint category.';
    }

    // 3. Description validation
    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      newErrors.description = 'Complaint description is required.';
    } else if (trimmedDesc.length < 15) {
      newErrors.description = 'Please describe the issue in at least 15 characters.';
    } else if (trimmedDesc.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters.';
    }

    // 4. District validation
    if (!formData.district.trim()) {
      newErrors.district = 'District is required.';
    }

    // 5. Constituency validation
    if (!formData.constituency.trim()) {
      newErrors.constituency = 'Constituency / Assembly ward is required.';
    }

    // 6. Landmark / Location validation
    const trimmedLandmark = formData.landmark.trim();
    if (!trimmedLandmark) {
      newErrors.landmark = 'Landmark or location is required.';
    } else if (trimmedLandmark.length < 3) {
      newErrors.landmark = 'Landmark must be at least 3 characters.';
    } else if (trimmedLandmark.length > 200) {
      newErrors.landmark = 'Landmark cannot exceed 200 characters.';
    }

    // Auth & role check
    if (!user) {
      newErrors.auth = 'You must be signed in to submit a complaint.';
    } else if (profile?.role && profile.role !== ROLES.CITIZEN) {
      newErrors.auth = 'Only registered citizens can lodge complaints.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    if (!isSupabaseConfigured) {
      setServerError('Supabase is not configured. Please check your environment configuration.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Resolve department_id from category if matching department exists in public.departments
      const selectedCat = COMPLAINT_CATEGORIES.find((c) => c.value === formData.category);
      let matchedDeptId = null;

      if (selectedCat?.deptCode) {
        try {
          const { data: deptRows, error: deptError } = await supabase
            .from('departments')
            .select('id, code')
            .eq('code', selectedCat.deptCode)
            .maybeSingle();

          if (!deptError && deptRows?.id) {
            matchedDeptId = deptRows.id;
          }
        } catch {
          // If departments query fails, proceed with null department_id (pending assignment)
          matchedDeptId = null;
        }
      }

      // 2. Insert complaint record linked to currently authenticated citizen
      // tracking_id is generated by the database trigger (trigger_set_complaint_tracking_id)
      const { data, error } = await supabase
        .from('complaints')
        .insert([
          {
            citizen_id: user.id,
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            district: formData.district.trim(),
            constituency: formData.constituency.trim(),
            landmark: formData.landmark.trim(),
            department_id: matchedDeptId,
            status: 'submitted',
            priority: 'medium',
          },
        ])
        .select('*, departments(name, code)')
        .single();

      if (error) throw error;

      // 3. Set success state and notify parent dashboard
      setSubmittedData(data);
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(data);
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred while submitting your complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTrackingId = async () => {
    if (!submittedData?.tracking_id) return;
    try {
      await navigator.clipboard.writeText(submittedData.tracking_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetForAnother = () => {
    setSubmittedData(null);
    setServerError(null);
    setErrors({});
    setFormData((prev) => ({
      title: '',
      description: '',
      category: '',
      district: prev.district,
      constituency: prev.constituency,
      landmark: '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-xl w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lodge-complaint-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="lodge-complaint-title" className="text-base sm:text-lg font-bold text-slate-900">
                {submittedData ? 'Grievance Registered' : 'Lodge Civic Grievance'}
              </h3>
              <p className="text-xs text-slate-500">
                {submittedData ? 'Official acknowledgment and tracking details' : 'Report localized issues to administrative authorities'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4">
          {submittedData ? (
            /* SUCCESS VIEW */
            <div className="space-y-5">
              <div className="text-center py-2 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Complaint Lodged Successfully!</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your grievance has been securely stored in the JanSetu system and queued for administrative review.
                </p>
              </div>

              {/* Prominent Tracking ID Container */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 space-y-2">
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                  Official Tracking ID
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-blue-900 tracking-wider">
                    {submittedData.tracking_id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTrackingId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100/80 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-blue-700/80 leading-relaxed">
                  Please save this Tracking ID to monitor real-time review, assignment, and resolution progress.
                </p>
              </div>

              {/* Complaint Summary Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-500">Title:</span>
                  <span className="font-semibold text-slate-900 text-right">{submittedData.title}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900">{submittedData.category}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-500">Status:</span>
                  <StatusBadge status={submittedData.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-500">Jurisdiction:</span>
                  <span className="text-slate-900">
                    {submittedData.constituency}, {submittedData.district}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-500">Landmark:</span>
                  <span className="text-slate-900">{submittedData.landmark}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Lodge Another Issue
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Done / View on Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && <Alert type="error" message={serverError} />}
              {errors.auth && <Alert type="error" message={errors.auth} />}

              {/* 1. Complaint Title */}
              <div className="space-y-1.5">
                <label htmlFor="complaint-title" className="block text-xs font-bold text-slate-800">
                  Complaint Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="complaint-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: null });
                  }}
                  placeholder="e.g. Broken water pipeline causing waterlogging"
                  maxLength={120}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.title
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                  }`}
                />
                <div className="flex items-center justify-between text-[11px]">
                  {errors.title ? (
                    <span className="text-rose-600 font-medium">{errors.title}</span>
                  ) : (
                    <span className="text-slate-400">Brief summary of the issue</span>
                  )}
                  <span className="text-slate-400">{formData.title.length}/120</span>
                </div>
              </div>

              {/* 2. Category Dropdown */}
              <div className="space-y-1.5">
                <label htmlFor="complaint-category" className="block text-xs font-bold text-slate-800">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="complaint-category"
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      if (errors.category) setErrors({ ...errors, category: null });
                    }}
                    disabled={submitting}
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                      errors.category
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                    }`}
                  >
                    <option value="">-- Select a Category --</option>
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && <p className="text-[11px] text-rose-600 font-medium">{errors.category}</p>}
              </div>

              {/* 3. District & Constituency (Side by side on larger screens) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="complaint-district" className="block text-xs font-bold text-slate-800">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="complaint-district"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    disabled={submitting}
                    className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                      errors.district
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                    }`}
                  >
                    {allDistricts.map((d) => (
                      <option key={`${d.state}-${d.name}`} value={d.name}>
                        {d.name} ({d.state})
                      </option>
                    ))}
                  </select>
                  {errors.district && <p className="text-[11px] text-rose-600 font-medium">{errors.district}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="complaint-constituency" className="block text-xs font-bold text-slate-800">
                    Constituency / Ward <span className="text-rose-500">*</span>
                  </label>
                  {availableConstituencies.length > 0 ? (
                    <select
                      id="complaint-constituency"
                      value={formData.constituency}
                      onChange={(e) => {
                        setFormData({ ...formData, constituency: e.target.value });
                        if (errors.constituency) setErrors({ ...errors, constituency: null });
                      }}
                      disabled={submitting}
                      className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                        errors.constituency
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                      }`}
                    >
                      {availableConstituencies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="complaint-constituency"
                      type="text"
                      value={formData.constituency}
                      onChange={(e) => {
                        setFormData({ ...formData, constituency: e.target.value });
                        if (errors.constituency) setErrors({ ...errors, constituency: null });
                      }}
                      placeholder="e.g. Ward 12 / Central"
                      disabled={submitting}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                    />
                  )}
                  {errors.constituency && <p className="text-[11px] text-rose-600 font-medium">{errors.constituency}</p>}
                </div>
              </div>

              {/* 4. Landmark / Location */}
              <div className="space-y-1.5">
                <label htmlFor="complaint-landmark" className="block text-xs font-bold text-slate-800">
                  Landmark / Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="complaint-landmark"
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => {
                      setFormData({ ...formData, landmark: e.target.value });
                      if (errors.landmark) setErrors({ ...errors, landmark: null });
                    }}
                    placeholder="e.g. Opposite City Hospital Gate 3, Station Road"
                    maxLength={200}
                    disabled={submitting}
                    className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.landmark
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                    }`}
                  />
                </div>
                {errors.landmark && <p className="text-[11px] text-rose-600 font-medium">{errors.landmark}</p>}
              </div>

              {/* 5. Complaint Description */}
              <div className="space-y-1.5">
                <label htmlFor="complaint-description" className="block text-xs font-bold text-slate-800">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="complaint-description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: null });
                  }}
                  placeholder="Describe the issue in detail: what happened, when did it begin, and any immediate hazards to residents..."
                  maxLength={2000}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all leading-relaxed ${
                    errors.description
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100 hover:border-slate-400'
                  }`}
                />
                <div className="flex items-center justify-between text-[11px]">
                  {errors.description ? (
                    <span className="text-rose-600 font-medium">{errors.description}</span>
                  ) : (
                    <span className="text-slate-400">Minimum 15 characters</span>
                  )}
                  <span className="text-slate-400">{formData.description.length}/2000</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Grievance...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Submit Grievance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
