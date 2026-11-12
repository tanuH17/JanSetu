import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const ANNOUNCEMENT_CATEGORIES = [
  'General',
  'Infrastructure',
  'Health',
  'Education',
  'Water & Sanitation',
  'Emergency',
  'Event',
];

export default function CreateAnnouncementModal({ isOpen, onClose, onCreated, constituency }) {
  const { user } = useAuth();

  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [category, setCategory]   = useState('General');
  const [isPinned, setIsPinned]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(false);
  const [created, setCreated]     = useState(null);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  function resetForm() {
    setTitle('');
    setContent('');
    setCategory('General');
    setIsPinned(false);
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setCreated(null);
  }

  function validate() {
    const errs = {};
    if (!title.trim())   errs.title   = 'Title is required.';
    if (!content.trim()) errs.content = 'Announcement body is required.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('announcements')
        .insert({
          author_id:          user.id,
          title:              title.trim(),
          content:            content.trim(),
          category:           category,
          target_constituency: constituency || null,
          is_pinned:          isPinned,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCreated(data);
      setSuccess(true);
      if (onCreated) onCreated(data);
    } catch (err) {
      setError(err.message || 'Failed to publish announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      resetForm();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ann-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 id="ann-modal-title" className="text-base font-bold text-slate-900">
                Draft Official Announcement
              </h3>
              {constituency && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Broadcasting to: <span className="font-medium text-slate-700">{constituency}</span>
                </p>
              )}
            </div>
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
            <p className="text-sm font-semibold text-slate-900">Announcement published!</p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Your bulletin has been broadcast to citizens in{' '}
              <span className="font-semibold">{constituency || 'your constituency'}</span>.
            </p>
            {created?.title && (
              <div className="mt-1 p-3 rounded-xl bg-blue-50 border border-blue-200 w-full text-left">
                <p className="text-xs font-semibold text-blue-900 line-clamp-2">{created.title}</p>
                <p className="text-[11px] text-blue-700 mt-1">{created.category}</p>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer border border-blue-200"
              >
                Draft Another
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">

              {/* Global error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="ann-title" className="block text-xs font-semibold text-slate-700">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ann-title"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: '' })); }}
                  disabled={loading}
                  maxLength={200}
                  placeholder="e.g. Road Maintenance on MG Road — 15 Nov"
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 disabled:opacity-60 ${
                    fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-rose-600">{fieldErrors.title}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label htmlFor="ann-category" className="block text-xs font-semibold text-slate-700">
                  Category
                </label>
                <select
                  id="ann-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 cursor-pointer"
                >
                  {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label htmlFor="ann-content" className="block text-xs font-semibold text-slate-700">
                  Announcement Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="ann-content"
                  rows={5}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setFieldErrors((p) => ({ ...p, content: '' })); }}
                  disabled={loading}
                  placeholder="Write the full announcement text here…"
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 disabled:opacity-60 ${
                    fieldErrors.content ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.content && (
                  <p className="text-[11px] text-rose-600">{fieldErrors.content}</p>
                )}
              </div>

              {/* Pin toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    disabled={loading}
                  />
                  <div className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                  Pin this announcement to the top of citizen feeds
                </span>
              </label>
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
                    <span>Publishing…</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Publish Announcement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
