import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  Building2,
  CalendarDays,
  StickyNote,
  ExternalLink,
  Image,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { resolvePrivateMediaUrl } from '../../lib/media';

// Status timeline definition — in display order
const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Submitted', description: 'Your grievance has been received.' },
  { key: 'under_review', label: 'Under Review', description: 'Being triaged for departmental inspection.' },
  { key: 'in_progress', label: 'In Progress', description: 'Active field investigation or repair in progress.' },
  { key: 'resolved', label: 'Resolved', description: 'Action taken and documented.' },
];

const STATUS_STEP_INDEX = {
  submitted: 0,
  under_review: 1,
  assigned: 1,
  in_progress: 2,
  resolved: 3,
  rejected: 3,
};

function TimelineStep({ step, index, currentStepIndex, isRejected }) {
  const isDone = index < currentStepIndex;
  const isCurrent = index === currentStepIndex;

  const isRejectStep = isRejected && index === TIMELINE_STEPS.length - 1;

  let circleClass = 'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ';
  let labelClass = 'text-xs font-semibold ';
  let descClass = 'text-[11px] ';

  if (isRejectStep) {
    circleClass += 'bg-rose-500 border-rose-500 text-white';
    labelClass += 'text-rose-700';
    descClass += 'text-rose-500';
  } else if (isDone) {
    circleClass += 'bg-emerald-500 border-emerald-500 text-white';
    labelClass += 'text-emerald-700';
    descClass += 'text-emerald-600';
  } else if (isCurrent) {
    circleClass += 'bg-blue-600 border-blue-600 text-white';
    labelClass += 'text-blue-700';
    descClass += 'text-blue-500';
  } else {
    circleClass += 'bg-slate-100 border-slate-300 text-slate-400';
    labelClass += 'text-slate-400';
    descClass += 'text-slate-400';
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
          {isRejectStep && isRejected ? 'Rejected / Closed' : step.label}
        </p>
        <p className={descClass}>
          {isRejectStep && isRejected ? 'This complaint was evaluated and closed without further action.' : step.description}
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

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video/') || url.includes('.mp4?') || url.includes('.webm?');
}

export default function ComplaintDetailsModal({ isOpen, onClose, complaint }) {
  const [copied, setCopied] = useState(false);
  const [mediaViews, setMediaViews] = useState({ key: '', attachment: null, resolution: null });
  const mediaKey = `${complaint?.id || ''}:${complaint?.attachment_url || ''}:${complaint?.resolution_attachment_url || ''}`;

  useEffect(() => {
    let active = true;
    Promise.all([
      resolvePrivateMediaUrl('complaint-attachments', complaint?.attachment_url).catch(() => null),
      resolvePrivateMediaUrl('complaint-attachments', complaint?.resolution_attachment_url).catch(() => null),
    ]).then(([attachment, resolution]) => {
      if (active) {
        setMediaViews({ key: mediaKey, attachment, resolution });
      }
    });
    return () => { active = false; };
  }, [complaint?.id, complaint?.attachment_url, complaint?.resolution_attachment_url, mediaKey]);

  if (!isOpen || !complaint) return null;

  const isRejected = complaint.status === 'rejected';
  const attachmentViewUrl = mediaViews.key === mediaKey ? mediaViews.attachment : null;
  const resolutionViewUrl = mediaViews.key === mediaKey ? mediaViews.resolution : null;
  const currentStepIndex = STATUS_STEP_INDEX[complaint.status] ?? 0;

  const handleCopyTrackingId = async () => {
    if (!complaint.tracking_id) return;
    try {
      await navigator.clipboard.writeText(complaint.tracking_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-xl w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complaint-details-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-400">Grievance Record</span>
              {complaint.tracking_id && (
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Click to copy tracking ID"
                >
                  <span>{complaint.tracking_id}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-blue-500" />}
                </button>
              )}
            </div>
            <h3 id="complaint-details-title" className="text-base sm:text-lg font-bold text-slate-900">
              {complaint.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Status & Priority Badge Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Current Status:</span>
              <StatusBadge status={complaint.status} />
            </div>
            {complaint.priority && (
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Priority: {complaint.priority}
              </span>
            )}
          </div>

          {/* Lifecycle Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Lifecycle</h4>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              {TIMELINE_STEPS.map((step, idx) => (
                <TimelineStep
                  key={step.key}
                  step={step}
                  index={idx}
                  currentStepIndex={currentStepIndex}
                  isRejected={isRejected}
                />
              ))}
            </div>
          </div>

          {/* Complainant Issue Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Grievance Description</h4>
            <p className="text-xs text-slate-700 leading-relaxed p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              {complaint.description}
            </p>
          </div>

          {/* Supporting Evidence Image/Video if Present */}
          {complaint.attachment_url && attachmentViewUrl && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-blue-500" /> Supporting Evidence ({isVideoUrl(complaint.attachment_url) ? 'Video' : 'Photo'})
              </h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 max-h-56">
                {isVideoUrl(complaint.attachment_url) ? (
                  <video
                    src={attachmentViewUrl}
                    controls
                    className="w-full h-48 object-cover bg-black"
                  />
                ) : (
                  <a href={attachmentViewUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                    <img
                      src={attachmentViewUrl}
                      alt="Supporting attachment"
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity">
                      <ExternalLink className="w-4 h-4" /> Open Full Image
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Department / Representative Resolution Notes */}
          {complaint.resolution_notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Department Resolution Remarks
              </h4>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="leading-relaxed">{complaint.resolution_notes}</p>
                {complaint.resolved_at && (
                  <p className="text-[10px] text-emerald-700 font-mono pt-1">
                    Resolved at: {new Date(complaint.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resolution Evidence Uploaded by Department */}
          {complaint.resolution_attachment_url && resolutionViewUrl && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Work Completion Proof ({isVideoUrl(complaint.resolution_attachment_url) ? 'Video' : 'Photo'})
              </h4>
              <div className="rounded-2xl border border-emerald-200 overflow-hidden bg-slate-100 max-h-56">
                {isVideoUrl(complaint.resolution_attachment_url) ? (
                  <video
                    src={resolutionViewUrl}
                    controls
                    className="w-full h-48 object-cover bg-black"
                  />
                ) : (
                  <a href={resolutionViewUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                    <img
                      src={resolutionViewUrl}
                      alt="Work completion proof"
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity">
                      <ExternalLink className="w-4 h-4" /> View Completion Proof
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Metadata Information */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jurisdiction &amp; Routing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <InfoRow icon={Building2} label="Department" value={complaint.departments?.name || 'Pending routing'} />
              <InfoRow icon={FileText} label="Category" value={complaint.category} />
              <InfoRow icon={MapPin} label="Location" value={`${complaint.landmark || ''}, ${complaint.constituency || ''}, ${complaint.district || ''}`} />
              <InfoRow icon={CalendarDays} label="Reported On" value={new Date(complaint.created_at).toLocaleDateString()} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
