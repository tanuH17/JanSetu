import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES, COMPLAINT_STATUSES } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Alert from '../../components/common/Alert';
import UpdateComplaintModal from '../../components/complaints/UpdateComplaintModal';
import CreateAnnouncementModal from '../../components/announcements/CreateAnnouncementModal';
import CreateSurveyModal from '../../components/surveys/CreateSurveyModal';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import SurveyPollWidget from '../../components/surveys/SurveyPollWidget';
import ComplaintDetailsModal from '../../components/complaints/ComplaintDetailsModal';
import ConstituencyHeatmap from '../../components/analytics/ConstituencyHeatmap';
import AnalyticsReportsCard from '../../components/analytics/AnalyticsReportsCard';
import {
  Shield,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  MapPin,
  FolderGit2,
  Bell,
  Plus,
  Filter,
  Megaphone,
  CalendarDays,
  Pin,
  Search,
  ThumbsUp,
  User,
  Building2,
} from 'lucide-react';

export default function RepresentativeDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [upvotes, setUpvotes] = useState({});
  const [dataError, setDataError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailsComplaint, setDetailsComplaint] = useState(null);
  const [announceModalOpen, setAnnounceModalOpen] = useState(false);
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const repName = profile?.full_name || 'Elected Representative';
  const designation = profile?.designation || 'Authorized Representative';
  const constituency = profile?.constituency || 'Lucknow Central';
  const district = profile?.district || 'Lucknow';

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

        // Fetch upvotes for constituency complaints
        if (complaintsData && complaintsData.length > 0) {
          const ids = complaintsData.map((c) => c.id);
          const upvoteMap = {};
          ids.forEach((id) => {
            upvoteMap[id] = 0;
          });
          const { data: voteCounts, error: voteError } = await supabase.rpc('get_complaint_upvote_counts', { p_complaint_ids: ids });
          if (voteError) throw voteError;
          (voteCounts || []).forEach((row) => { upvoteMap[row.complaint_id] = Number(row.vote_count); });
          if (mounted) setUpvotes(upvoteMap);
        }

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
        if (mounted) setDataError('Constituency records could not be loaded. Refresh the page to try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchConstituencyData();
    return () => {
      mounted = false;
    };
  }, [user, constituency]);

  const handleComplaintUpdated = (updatedComplaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
  };

  const handleAnnouncementCreated = (newAnnouncement) => {
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  };

  const availableCategories = [...new Set(complaints.map((c) => c.category).filter(Boolean))].sort();

  // Filtered and searched complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchCategory = !filterCategory || c.category === filterCategory;
    const matchSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tracking_id && c.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  // Top supported community concerns (sorted by upvotes)
  const topSupportedComplaints = [...complaints]
    .filter((c) => (upvotes[c.id] || 0) > 0)
    .sort((a, b) => (upvotes[b.id] || 0) - (upvotes[a.id] || 0))
    .slice(0, 4);

  // Real database metrics calculation
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
  const inProgressCount = complaints.filter((c) => ['assigned', 'in_progress'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;
  const priorityCount = complaints.filter((c) => ['high', 'urgent'].includes(c.priority)).length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}

      {/* 1. Profile & Jurisdiction Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center text-white flex-shrink-0 shadow-sm backdrop-blur-xs">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={repName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-200" />
              )}
            </div>

            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <RoleBadge role={ROLES.REPRESENTATIVE} className="bg-white/10 text-white border-white/20" />
                <span className="text-xs text-blue-200">Legislative Oversight Portal</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {repName}
              </h1>

              <p className="text-xs sm:text-sm text-blue-200 font-medium">{designation}</p>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Official constituency oversight workdesk. Monitor civic grievances, assign departments, publish official bulletins, and poll constituents in {constituency}.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200">
                <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  <span>
                    Authorized Ward: <strong>{constituency}</strong> ({district})
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Administrative RLS Verified</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2">
            <button
              onClick={() => setSurveyModalOpen(true)}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Create Poll</span>
            </button>
            <button
              onClick={() => setAnnounceModalOpen(true)}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Draft Bulletin</span>
            </button>
            <Link
              to="/representative/profile"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>My Profile &amp; Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Grievances</p>
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
          <span className="text-[10px] text-amber-600 font-medium">Under Triage</span>
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
          <span className="text-[10px] text-emerald-600 font-medium">Documented Action</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Urgent / High</p>
            <Shield className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{priorityCount}</p>
          <span className="text-[10px] text-rose-500 font-medium">High Priority</span>
        </div>
      </div>

      {/* 3. Complaint Management Section */}
      <section id="complaints-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Constituency Grievance Oversight</h2>
            <p className="text-xs text-slate-500">
              Review, filter, triage, and route citizen complaints to municipal departments.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints or ID…"
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
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

            {(filterStatus || filterCategory || searchQuery) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterCategory(''); setSearchQuery(''); }}
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
              description="As citizens lodge issues within your constituency, tickets will appear here for monitoring and departmental escalation."
            />
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No complaints match the selected filters.{' '}
              <button onClick={() => { setFilterStatus(''); setFilterCategory(''); setSearchQuery(''); }} className="text-blue-600 hover:underline cursor-pointer">
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
                  <th className="p-3">Title / Grievance</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Assigned Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Support</th>
                  <th className="p-3">Reported On</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        {item.tracking_id || item.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 max-w-[200px]">
                      <button
                        onClick={() => setDetailsComplaint(item)}
                        className="text-left hover:text-blue-600 line-clamp-1 cursor-pointer font-semibold"
                        title="Click to view complaint details"
                      >
                        {item.title}
                      </button>
                    </td>
                    <td className="p-3 text-slate-500">{item.category || '—'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {item.departments?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3">
                      {(upvotes[item.id] || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <ThumbsUp className="w-3 h-3" /> {upvotes[item.id]}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedComplaint(item); setUpdateModalOpen(true); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                        >
                          Review &amp; Route
                        </button>
                        <button
                          onClick={() => setDetailsComplaint(item)}
                          className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3.5. Interactive Constituency Heatmap */}
      <section id="constituency-heatmap-section">
        <ConstituencyHeatmap
          complaints={complaints}
          constituency={constituency}
          onSelectComplaint={(c) => setDetailsComplaint(c)}
        />
      </section>

      {/* 4. Community Concerns & Consensus Surveys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Supported Issues */}
        <section id="community-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> Community Petitions &amp; Upvoted Issues
              </h2>
              <p className="text-xs text-slate-500">Citizen upvotes indicating ward urgency.</p>
            </div>
          </div>

          {topSupportedComplaints.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No citizen upvotes recorded yet. As constituents support urgent grievances, prioritized tickets will populate here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topSupportedComplaints.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setDetailsComplaint(item)}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500">{item.landmark || item.category}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      <ThumbsUp className="w-3 h-3" /> {upvotes[item.id]} Supports
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Public Surveys */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" /> Constituency Feedback Surveys
              </h2>
              <p className="text-xs text-slate-500">Real citizen consensus data in {constituency}.</p>
            </div>
            <button
              onClick={() => setSurveyModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Poll</span>
            </button>
          </div>

          <SurveyPollWidget
            constituency={constituency}
            onOpenCreateModal={() => setSurveyModalOpen(true)}
          />
        </section>
      </div>

      {/* 5. Project Tracking & Official Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Tracking */}
        <section id="projects-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Constituency Public Works</h2>
              <p className="text-xs text-slate-500">Monitored infrastructure projects in {constituency}.</p>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Project</span>
            </button>
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
              description="Development projects registered in this constituency will appear here."
              actionLabel="Register Project"
              onAction={() => setProjectModalOpen(true)}
            />
          )}
        </section>

        {/* Official Announcements */}
        <section id="announcements-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Official Bulletins</h2>
              <p className="text-xs text-slate-500">Announcements published for {constituency}.</p>
            </div>
            <button
              onClick={() => setAnnounceModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft Bulletin</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500">Loading announcements…</p>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Announcements Published Yet"
              description="Publish official bulletins to broadcast town hall schedules, public works alerts, and municipal advisories to constituents."
              actionLabel="Draft Bulletin"
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

      {/* 6. Constituency Civic Analytics & Export */}
      <section id="analytics-section">
        <AnalyticsReportsCard
          complaints={complaints}
          projects={projects}
          title={`Civic Grievance Analytics & Reports — ${constituency}`}
          subtitle="Constituency-wide resolution rates, category distributions, and CSV export."
        />
      </section>

      {/* Modals */}
      <UpdateComplaintModal
        isOpen={updateModalOpen}
        complaint={selectedComplaint}
        onClose={() => { setUpdateModalOpen(false); setSelectedComplaint(null); }}
        onUpdated={handleComplaintUpdated}
      />

      <ComplaintDetailsModal
        isOpen={!!detailsComplaint}
        complaint={detailsComplaint}
        onClose={() => setDetailsComplaint(null)}
      />

      <CreateAnnouncementModal
        isOpen={announceModalOpen}
        onClose={() => setAnnounceModalOpen(false)}
        onCreated={handleAnnouncementCreated}
        constituency={constituency}
      />

      <CreateSurveyModal
        isOpen={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        onCreated={() => {}}
        constituency={constituency}
      />

      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreated={(newP) => setProjects((prev) => [newP, ...prev])}
        constituency={constituency}
        district={district}
      />
    </div>
  );
}
