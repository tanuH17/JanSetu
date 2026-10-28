import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">JanSetu Terms of Use</h1>
      <p className="text-xs text-slate-500">Effective Date: October 2026 | Platform Version: 1.0.0-foundation</p>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-sm text-slate-700 space-y-5 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By creating an account or accessing JanSetu, you agree to abide by these terms. This platform is intended solely for civic complaint reporting, community feedback, and public service monitoring.
        </p>

        <h2 className="text-base font-bold text-slate-900">2. Responsible Civic Reporting</h2>
        <p>
          Users agree to submit truthful, accurate descriptions of civic problems (e.g. damaged roads, water leaks, power outages). Submitting defamatory, abusive, fraudulent, or harassing content is strictly prohibited and results in immediate account suspension.
        </p>

        <h2 className="text-base font-bold text-slate-900">3. Role Authentication &amp; Prohibition of Self-Elevation</h2>
        <p>
          Any attempt to manipulate client requests to claim unauthorized Representative or Department Official status violates platform security guidelines. All role changes are audited and secured via database-level triggers.
        </p>

        <h2 className="text-base font-bold text-slate-900">4. Independent Platform Disclaimer</h2>
        <p>
          JanSetu is an independent academic project and not an official organ of the Government of India or any state government. It does not replace statutory emergency response services (such as Police 112, Fire 101, or Ambulance 108).
        </p>
      </div>
    </div>
  );
}
