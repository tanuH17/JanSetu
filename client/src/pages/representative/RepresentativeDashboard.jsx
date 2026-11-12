import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES, COMPLAINT_STATUSES } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import UpdateComplaintModal from '../../components/complaints/UpdateComplaintModal';
import CreateAnnouncementModal from '../../components/announcements/CreateAnnouncementModal';
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
  Filter,
  Megaphone,
  CalendarDays,
  Pin,
} from 'lucide-react';

export default function RepresentativeDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalFeature, setActiveModalFeature] = useState('');

  // Feature 3 — complaint management
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Feature 4 — announcements
  const [announceModalOpen, setAnnounceModalOpen] = useState(false);

  const repName = profile?.full_name || 'Elected Representative';
  const designation = profile?.designation || 'Authorized representative';
  const constituency = profile?.constituency || 'Not assigned';
  const district = profile?.district || 'Not specified';

  // Load constituency data
  useEffect(() => {
    let mounted = true;

    async function fetchConstituencyData() {
      if (!isSupabaseConfigured || !user) {
        if (mounted) setLoading(false);
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

        // Query announcements authored by this representative
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });
        if (announcementsError) throw announcementsError;

        if (mounted) {
          if (complaintsData) setComplaints(complaintsData);
          if (projectsData) setProjects(projectsData);
          if (announcementsData) setAnnouncements(announcementsData);
        }
      } catch {
        if (mounted) setDataError('Assigned information could not be loaded. Refresh the page to try again.');
      } finally {
        if (mounted) setLoading(false);
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

  // Feature 3 — when a complaint is updated, merge into list
  const handleComplaintUpdated = (updatedComplaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
  };

  // Feature 4 — prepend new announcement to list
  const handleAnnouncementCreated = (newAnnouncement) => {
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  };

  // Derived: unique categories from loaded complaints for filter dropdown
  const availableCategories = [...new Set(complaints.map((c) => c.category).filter(Boolean))].sort();

  // Filtered complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchStatus   = !filterStatus   || c.status === filterStatus;
    const matchCategory = !filterCategory || c.category === filterCategory;
    return matchStatus && matchCategory;
  });

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
              Aggregated grievance intake from residents in {constituency}. Filter by status or category.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span className="font-medium">Filter:</span>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {Object.entries(COMPLAINT_STATUSES).map(([key, cfg]) => (
                <option key={key} value={key.toLowerCase()}>{cfg.label}</option>
              ))}
            </select>

            {availableCategories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {(filterStatus || filterCategory) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterCategory(''); }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading constituency complaints…</p>
        ) : filteredComplaints.length === 0 ? (
          complaints.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Grievances Recorded for this Constituency"
              description="As citizens register and lodge issues within your constituency, grievances will appear here for monitoring and departmental escalation."
            />
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No complaints match the selected filters.{' '}
              <button onClick={() => { setFilterStatus(''); setFilterCategory(''); }} className="text-blue-600 hover:underline cursor-pointer">
                Clear filters
              </button>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Tracking ID</th>
                  <th className="p-3">Title / Issue</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reported On</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      {item.tracking_id ? (
                        <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          {item.tracking_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 max-w-[180px]">
                      <span className="line-clamp-2" title={item.title}>{item.title}</span>
                    </td>
                    <td className="p-3 text-slate-500">{item.category || '—'}</td>
                    <td className="p-3">{item.departments?.name || '—'}</td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => { setSelectedComplaint(item); setUpdateModalOpen(true); }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                      >
                        Update
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
              <h2 className="text-base font-bold text-slate-900">Official Bulletins</h2>
              <p className="text-xs text-slate-500">Announcements you've published for {constituency}.</p>
            </div>
            <button
              onClick={() => setAnnounceModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft Announcement</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500">Loading announcements…</p>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Announcements Published Yet"
              description="Publish your first official bulletin to broadcast notices, town hall schedules, and public works updates to your constituents."
              actionLabel="Draft Announcement"
              onAction={() => setAnnounceModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <article key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">{item.title}</h3>
                    {item.is_pinned && (
                      <span title="Pinned" className="flex-shrink-0">
                        <Pin className="w-3 h-3 text-blue-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{item.content}</p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <Megaphone className="w-3 h-3" />
                    <span>{item.category}</span>
                    <span>·</span>
                    <CalendarDays className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
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

      {/* Feature 3 — Update Complaint Status Modal */}
      <UpdateComplaintModal
        isOpen={updateModalOpen}
        complaint={selectedComplaint}
        onClose={() => { setUpdateModalOpen(false); setSelectedComplaint(null); }}
        onUpdated={handleComplaintUpdated}
      />

      {/* Feature 4 — Create Announcement Modal */}
      <CreateAnnouncementModal
        isOpen={announceModalOpen}
        onClose={() => setAnnounceModalOpen(false)}
        onCreated={handleAnnouncementCreated}
        constituency={constituency}
      />
    </div>
  );
}
