import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, dashboardPathForRole } from '../../lib/constants';
import AuthCard from '../../components/auth/AuthCard';
import SignInForm from '../../components/auth/SignInForm';

export default function CitizenSignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Citizen sign in"
        subtitle="Access your resident account to view your profile, complaints, and public updates."
        role={ROLES.CITIZEN}
        footerLink="/citizen/sign-up"
        footerLinkText="Register here"
        footerPrompt="Don't have a citizen account?"
      >
        <SignInForm
          submitLabel="Sign in as citizen"
          emailPlaceholder="citizen@example.com"
          onSubmit={async ({ email, password }) => {
            const { profile, error } = await signIn({ email, password });
            if (error) return { error: error.message };
            const fallback = location.state?.from?.pathname;
            const path = profile?.role === ROLES.CITIZEN && fallback ? fallback : dashboardPathForRole(profile?.role);
            navigate(path, { replace: true });
            return {};
          }}
        />

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Official portals
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/representative/sign-in"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200 font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Representative
            </Link>
            <Link
              to="/department/sign-in"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 border border-slate-200 font-medium"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
              Department
            </Link>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
