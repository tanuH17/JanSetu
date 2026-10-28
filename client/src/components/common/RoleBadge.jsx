import React from 'react';
import { ROLE_CONFIG, ROLES } from '../../lib/constants';
import { Shield, User, Building2 } from 'lucide-react';

export default function RoleBadge({ role, showIcon = true, className = '' }) {
  const config = ROLE_CONFIG[role];
  if (!config) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200 ${className}`}>
        Unassigned
      </span>
    );
  }

  const getIcon = () => {
    switch (role) {
      case ROLES.REPRESENTATIVE:
        return <Shield className="w-3.5 h-3.5" />;
      case ROLES.DEPARTMENT:
        return <Building2 className="w-3.5 h-3.5" />;
      default:
        return <User className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeColor} ${className}`}
    >
      {showIcon && getIcon()}
      <span>{config.name}</span>
    </span>
  );
}
