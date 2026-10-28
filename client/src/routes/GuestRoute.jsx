import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../lib/constants';

export default function GuestRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" aria-hidden="true" />
        <p className="text-sm text-slate-600">Checking your session…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to={dashboardPathForRole(profile?.role)} replace />;
  }

  return <Outlet />;
}
