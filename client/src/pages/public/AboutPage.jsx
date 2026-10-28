import React from 'react';
import { Target, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">About JanSetu</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Bridging the Civic Divide with Transparent Technology
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          JanSetu is an open public-service and constituency management initiative conceived to modernize how citizens interact with municipal agencies and elected representatives.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-xl font-bold text-slate-900">The Problem We Are Solving</h2>
        <p>
          Citizens frequently struggle to track the progress of basic civic complaints, such as potholes, disrupted water supplies, uncollected waste, and faulty street lamps. Complaints submitted via physical letters or manual phone calls often disappear without an audit trail, leading to disillusionment and delayed municipal responses.
        </p>
        <p>
          Simultaneously, elected representatives (MLAs, MPs, and local corporators) often find it difficult to evaluate which public works departments are performing effectively across different wards of their constituency.
        </p>

        <h2 className="text-xl font-bold text-slate-900 pt-4">The JanSetu Solution</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Transparent Grievance Pipeline
            </h3>
            <p className="text-xs text-slate-600">
              Direct tracking from complaint submission to field resolution with photo documentation and official sign-off.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Synchronized Roles
            </h3>
            <p className="text-xs text-slate-600">
              Clear boundaries between citizens, elected representatives, and departmental engineers.
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 pt-4">Academic &amp; Pilot Context</h2>
        <p className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-xs text-blue-900">
          This system is being actively developed as a college minor project with production-grade engineering principles. It uses PostgreSQL with Row Level Security, Supabase Authentication, and React Vite architecture to demonstrate high standard civic tech.
        </p>
      </div>
    </div>
  );
}
