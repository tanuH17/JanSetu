import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Alert from '../common/Alert';

export default function AccountDeactivationModal({ isOpen, onClose }) {
  const { user, signOut, refreshProfile } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !user) return;

    if (!reason.trim()) {
      setError('Please provide a brief reason for your deactivation request.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          deactivation_requested: true,
          deactivation_reason: reason.trim(),
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      alert('Your deactivation request has been recorded. You will now be signed out.');
      await signOut();
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Failed to submit deactivation request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-rose-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-900">Request Account Deactivation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deactivating your account will freeze access to your civic complaints, official bulletins, and notifications. Administrative records for legal audit may be retained in accordance with civic record policies.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="block text-xs font-semibold text-slate-700">
              Reason for Deactivation <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Relocated to another constituency / No longer requiring service"
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <span>Confirm Deactivation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
