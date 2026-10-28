import React from 'react';
import { Link } from 'react-router-dom';
import RoleBadge from '../common/RoleBadge';

export default function AuthCard({
  role,
  title,
  subtitle,
  children,
  badgeText,
  footerLink,
  footerLinkText,
  footerPrompt,
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-4 group"
            title="Return to JanSetu Home"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              JS
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold text-slate-900 leading-tight">JanSetu</span>
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">
                Civic Governance Platform
              </span>
            </div>
          </Link>

          {role && (
            <div className="flex justify-center mb-3">
              <RoleBadge role={role} />
            </div>
          )}

          {badgeText && !role && (
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {badgeText}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{subtitle}</p>}
        </div>

        {children}

        {footerLink && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-600">
            {footerPrompt}{' '}
            <Link
              to={footerLink}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              {footerLinkText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
