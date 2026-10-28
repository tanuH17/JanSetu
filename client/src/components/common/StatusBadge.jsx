import React from 'react';
import { COMPLAINT_STATUSES } from '../../lib/constants';

export default function StatusBadge({ status, className = '' }) {
  const normalizedKey = (status || 'submitted').toUpperCase().replace(/\s+/g, '_');
  const config = COMPLAINT_STATUSES[normalizedKey] || {
    label: status || 'Unknown',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {config.label}
    </span>
  );
}
