import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Alert({ type = 'info', message, details, onClose, className = '' }) {
  if (!message) return null;

  const styles = {
    error: {
      wrapper: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
      closeBtn: 'hover:bg-rose-100 text-rose-700',
    },
    success: {
      wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
      closeBtn: 'hover:bg-emerald-100 text-emerald-700',
    },
    warning: {
      wrapper: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      closeBtn: 'hover:bg-amber-100 text-amber-700',
    },
    info: {
      wrapper: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      closeBtn: 'hover:bg-blue-100 text-blue-700',
    },
  }[type] || styles.info;

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${styles.wrapper} ${className}`}
    >
      {styles.icon}
      <div className="flex-1 text-sm">
        <p className="font-semibold">{message}</p>
        {details && <p className="mt-1 text-xs opacity-90">{details}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close notification"
          className={`p-1 rounded-lg transition-colors ${styles.closeBtn}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
