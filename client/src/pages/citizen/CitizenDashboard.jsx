import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import {
  FileText,
  PlusCircle,
  FolderGit2,
  Bell,
  MapPin,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export default function CitizenDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalFeature, setActiveModalFeature] = useState('');

  const citizenName = profile?.full_name || user?.email?.split('@')[0] || 'Citizen';
  const constituency = profile?.constituency || 'Not provided';
  const district = profile?.district || 'Not provided';

  // Load database data if configured
  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      if (!isSupabaseConfigured || !user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // 1. Fetch citizen's complaints
        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*, departments(name, code)')
          .eq('citizen_id', user.id)
          .order('created_at', { ascending: false });
        if (complaintsError) throw complaintsError;

        // 2. Fetch public projects in their district
        const { data: projectsData, error: projectsError } = await supabase
          .from('public_projects')
          .select('*, departments(name, code)')
          .order('created_at', { ascending: false })
          .limit(3);
        if (projectsError) throw projectsError;

        // 3. Fetch announcements
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        if (announcementsError) throw announcementsError;

        if (mounted) {
          if (complaintsData) setComplaints(complaintsData);
          if (projectsData) setProjects(projectsData);
          if (announcementsData) setAnnouncements(announcementsData);
        }
      } catch {
        if (mounted) setDataError('Some dashboard information could not be loaded. Refresh the page to try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, [user]);

  const openPhaseNotice = (featureName) => {
    setActiveModalFeature(featureName);
    setModalOpen(true);
  };

  // Complaint metrics
  const submittedCount = complaints.filter((c) => c.status === 'submitted').length;
  const inProgressCount = complaints.filter((c) => ['assigned', 'in_progress', 'under_review'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}
      {/* 1. WELCOME & JURISDICTION SUMMARY */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <RoleBadge role={ROLES.CITIZEN} className="bg-white/10 text-white border-white/20" />
            <span className="text-xs text-blue-200">Resident Citizen Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {citizenName}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Welcome to your JanSetu civic workspace. Here you can report localized community concerns, monitor public infrastructure works, and track municipal complaint resolutions.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>
                {constituency}, {district}
              </span>
            </div>
            {profile?.is_verified && (
              <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                <span>Verified account</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. COMPLAINT STATUS SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Review</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{submittedCount}</p>
            <span className="text-[11px] text-amber-600 font-medium">Pending assignment</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{inProgressCount}</p>
            <span className="text-[11px] text-sky-600 font-medium">Assigned to department</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Issues</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{resolvedCount}</p>
            <span className="text-[11px] text-emerald-600 font-medium">From available records</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. QUICK-ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => openPhaseNotice('Lodge New Civic Complaint')}
          type="button"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-start gap-4 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Lodge New Grievance
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Report potholes, water leakages, garbage, or street lights to the responsible department.
            </p>
          </div>
        </button>

        <a
          href="#public-projects"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-start gap-4 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Explore Public Works
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect budget allocations and completion deadlines for ongoing works in {constituency}.
            </p>
          </div>
        </a>

        <Link
          to="/citizen/profile"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-start gap-4 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Profile &amp; Locality
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Review your registered assembly ward, contact preferences, and security settings.
            </p>
          </div>
        </Link>
      </div>

      {/* 4. MY COMPLAINTS SECTION (WITH HONEST EMPTY STATE) */}
      <section id="my-complaints" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Registered Complaints</h2>
            <p className="text-xs text-slate-500">
              Personal grievances submitted by your account and secured by PostgreSQL Row Level Security.
            </p>
          </div>

          <button
            onClick={() => openPhaseNotice('Lodge New Civic Complaint')}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lodge Complaint</span>
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading your complaints…</p>
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Complaints Submitted Yet"
            description="You have not reported any civic issues yet. When you submit a complaint, its lifecycle status, assigned department official, and resolution updates will appear here."
            actionLabel="Lodge a Civic Issue"
            onAction={() => openPhaseNotice('Lodge New Civic Complaint')}
            isFutureModule={true}
            phase="Phase 2 Complaint Intake"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Department: {item.departments?.name || 'Assigned Division'}</span>
                    <span>•</span>
                    <span>Date: {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. PUBLIC PROJECTS PREVIEW */}
      <section id="public-projects" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Public Works &amp; Infrastructure Projects</h2>
            <p className="text-xs text-slate-500">
              Government civic projects underway in {constituency} and {district}.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            Transparency Feed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length > 0 ? (
            projects.map((proj) => (
              <div key={proj.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{proj.title}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {proj.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{proj.description}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60">
                  <span>Budget: ₹{Number(proj.budget_inr || 0).toLocaleString('en-IN')}</span>
                  <span>Target: {proj.target_completion || 'Scheduled 2026'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2">
              <EmptyState
                icon={FolderGit2}
                title="Public Project Tracking Foundation Active"
                description="Public project listings are planned for a later phase. No live project data is configured."
                isFutureModule={true}
                phase="Database Seed"
              />
            </div>
          )}
        </div>
      </section>

      {/* 6. ANNOUNCEMENTS PREVIEW */}
      <section id="announcements" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Official Constituency Bulletins</h2>
            <p className="text-xs text-slate-500">
              Verified announcements published by elected representatives and municipal departments.
            </p>
          </div>
          <Bell className="w-5 h-5 text-slate-400" />
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((item) => (
              <article key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.content}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {item.category} · {new Date(item.created_at).toLocaleDateString()}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No public announcements yet"
            description="Official notices will appear here when representatives or departments publish them. This module is prepared in the database and will be fully interactive in a later phase."
            isFutureModule={true}
            phase="Coming in the next phase"
          />
        )}
      </section>

      {/* MODAL FOR FUTURE MODULE NOTICES (No fake successful operations!) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeModalFeature}
        footer={
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Understood
          </button>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold">Coming in Next Phase (Phase 2):</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The foundation for <strong>{activeModalFeature}</strong> is prepared in our PostgreSQL database schema (with tables, foreign keys, and RLS policies). Full interactive complaint submission forms and media uploads are scheduled for implementation in Phase 2.
          </p>

          <p className="text-xs text-slate-500">
            In V1 Foundation, our objective is solidifying authentication, secure role isolation, RLS policies, session persistence, and responsive layouts.
          </p>
        </div>
      </Modal>
    </div>
  );
}
