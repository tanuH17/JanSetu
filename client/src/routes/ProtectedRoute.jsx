import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_CONFIG } from '../lib/constants';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
            JS
          </div>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Checking your JanSetu session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    let redirectPath = ROLE_CONFIG[ROLES.CITIZEN].signInPath;
    if (allowedRoles?.includes(ROLES.REPRESENTATIVE)) {
      redirectPath = ROLE_CONFIG[ROLES.REPRESENTATIVE].signInPath;
    } else if (allowedRoles?.includes(ROLES.DEPARTMENT)) {
      redirectPath = ROLE_CONFIG[ROLES.DEPARTMENT].signInPath;
    }
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (!profile?.role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-3 text-center">
          <h1 className="text-lg font-bold text-slate-900">Profile not ready</h1>
          <p className="text-sm text-slate-600">
            Your sign-in succeeded, but a protected profile record was not found yet. Confirm that the
            database migration has been applied, then refresh this page.
          </p>
          <a href="/" className="inline-block text-sm font-semibold text-blue-600 hover:underline">
            Return home
          </a>
        </div>
      </div>
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          attemptedPath: location.pathname,
          userRole: profile.role,
          requiredRoles: allowedRoles,
        }}
        replace
      />
    );
  }

  return children;
}
