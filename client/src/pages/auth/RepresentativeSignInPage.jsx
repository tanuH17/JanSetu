import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';
import AuthCard from '../../components/auth/AuthCard';
import SignInForm from '../../components/auth/SignInForm';

export default function RepresentativeSignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Representative portal"
        subtitle="Sign-in for provisioned elected representatives. Choosing this page does not grant representative privileges."
        role={ROLES.REPRESENTATIVE}
      >
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Authorized access only</p>
            <p className="text-blue-800 leading-relaxed">
              Representative accounts are created or approved by a trusted administrator. There is no
              self-service representative registration.
            </p>
          </div>
        </div>

        <SignInForm
          submitLabel="Sign in to representative portal"
          emailLabel="Official email address"
          emailPlaceholder="representative@example.com"
          onSubmit={async ({ email, password }) => {
            const { error } = await signIn({
              email,
              password,
              expectedRole: ROLES.REPRESENTATIVE,
            });
            if (error) return { error: error.message };
            navigate(location.state?.from?.pathname || '/representative/dashboard', { replace: true });
            return {};
          }}
        />

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link to="/citizen/sign-in" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Citizen sign in
          </Link>
          <Link to="/department/sign-in" className="text-indigo-600 font-semibold hover:underline">
            Department sign in
          </Link>
        </div>
      </AuthCard>
    </div>
  );
}
