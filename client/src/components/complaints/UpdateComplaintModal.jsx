import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../common/StatusBadge';

// Only the statuses a representative is permitted to set
const REP_ALLOWED_STATUSES = [
  { value: 'submitted',    label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'in_progress',  label: 'In Progress' },
  { value: 'resolved',     label: 'Resolved' },
  { value: 'rejected',     label: 'Rejected' },
];

export default function UpdateComplaintModal({ isOpen, onClose, onUpdated, complaint }) {
  const [status, setStatus]       = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(false);

  // Sync state when complaint changes (modal opened for a new complaint)
  React.useEffect(() => {
    if (complaint) {
      setStatus(complaint.status || 'submitted');
      setNotes(complaint.resolution_notes || '');
      setError(null);
      setSuccess(false);
    }
  }, [complaint]);

  if (!isOpen || !complaint) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!status) {
      setError('Please select a status.');
      return;
    }

    if ((status === 'resolved' || status === 'rejected') && !notes.trim()) {
      setError(`Resolution notes are required when marking a complaint as ${status}.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from('complaints')
        .update({
          status,
          resolution_notes: notes.trim() || null,
        })
        .eq('id', complaint.id)
        .select('*, departments(name, code)')
        .single();

      if (updateError) throw updateError;

      setSuccess(true);
      if (onUpdated) onUpdated(data);

      // Auto-close after a short delay
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upd-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h3 id="upd-modal-title" className="text-base font-bold text-slate-900">
              Update Complaint
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={complaint.title}>
              {complaint.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Complaint updated successfully</p>
            <p className="text-xs text-slate-500">The complaint status has been saved.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-5">

              {/* Current status */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Current status:</span>
                <StatusBadge status={complaint.status} />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Status */}
              <div className="space-y-1.5">
                <label htmlFor="upd-status" className="block text-xs font-semibold text-slate-700">
                  New Status <span className="text-rose-500">*</span>
                </label>
                <select
                  id="upd-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 cursor-pointer"
                >
                  {REP_ALLOWED_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-1.5">
                <label htmlFor="upd-notes" className="block text-xs font-semibold text-slate-700">
                  Resolution / Action Notes
                  {(status === 'resolved' || status === 'rejected') && (
                    <span className="text-rose-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  id="upd-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  placeholder={
                    status === 'resolved'
                      ? 'Describe how the issue was resolved…'
                      : status === 'rejected'
                      ? 'Explain why the complaint is being rejected…'
                      : 'Optional: Add a progress update or note…'
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 disabled:opacity-60"
                />
                {(status === 'resolved' || status === 'rejected') && (
                  <p className="text-[11px] text-slate-400">
                    Notes are required when marking a complaint as {status}.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save Update</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
