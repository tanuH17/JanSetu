import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Shield,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Lock,
  Eye,
} from 'lucide-react';
import RoleBadge from '../../components/common/RoleBadge';
import { ROLES } from '../../lib/constants';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: 'Is JanSetu an official government agency application?',
      answer:
        'No. JanSetu is a developing, independent public-service management platform for a college project. It is not an official government portal and is not endorsed by a government agency.',
    },
    {
      question: 'How do Citizens register on JanSetu?',
      answer:
        'Citizens can sign up freely through the citizen registration portal by entering their full name, email address, password (minimum 12 characters), and optional jurisdiction details such as district and constituency.',
    },
    {
      question: 'Why can’t Representatives or Department Officials register directly?',
      answer:
        'To prevent impersonation and maintain institutional integrity, JanSetu enforces strict Row Level Security (RLS). Representative and Official accounts cannot be self-created; they must be provisioned and approved through an authorized administrative workflow.',
    },
    {
      question: 'How are complaints tracked from submission to resolution?',
      answer:
        'Complaint intake and tracking are planned for a later phase. The current version provides account access and role-specific dashboard foundations, but does not yet accept or process complaints.',
    },
    {
      question: 'What regions are currently covered in this pilot version?',
      answer:
        'No live jurisdiction or government deployment is currently configured. A user can select a location during registration, but this is profile information only.',
    },
  ];

  return (
    <div className="space-y-24 py-6 sm:py-10">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Smart Public Service &amp; Constituency Governance Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Connecting <span className="text-blue-600">Citizens</span>,{' '}
            <span className="text-emerald-600">Representatives</span>, and{' '}
            <span className="text-indigo-600">Public Services</span>.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            JanSetu is a developing platform intended to make public-service communication clearer.
            Its first version establishes secure accounts and role-specific workspaces; complaint
            reporting, project tracking, and public updates are planned for later phases.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/citizen/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all"
            >
              Explore JanSetu
            </a>
          </div>

          {/* Core Trust Pillars */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-blue-600 font-bold text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tracked
              </div>
              <p className="text-xs text-slate-500">Complaint tracking is planned for a later phase.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-emerald-600 font-bold text-sm mb-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Accountable
              </div>
              <p className="text-xs text-slate-500">Authorized representative access is provisioned by an administrator.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-indigo-600 font-bold text-sm mb-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Multi-Dept
              </div>
              <p className="text-xs text-slate-500">Department workspaces are planned for future service workflows.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-amber-600 font-bold text-sm mb-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Secure RLS
              </div>
              <p className="text-xs text-slate-500">PostgreSQL Row Level Security protects every record.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT JANSETU SECTION */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
              <span>Why JanSetu Exists</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Solving the Untracked Grievance &amp; Information Gap in Civic Governance
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Public-service requests can be difficult to follow when status, ownership, and updates are spread
              across different channels. JanSetu is being developed to give citizens and authorized public-service
              teams a shared, clearer view of those workflows.
            </p>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              <strong>JanSetu</strong> currently provides secure sign-in, citizen profiles, and separate dashboard
              foundations for citizens, representatives, and department officials. The complaint and project
              workflows remain future work; this project is not connected to government services.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Capabilities</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Trust, Speed &amp; Civic Transparency
          </p>
          <p className="text-sm text-slate-500">
            A reliable architecture built on Supabase PostgreSQL and modern web engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Transparent Complaint Tracking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complaint submission and status tracking are planned for a later phase.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Representative Oversight</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized representative accounts receive a dashboard foundation; complaint oversight and announcements are not active yet.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Departmental Workdesks</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized department accounts receive a dashboard foundation; assignment and resolution tools are not active yet.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Public Project Monitoring</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track government roadworks, drainage installations, and street lighting initiatives with published budget allocations, contractor timelines, and completion metrics.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Row Level Security (RLS)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Database-level authorization ensures citizens can only inspect permitted records, preventing data leaks and blocking unauthorized self-elevation of user roles.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Verified Public Information</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Official circulars and maintenance schedules are posted strictly by authenticated representatives and verified departments, preventing misinformation.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Process Flow</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            The Complaint-to-Resolution Lifecycle
          </p>
            <p className="text-sm text-slate-500">
            This example shows the workflow planned for a later phase; complaint handling is not active yet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              01
            </div>
            <h3 className="text-sm font-bold text-slate-900">1. Citizen Lodges Grievance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Resident submits description, location landmark, category, and department routing.
            </p>
            <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Planned: Submit
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              02
            </div>
            <h3 className="text-sm font-bold text-slate-900">2. Department Review</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Responsible municipal wing reviews jurisdiction, verifies field requirements, and assigns field inspectors.
            </p>
            <span className="inline-block text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Planned: Review
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              03
            </div>
            <h3 className="text-sm font-bold text-slate-900">3. Action &amp; Oversight</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Field work commences. The constituency representative monitors deadline adherence.
            </p>
            <span className="inline-block text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
              Planned: Track
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
              04
            </div>
            <h3 className="text-sm font-bold text-slate-900">4. Closure &amp; Verification</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official records resolution summary. Citizen inspects the outcome and provides civic feedback.
            </p>
            <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Planned: Close
            </span>
          </div>
        </div>
      </section>

      {/* 5. USER ROLES SECTION */}
      <section id="user-roles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Stakeholders</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Role-Based Civic Architecture
          </p>
          <p className="text-sm text-slate-500">
            Tailored interfaces with strictly enforced Row Level Security policies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Citizen Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <RoleBadge role={ROLES.CITIZEN} />
              </div>

              <h3 className="text-xl font-bold text-slate-900">Citizens &amp; Residents</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Open registration. Access full grievance tracking, discover local public projects, and participate in community discussions.
              </p>

              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Self-service registration &amp; instant login
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Lodge and track civic issues
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Monitor constituency public works
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                to="/citizen/sign-up"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Register as Citizen
              </Link>
            </div>
          </div>

          {/* Representative Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <RoleBadge role={ROLES.REPRESENTATIVE} />
              </div>

              <h3 className="text-xl font-bold text-slate-900">Elected Representatives</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated oversight dashboard for MLAs, MPs, and Ward Councillors. Inspect grievance trends and enforce departmental accountability.
              </p>

              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Constituency-wide grievance heatmaps
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Official public broadcast announcements
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Verified administrative provisioning
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                to="/representative/sign-in"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Representative Sign In
              </Link>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Requires administrative authorization
              </p>
            </div>
          </div>

          {/* Department Official Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <RoleBadge role={ROLES.DEPARTMENT} />
              </div>

              <h3 className="text-xl font-bold text-slate-900">Department Officials</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Engineers and department managers in PWD, Water Supply, Electricity, and Municipal corporations to resolve assigned tasks.
              </p>

              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Assigned complaints task queue
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Status updates &amp; resolution notes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Public project progress reporting
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                to="/department/sign-in"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Department Official Sign In
              </Link>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Requires department administrative access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENCY & ACCOUNTABILITY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative z-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Governance &amp; Security Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Engineering Civic Accountability Without Compromising Security
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Public service management platforms handle sensitive personal grievances and municipal records.
              JanSetu enforces zero-trust data separation:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-white block mb-1">Authoritative Role Storage</span>
                Roles are guarded in protected PostgreSQL database structures, not in editable client cookies or insecure tokens.
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-white block mb-1">Row Level Isolation</span>
                A citizen can never read another citizen’s private contact records. Officials only access records within their departmental scope.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">FAQ</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
