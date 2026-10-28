import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">JanSetu Privacy Policy</h1>
      <p className="text-xs text-slate-500">Effective Date: October 2026 | Platform Version: 1.0.0-foundation</p>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-sm text-slate-700 space-y-5 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900">1. Data Minimization Principle</h2>
        <p>
          JanSetu strictly limits collection to details necessary for civic grievance tracking and constituency coordination. We collect your full name, email address, and optional district/constituency for issue routing. We do NOT collect national identity numbers, biometric data, or financial credentials.
        </p>

        <h2 className="text-base font-bold text-slate-900">2. Row Level Security &amp; Isolation</h2>
        <p>
          All profile and grievance data is stored within PostgreSQL managed by Supabase, protected by Row Level Security (RLS) policies. Other citizens cannot query or view your contact information or personal complaints.
        </p>

        <h2 className="text-base font-bold text-slate-900">3. Authentication Credentials</h2>
        <p>
          Passwords are never stored in plaintext. They are handled by Supabase Auth with industry-standard bcrypt/Argon2 hashing. JanSetu administrators never have access to your raw password.
        </p>

        <h2 className="text-base font-bold text-slate-900">4. College Minor Project Notice</h2>
        <p>
          This deployment is part of a collegiate software development effort. Data stored within test environments may be periodically migrated or reset as part of architectural testing.
        </p>
      </div>
    </div>
  );
}
