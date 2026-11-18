import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  MapPin,
  FileText,
  Upload,
  Navigation,
  Map,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { JURISDICTIONS, ROLES } from '../../lib/constants';
import Alert from '../common/Alert';
import { removePrivateMedia, uploadPrivateMedia, validateMediaFile } from '../../lib/media';

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

  const allDistricts = JURISDICTIONS.flatMap((j) =>
    j.districts.map((d) => ({
      ...d,
      state: j.state,
    }))
  );

  const distObj = allDistricts.find(
    (d) => d.name.toLowerCase() === (profile?.district || '').toLowerCase()
  ) || allDistricts[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    district: profile?.district || distObj?.name || 'Lucknow',
    constituency: profile?.constituency || (distObj?.constituencies?.[0] ?? ''),
    landmark: '',
    latitude: null,
    longitude: null,
  });

  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [attachmentType, setAttachmentType] = useState('image');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Location picker map state
  const [showPickerMap, setShowPickerMap] = useState(false);
  const pickerMapRef = useRef(null);
  const pickerMapInstanceRef = useRef(null);
  const pickerMarkerRef = useRef(null);

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

  // Initialize/destroy location picker map
  useEffect(() => {
    if (!showPickerMap || !pickerMapRef.current) return;

    // Determine initial center from existing coordinates or constituency center
    const defaultLat = formData.latitude || 20.5937;
    const defaultLng = formData.longitude || 78.9629;

    if (!pickerMapInstanceRef.current) {
      const map = L.map(pickerMapRef.current, {
        center: [defaultLat, defaultLng],
        zoom: formData.latitude ? 15 : 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Create a draggable marker at current/default position
      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      marker.bindPopup('Drag me to the exact complaint location').openPopup();

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: roundedLat,
          longitude: roundedLng,
          landmark: prev.landmark || `Selected location (${roundedLat}, ${roundedLng})`,
        }));
        setLocationNotice(`Location set: ${roundedLat}, ${roundedLng}`);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        marker.setLatLng([roundedLat, roundedLng]);
        setFormData((prev) => ({
          ...prev,
          latitude: roundedLat,
          longitude: roundedLng,
          landmark: prev.landmark || `Selected location (${roundedLat}, ${roundedLng})`,
        }));
        setLocationNotice(`Location set: ${roundedLat}, ${roundedLng}`);
      });

      pickerMarkerRef.current = marker;
      pickerMapInstanceRef.current = map;

      // Fix Leaflet sizing after the div becomes visible
      setTimeout(() => map.invalidateSize(), 100);
    }

    return () => {
      if (pickerMapInstanceRef.current) {
        pickerMapInstanceRef.current.remove();
        pickerMapInstanceRef.current = null;
        pickerMarkerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPickerMap]);

  if (!isOpen) return null;

  const selectedDistrictObj = allDistricts.find(
    (d) => d.name.toLowerCase() === formData.district.toLowerCase()
  );
  const availableConstituencies = selectedDistrictObj?.constituencies || [];

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    const targetDist = allDistricts.find((d) => d.name === newDistrict);
    const newConst = targetDist?.constituencies?.[0] || '';
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
      constituency: newConst,
    }));
    if (errors.district || errors.constituency) {
      setErrors((prev) => ({ ...prev, district: null, constituency: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateMediaFile(file, 'complaint');
    if (validationError) {
      setErrors((prev) => ({ ...prev, attachment: validationError }));
      return;
    }

    setAttachmentFile(file);
    setAttachmentType(file.type.startsWith('video/') ? 'video' : 'image');
    const previewUrl = URL.createObjectURL(file);
    setAttachmentPreview(previewUrl);
    setErrors((prev) => ({ ...prev, attachment: null }));
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setAttachmentType('image');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, landmark: 'Geolocation is not supported by your browser.' }));
      return;
    }
    setDetectingLocation(true);
    setLocationNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          landmark: prev.landmark || `GPS Location (${lat}, ${lng})`,
        }));
        setLocationNotice(`Exact GPS coordinates recorded: ${lat}, ${lng}`);
        setDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setLocationNotice('Could not retrieve device GPS. Please specify landmark manually.');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validate = () => {
    const newErrors = {};

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Complaint title is required.';
    } else if (trimmedTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long.';
    } else if (trimmedTitle.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters.';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a complaint category.';
    }

    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      newErrors.description = 'Complaint description is required.';
    } else if (trimmedDesc.length < 15) {
      newErrors.description = 'Please describe the issue in at least 15 characters.';
    } else if (trimmedDesc.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters.';
    }

    if (!formData.district.trim()) {
      newErrors.district = 'District is required.';
    }

    if (!formData.constituency.trim()) {
      newErrors.constituency = 'Constituency / Assembly ward is required.';
    }

    const trimmedLandmark = formData.landmark.trim();
    if (!trimmedLandmark) {
      newErrors.landmark = 'Landmark or location is required.';
    } else if (trimmedLandmark.length < 3) {
      newErrors.landmark = 'Landmark must be at least 3 characters.';
    }

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
    let uploadedAttachmentPath = null;
    try {
      // 1. Resolve department_id
      const selectedCat = COMPLAINT_CATEGORIES.find((c) => c.value === formData.category);
      let matchedDeptId = null;

      if (selectedCat?.deptCode) {
          const { data: deptRows, error: deptError } = await supabase
            .from('departments')
            .select('id, code')
            .eq('code', selectedCat.deptCode)
            .maybeSingle();
          if (deptError) throw deptError;
          if (deptRows?.id) matchedDeptId = deptRows.id;
      }

      // 2. Upload evidence into a private bucket. The complaint row stores only its storage path.
      const complaintId = crypto.randomUUID();
      if (attachmentFile) {
        uploadedAttachmentPath = await uploadPrivateMedia(
          'complaint-attachments', attachmentFile, 'complaint', `${user.id}/${complaintId}`
        );
      }

      // 3. Insert complaint record
      const insertPayload = {
        id: complaintId,
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
      };

      if (uploadedAttachmentPath) {
        insertPayload.attachment_url = uploadedAttachmentPath;
      }

      if (formData.latitude && formData.longitude) {
        insertPayload.latitude = formData.latitude;
        insertPayload.longitude = formData.longitude;
      }

      const { data, error } = await supabase
        .from('complaints')
        .insert([insertPayload])
        .select('*, departments(name, code)')
        .single();

      if (error) throw error;
      if (!data) throw new Error('The complaint was not returned by the database. Refresh and verify before retrying.');
      const createdRecord = data;

      setSubmittedData(createdRecord);
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(createdRecord);
      }
    } catch (err) {
      if (uploadedAttachmentPath) {
        try {
          await removePrivateMedia('complaint-attachments', uploadedAttachmentPath);
        } catch {
          // Preserve the submission error; cleanup is best-effort.
        }
      }
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetForAnother = () => {
    setSubmittedData(null);
    setServerError(null);
    setErrors({});
    removeAttachment();
    setShowPickerMap(false);
    setLocationNotice(null);
    setFormData((prev) => ({
      title: '',
      description: '',
      category: '',
      district: prev.district,
      constituency: prev.constituency,
      landmark: '',
      latitude: null,
      longitude: null,
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
              <p className="text-[11px] text-slate-500">
                {submittedData
                  ? 'Your issue has been logged into the municipal tracking system.'
                  : 'Submit a public infrastructure or service grievance.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submittedData ? (
          <div className="py-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">
                Complaint Lodged Successfully
              </h4>
              <p className="text-xs text-emerald-800">
                A confirmation has been recorded and an in-app notification dispatched.
              </p>
            </div>

            {/* Tracking ID Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Official Tracking Reference
              </span>
              <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-mono text-base font-extrabold text-blue-700 tracking-wider">
                  {submittedData.tracking_id || 'JS-RECORD-SAVED'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
              >
                Lodge Another Grievance
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
              >
                View in My Complaints
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
            {serverError && <Alert type="error" message={serverError} onClose={() => setServerError(null)} />}
            {errors.auth && <Alert type="error" message={errors.auth} />}

            {/* Title */}
            <div className="space-y-1">
              <label htmlFor="complaint-title" className="block text-xs font-semibold text-slate-700">
                Grievance Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="complaint-title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Deep pothole on Ring Road near Ward 14"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.title && <p className="text-[11px] text-rose-500">{errors.title}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label htmlFor="complaint-category" className="block text-xs font-semibold text-slate-700">
                Department Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="complaint-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select Category</option>
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-[11px] text-rose-500">{errors.category}</p>}
            </div>

            {/* District & Constituency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="complaint-district" className="block text-xs font-semibold text-slate-700">
                  District <span className="text-rose-500">*</span>
                </label>
                <select
                  id="complaint-district"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {allDistricts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="complaint-constituency" className="block text-xs font-semibold text-slate-700">
                  Assembly Constituency <span className="text-rose-500">*</span>
                </label>
                <select
                  id="complaint-constituency"
                  value={formData.constituency}
                  onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {availableConstituencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Landmark */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="complaint-landmark" className="block text-xs font-semibold text-slate-700">
                  Specific Location / Landmark <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{detectingLocation ? 'Detecting GPS…' : 'Use GPS'}</span>
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setShowPickerMap((v) => !v)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Map className="w-3 h-3" />
                    <span>{showPickerMap ? 'Hide Map' : 'Pick on Map'}</span>
                  </button>
                </div>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  id="complaint-landmark"
                  type="text"
                  required
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  placeholder="e.g. In front of Primary Health Center, Gate 2"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Interactive map picker */}
              {showPickerMap && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span>Click on the map or drag the marker to set the exact complaint location.</span>
                  </div>
                  <div ref={pickerMapRef} style={{ height: '220px', width: '100%' }} />
                  {formData.latitude && formData.longitude && (
                    <div className="px-2.5 py-1.5 bg-emerald-50 border-t border-emerald-100 text-[11px] text-emerald-700 font-mono">
                      📍 {formData.latitude}, {formData.longitude}
                    </div>
                  )}
                </div>
              )}

              {locationNotice && (
                <p className="text-[11px] text-emerald-600 font-medium">{locationNotice}</p>
              )}
              {errors.landmark && <p className="text-[11px] text-rose-500">{errors.landmark}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label htmlFor="complaint-desc" className="block text-xs font-semibold text-slate-700">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="complaint-desc"
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the problem, how long it has persisted, and how it impacts residents…"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && <p className="text-[11px] text-rose-500">{errors.description}</p>}
            </div>

            {/* Photo / Video Attachment (Supabase Storage) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Supporting Photo or Video Evidence (Optional)
              </label>
              {attachmentPreview ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  {attachmentType === 'video' ? (
                    <video
                      src={attachmentPreview}
                      controls
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200 bg-black"
                    />
                  ) : (
                    <img
                      src={attachmentPreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{attachmentFile?.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {attachmentType === 'video' ? 'Video' : 'Photo'} · {(attachmentFile?.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-600">
                    Click to attach site photograph or video
                  </p>
                  <p className="text-[10px] text-slate-400">JPG, PNG, WEBP up to 5MB · MP4, WEBM up to 20MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, video/mp4, video/webm"
                onChange={handleFileChange}
                className="hidden"
              />
              {errors.attachment && <p className="text-[11px] text-rose-500">{errors.attachment}</p>}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering Grievance…</span>
                  </>
                ) : (
                  <span>Submit Grievance</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
