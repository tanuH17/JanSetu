import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Upload,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import Alert from '../common/Alert';
import { removePrivateMedia, uploadPrivateMedia, validateMediaFile } from '../../lib/media';

const ALLOWED_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function UpdateComplaintModal({
  isOpen,
  onClose,
  onUpdated,
  complaint,
}) {
  const { user, profile } = useAuth();
  const isRepresentative = profile?.role === ROLES.REPRESENTATIVE;
  const isDepartment = profile?.role === ROLES.DEPARTMENT;

  const [prevComplaintId, setPrevComplaintId] = useState(complaint?.id);
  const [status, setStatus] = useState(complaint?.status || 'submitted');
  const [notes, setNotes] = useState(complaint?.resolution_notes || '');
  const [departmentId, setDepartmentId] = useState(complaint?.department_id || '');
  const [departments, setDepartments] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofType, setProofType] = useState('image');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Synchronize state when complaint changes without cascading effect
  if (complaint && complaint.id !== prevComplaintId) {
    setPrevComplaintId(complaint.id);
    setStatus(complaint.status || 'submitted');
    setNotes(complaint.resolution_notes || '');
    setDepartmentId(complaint.department_id || '');
    setError(null);
    setSuccess(false);
    setProofFile(null);
    setProofPreview(null);
    setProofType('image');
  }

  // Fetch departments list for representative routing
  useEffect(() => {
    let mounted = true;
    async function loadDepts() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error: deptsError } = await supabase
          .from('departments')
          .select('id, name, code')
          .order('name');

        if (deptsError) {
          console.warn('Departments fetch warning:', deptsError);
        } else if (mounted && Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      } catch (err) {
        console.warn('Exception loading departments:', err);
      }
    }
    loadDepts();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isOpen || !complaint) return null;

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateMediaFile(file, 'complaint');
    if (validationError) {
      setError(validationError);
      return;
    }

    setProofFile(file);
    setProofType(file.type.startsWith('video/') ? 'video' : 'image');
    setProofPreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeProof = () => {
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
    setProofType('image');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!status) {
      setError('Please select a workflow status.');
      return;
    }

    if ((status === 'resolved' || status === 'rejected') && !notes.trim()) {
      setError(`Resolution notes are required when setting status to ${status}.`);
      return;
    }

    setLoading(true);
    let uploadedProofPath = null;
    try {
      let resolutionAttachmentUrl = complaint.resolution_attachment_url || null;

      // Upload proof photo/video if department official provided one
      if (proofFile && user) {
        uploadedProofPath = await uploadPrivateMedia(
          'complaint-attachments', proofFile, 'complaint', `${user.id}/${complaint.id}`
        );
        resolutionAttachmentUrl = uploadedProofPath;
      }

      const updatePayload = {
        status,
        resolution_notes: notes.trim() || null,
      };

      // Representatives can forward / assign department
      if (isRepresentative) {
        updatePayload.department_id = departmentId || null;
      }

      // Department officials can attach resolution evidence
      if (isDepartment && resolutionAttachmentUrl) {
        updatePayload.resolution_attachment_url = resolutionAttachmentUrl;
      }

      const { data, error: updateError } = await supabase
        .from('complaints')
        .update(updatePayload)
        .eq('id', complaint.id)
        .select('*, departments(name, code)')
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error('The update was not returned by the database. Refresh and verify before retrying.');
      const finalRecord = data;

      setSuccess(true);
      if (onUpdated) onUpdated(finalRecord);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      if (uploadedProofPath) {
        try {
          await removePrivateMedia('complaint-attachments', uploadedProofPath);
        } catch {
          // Preserve the update failure; cleanup is best-effort.
        }
      }
      setError(err.message || 'Failed to update complaint status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upd-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 id="upd-modal-title" className="text-base font-bold text-slate-900">
              {isRepresentative ? 'Review & Route Complaint' : 'Update Resolution Status'}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Ref: {complaint.tracking_id || complaint.id.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complaint preview */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900 truncate max-w-[280px]">
              {complaint.title}
            </span>
            <StatusBadge status={complaint.status} />
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-2">{complaint.description}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && (
            <Alert
              type="success"
              message="Complaint updated successfully. Complainant notification sent."
            />
          )}

          {/* Status selector */}
          <div className="space-y-1.5">
            <label htmlFor="complaint-status-select" className="block text-xs font-semibold text-slate-700">
              Workflow Status <span className="text-rose-500">*</span>
            </label>
            <select
              id="complaint-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {ALLOWED_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Representative Department Assignment / Forwarding */}
          {isRepresentative && (
            <div className="space-y-1.5">
              <label htmlFor="dept-assignment-select" className="block text-xs font-semibold text-slate-700">
                Forward / Assign to Department
              </label>
              <select
                id="dept-assignment-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Unassigned / Triage</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Assigning routes the grievance into that department’s active resolution queue.
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          <div className="space-y-1.5">
            <label htmlFor="complaint-notes" className="block text-xs font-semibold text-slate-700">
              Official Remarks / Resolution Notes
            </label>
            <textarea
              id="complaint-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail inspections completed, contractor assigned, or reason for resolution…"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Official Proof Upload */}
          {isDepartment && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Attach Work Completion Evidence (Photo / Video Proof)
              </label>
              {proofPreview ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  {proofType === 'video' ? (
                    <video
                      src={proofPreview}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200 bg-black"
                      controls
                    />
                  ) : (
                    <img
                      src={proofPreview}
                      alt="Proof"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{proofFile?.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {proofType === 'video' ? 'Video evidence attached' : 'Photo proof attached'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeProof}
                    className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-600">
                    Upload photo or video evidence of repair completion
                  </p>
                  <p className="text-[10px] text-slate-400">JPG, PNG, WEBP, MP4 up to 20MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, video/mp4, video/webm"
                onChange={handleProofChange}
                className="hidden"
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Status Update</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
