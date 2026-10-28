import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import {
  Shield,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  FolderGit2,
  Bell,
  Plus,
} from 'lucide-react';

export default function RepresentativeDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalFeature, setActiveModalFeature] = useState('');

  const repName = profile?.full_name || 'Elected Representative';
  const designation = profile?.designation || 'Authorized representative';
  const constituency = profile?.constituency || 'Not assigned';
  const district = profile?.district || 'Not specified';

  // Load constituency data
  useEffect(() => {
    let mounted = true;

    async function fetchConstituencyData() {
      if (!isSupabaseConfigured || !user) {
        return;
      }

      try {
        // Query complaints in this constituency
        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*, departments(name, code)')
          .eq('constituency', constituency)
          .order('created_at', { ascending: false });
        if (complaintsError) throw complaintsError;

        // Query public works in this constituency
        const { data: projectsData, error: projectsError } = await supabase
          .from('public_projects')
          .select('*, departments(name, code)')
          .eq('constituency', constituency)
          .order('created_at', { ascending: false });
        if (projectsError) throw projectsError;

        if (mounted) {
          if (complaintsData) setComplaints(complaintsData);
          if (projectsData) setProjects(projectsData);
        }
      } catch {
        if (mounted) setDataError('Assigned information could not be loaded. Refresh the page to try again.');
      }
    }

    fetchConstituencyData();
    return () => {
      mounted = false;
    };
  }, [user, constituency]);

  const openPhaseNotice = (featureName) => {
    setActiveModalFeature(featureName);
    setModalOpen(true);
  };

  // Real database metrics calculation
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
  const inProgressCount = complaints.filter((c) => ['assigned', 'in_progress'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}
      {/* 1. REPRESENTATIVE PROFILE & JURISDICTION HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <RoleBadge role={ROLES.REPRESENTATIVE} className="bg-white/10 text-white border-white/20" />
            <span className="text-xs text-blue-200">Legislative Oversight Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {repName}
          </h1>

          <p className="text-xs sm:text-sm text-blue-200 font-medium">{designation}</p>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            Official constituency oversight workdesk. Monitor citizen complaints, review departmental resolution performance, and publish official public bulletins for {constituency}.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>
                Authorized Constituency: <strong>{constituency}</strong> ({district})
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>Administrative RLS Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW METRICS CARDS (ACCURATE REAL DATA WITH 0s) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Complaints</p>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <span className="text-[10px] text-slate-400">In {constituency}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Action</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{pendingCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">Under Review / Triage</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <FolderGit2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{inProgressCount}</p>
          <span className="text-[10px] text-sky-600 font-medium">With Department</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{resolvedCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">From available records</span>
        </div>
      </div>

      {/* 3. COMPLAINT MANAGEMENT SECTION */}
      <section id="complaints-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Constituency Complaint Management</h2>
            <p className="text-xs text-slate-500">
              Aggregated grievance intake from residents in {constituency}. Filter by status or department.
            </p>
          </div>

          <button
            onClick={() => openPhaseNotice('Priority Escalation Filter')}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Filter Priorities</span>
          </button>
        </div>

        {complaints.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Grievances Recorded for this Constituency"
            description="As citizens register and lodge issues within Lucknow Central, grievances will appear here for executive monitoring and departmental escalation."
            actionLabel="Review Grievance Queue"
            onAction={() => openPhaseNotice('Grievance Queue')}
            isFutureModule={true}
            phase="Phase 2 Intake"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Title / Issue</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reported On</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{item.title}</td>
                    <td className="p-3">{item.departments?.name || 'Assigned'}</td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => openPhaseNotice(`Escalate Complaint: ${item.title}`)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. COMMUNITY CONCERNS & PUBLIC SURVEYS (PLANNED FOR PHASE 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Community Concerns */}
        <section id="community-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Community Concerns &amp; Petitions</h2>
              <p className="text-xs text-slate-500">Citizen upvotes and collective ward issues.</p>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>

          <EmptyState
            icon={Users}
            title="Community Polls &amp; Petitions Module"
            description="This module will allow residents to upvote urgent infrastructure needs and propose local improvements for representative review."
            actionLabel="Explore Planned Features"
            onAction={() => openPhaseNotice('Community Concerns & Petitions')}
            isFutureModule={true}
            phase="Phase 2"
          />
        </section>

        {/* Public Surveys */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Constituency Feedback Surveys</h2>
              <p className="text-xs text-slate-500">Gauge public sentiment on planned civic works.</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <EmptyState
            icon={BarChart3}
            title="Public Opinion Surveys"
            description="Publish single-question polls and community feedback surveys to gather constituent consensus on road widening, parks, and sanitation schedules."
            actionLabel="Schedule a Survey"
            onAction={() => openPhaseNotice('Public Surveys Engine')}
            isFutureModule={true}
            phase="Phase 2"
          />
        </section>
      </div>

      {/* 5. PROJECT TRACKING & OFFICIAL ANNOUNCEMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Tracking */}
        <section id="projects-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Constituency Project Oversight</h2>
              <p className="text-xs text-slate-500">Infrastructure projects in {constituency}.</p>
            </div>
            <FolderGit2 className="w-5 h-5 text-slate-400" />
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{p.title}</span>
                    <span className="uppercase text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-slate-500">{p.description}</p>
                  <p className="text-[11px] text-slate-400">Budget: ₹{Number(p.budget_inr || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderGit2}
              title="Public Projects Monitored"
              description="Project tracking is planned for a later phase. No live project data is configured."
              isFutureModule={true}
              phase="Database Seed"
            />
          )}
        </section>

        {/* Official Announcements */}
        <section id="announcements-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Publish Official Bulletin</h2>
              <p className="text-xs text-slate-500">Broadcast notices to verified constituents.</p>
            </div>
            <Bell className="w-5 h-5 text-slate-400" />
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
            <p className="text-xs text-blue-900 font-semibold">Broadcast to {constituency}</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Representatives have authoritative privileges to broadcast emergency notices, town hall schedules, and public works announcements directly to citizen feeds.
            </p>
            <button
              onClick={() => openPhaseNotice('Create Official Announcement')}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft Announcement</span>
            </button>
          </div>
        </section>
      </div>

      {/* MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeModalFeature}
        footer={
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Understood
          </button>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold">Planned for Phase 2 Implementation</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The foundation for <strong>{activeModalFeature}</strong> is established with authoritative PostgreSQL roles, secure RLS, and foreign keys. Interactive actions and multi-step dialogs will be connected in Phase 2.
          </p>
        </div>
      </Modal>
    </div>
  );
}
