import React from 'react';
import { Inbox, Sparkles } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  isFutureModule = false,
  phase = 'Phase 2',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      {isFutureModule && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
          <Sparkles className="w-3 h-3 text-blue-500" />
          Planned for {phase}
        </span>
      )}

      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
