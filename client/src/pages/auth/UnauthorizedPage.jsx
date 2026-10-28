import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import { ShieldAlert, LogOut, LayoutDashboard } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const userRole = profile?.role;
  const attemptedPath = location.state?.attemptedPath || 'the requested restricted portal';
  const myDashboardPath = userRole ? ROLE_CONFIG[userRole]?.dashboardPath : '/';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have administrative authorization to access{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">
              {attemptedPath}
            </code>
            .
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Your Current Account Role:</span>
            {userRole ? <RoleBadge role={userRole} /> : <span className="text-xs text-slate-500">Unknown</span>}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Account ID:</span>
            <span className="font-mono text-[11px] text-slate-600 truncate max-w-[150px]">
              {user?.id || 'Unauthenticated'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            Representative and Department Official routes are guarded by Supabase Row Level Security (RLS). Privileges cannot be elevated on the client.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to={myDashboardPath}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to My Dashboard</span>
          </Link>

          <button
            onClick={() => signOut()}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
