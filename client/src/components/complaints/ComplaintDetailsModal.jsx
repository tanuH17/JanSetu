import React from 'react';
import { X, Copy, CheckCircle2, Clock, FileText, MapPin, Tag, Building2, CalendarDays, StickyNote } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

// Status timeline definition — in display order
const TIMELINE_STEPS = [
  { key: 'submitted',    label: 'Submitted',    description: 'Your complaint has been received.' },
  { key: 'under_review', label: 'Under Review',  description: 'Being reviewed for assignment.' },
  { key: 'in_progress',  label: 'In Progress',   description: 'Department is actively working on it.' },
  { key: 'resolved',     label: 'Resolved',      description: 'Issue has been addressed.' },
];

// Map every possible DB status to its timeline step index (0-based)
const STATUS_STEP_INDEX = {
  submitted:    0,
  under_review: 1,
  assigned:     1, // Show at "Under Review" tier for display purposes
  in_progress:  2,
  resolved:     3,
  rejected:     3, // Show at end, but coloured differently
};

function TimelineStep({ step, index, currentStepIndex, isRejected }) {
  const isDone    = index < currentStepIndex;
  const isCurrent = index === currentStepIndex;
  const isFuture  = index > currentStepIndex;

  // Special colouring for rejection at the final step
  const isRejectStep = isRejected && index === TIMELINE_STEPS.length - 1;

  let circleClass = 'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ';
  let labelClass  = 'text-xs font-semibold ';
  let descClass   = 'text-[11px] ';

  if (isRejectStep) {
    circleClass += 'bg-rose-500 border-rose-500 text-white';
    labelClass  += 'text-rose-700';
    descClass   += 'text-rose-500';
  } else if (isDone) {
    circleClass += 'bg-emerald-500 border-emerald-500 text-white';
    labelClass  += 'text-emerald-700';
    descClass   += 'text-emerald-600';
  } else if (isCurrent) {
    circleClass += 'bg-blue-600 border-blue-600 text-white';
    labelClass  += 'text-blue-700';
    descClass   += 'text-blue-500';
  } else {
    circleClass += 'bg-slate-100 border-slate-300 text-slate-400';
    labelClass  += 'text-slate-400';
    descClass   += 'text-slate-400';
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={circleClass}>
          {isDone && !isRejectStep ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isCurrent || isRejectStep ? (
            <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          )}
        </div>
        {index < TIMELINE_STEPS.length - 1 && (
          <div className={`w-0.5 h-6 mt-1 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
        )}
      </div>
      <div className="pb-1">
        <p className={labelClass}>
          {isRejectStep && isRejected ? 'Rejected' : step.label}
        </p>
        <p className={descClass}>
          {isRejectStep && isRejected ? 'This complaint was not actioned.' : step.description}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-slate-500">{label}: </span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
    </div>
  );
}

export default function ComplaintDetailsModal({ isOpen, onClose, complaint }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !complaint) return null;

  const isRejected = complaint.status === 'rejected';
  const currentStepIndex = STATUS_STEP_INDEX[complaint.status] ?? 0;

  function handleCopy() {
    if (complaint.tracking_id) {
      navigator.clipboard.writeText(complaint.tracking_id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdet-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div className="space-y-1 pr-4">
            <h3 id="cdet-title" className="text-base font-bold text-slate-900 leading-snug">
              {complaint.title}
            </h3>
            {complaint.tracking_id && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  {complaint.tracking_id}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy tracking ID"
                  className="p-0.5 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            <div className="pt-0.5">
              <StatusBadge status={complaint.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Meta info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <InfoRow icon={Tag}         label="Category"      value={complaint.category} />
            <InfoRow icon={MapPin}      label="District"      value={complaint.district} />
            <InfoRow icon={MapPin}      label="Constituency"  value={complaint.constituency} />
            <InfoRow icon={MapPin}      label="Landmark"      value={complaint.landmark} />
            <InfoRow icon={Building2}   label="Department"    value={complaint.departments?.name || null} />
            <InfoRow icon={CalendarDays} label="Submitted"   value={formatDate(complaint.created_at)} />
            {complaint.updated_at && complaint.updated_at !== complaint.created_at && (
              <InfoRow icon={Clock} label="Last Updated" value={formatDate(complaint.updated_at)} />
            )}
          </div>

          {/* Description */}
          {complaint.description && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Description</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                {complaint.description}
              </p>
            </div>
          )}

          {/* Status Timeline */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 mb-3">Complaint Progress</p>
            {TIMELINE_STEPS.map((step, index) => (
              <TimelineStep
                key={step.key}
                step={step}
                index={index}
                currentStepIndex={currentStepIndex}
                isRejected={isRejected}
              />
            ))}
          </div>

          {/* Resolution / Rejection notes */}
          {(complaint.status === 'resolved' || complaint.status === 'rejected') && complaint.resolution_notes && (
            <div className={`rounded-xl p-3.5 border space-y-1 ${
              complaint.status === 'resolved'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-1.5">
                <StickyNote className={`w-3.5 h-3.5 ${complaint.status === 'resolved' ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span className={`text-xs font-semibold ${complaint.status === 'resolved' ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {complaint.status === 'resolved' ? 'Resolution Notes' : 'Rejection Reason'}
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${complaint.status === 'resolved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {complaint.resolution_notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
