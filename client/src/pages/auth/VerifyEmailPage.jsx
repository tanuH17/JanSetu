import React from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <AuthCard
        title="Email Verification"
        subtitle="Confirm your identity to activate all JanSetu citizen privileges."
        badgeText="Verification"
      >
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-slate-900">Check Your Inbox</h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            We sent an email verification link to your registered email address. Please click the link to confirm your account and enable full complaint filing privileges.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-2">
            <p className="font-semibold text-slate-900">Did not receive the email?</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
              <li>Wait 2-3 minutes for server delivery.</li>
              <li>Check your Junk or Spam directory.</li>
              <li>Ensure your Supabase project has SMTP configured or has Auto-Confirm enabled for local testing.</li>
            </ul>
          </div>

          <div className="pt-2">
            <Link
              to="/citizen/sign-in"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <span>Proceed to Citizen Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
