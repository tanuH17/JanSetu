import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ROLES } from '../../lib/constants';
import RoleBadge from '../../components/common/RoleBadge';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Alert from '../../components/common/Alert';
import LodgeComplaintModal from '../../components/complaints/LodgeComplaintModal';
import ComplaintDetailsModal from '../../components/complaints/ComplaintDetailsModal';
import SurveyPollWidget from '../../components/surveys/SurveyPollWidget';
import SchemesModal from '../../components/common/SchemesModal';
import EmergencyAssistanceModal from '../../components/emergency/EmergencyAssistanceModal';
import ConstituencyHeatmap from '../../components/analytics/ConstituencyHeatmap';
import {
  FileText,
  PlusCircle,
  FolderGit2,
  Bell,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Building2,
  ThumbsUp,
  BookOpen,
  Users,
  ShieldAlert,
} from 'lucide-react';

export default function CitizenDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [communityComplaints, setCommunityComplaints] = useState([]);
  const [upvotes, setUpvotes] = useState({}); // { complaint_id: { count: number, userVoted: boolean } }
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [lodgeModalOpen, setLodgeModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [schemesModalOpen, setSchemesModalOpen] = useState(false);

  const handleComplaintSubmitted = (newComplaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const citizenName = profile?.full_name || user?.email?.split('@')[0] || 'Citizen';
  const constituency = profile?.constituency || '';
  const district = profile?.district || '';

  // Load database data
  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      if (!isSupabaseConfigured || !user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // 1. Fetch citizen's own complaints
        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*, departments(name, code)')
          .eq('citizen_id', user.id)
          .order('created_at', { ascending: false });
        if (complaintsError) throw complaintsError;

        // 2. Fetch community complaints in their constituency/district
        const { data: commData, error: communityError } = await supabase
          .from('public_complaint_feed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (communityError) throw communityError;

        // 3. Fetch upvote counts for community complaints
        if (commData && commData.length > 0) {
          const ids = commData.map((c) => c.id);
          const upvoteMap = {};
          ids.forEach((id) => {
            upvoteMap[id] = { count: 0, userVoted: false };
          });
          const { data: voteCounts, error: voteError } = await supabase.rpc('get_complaint_upvote_counts', { p_complaint_ids: ids });
          if (voteError) throw voteError;
          (voteCounts || []).forEach((row) => { upvoteMap[row.complaint_id] = { count: Number(row.vote_count), userVoted: row.viewer_has_voted }; });
          if (mounted) {
            setUpvotes(upvoteMap);
            setCommunityComplaints(commData);
          }
        }

        // 4. Fetch public projects in their district
        const { data: projectsData, error: projectsError } = await supabase
          .from('public_projects')
          .select('*, departments(name, code)')
          .order('created_at', { ascending: false })
          .limit(4);
        if (projectsError) throw projectsError;

        // 5. Fetch announcements
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        if (announcementsError) throw announcementsError;

        if (mounted) {
          if (complaintsData) setComplaints(complaintsData);
          if (projectsData) setProjects(projectsData);
          if (announcementsData) setAnnouncements(announcementsData);
        }
      } catch {
        if (mounted) setDataError('Some dashboard records could not be loaded. Refresh to try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, [user, constituency, district]);

  // Toggle upvote on a community complaint
  const handleToggleUpvote = async (complaintId, e) => {
    e.stopPropagation();
    if (!user || !isSupabaseConfigured) return;

    const current = upvotes[complaintId] || { count: 0, userVoted: false };

    if (current.userVoted) {
      // Remove upvote
      const { error } = await supabase
        .from('complaint_upvotes')
        .delete()
        .eq('complaint_id', complaintId)
        .eq('citizen_id', user.id);
      if (error) { setDataError('Your support could not be removed. Please try again.'); return; }
    } else {
      // Add upvote
      const { error } = await supabase
        .from('complaint_upvotes')
        .insert([{ complaint_id: complaintId, citizen_id: user.id }]);
      if (error) { setDataError('Your support could not be saved. Please try again.'); return; }
    }
    setUpvotes((prev) => ({ ...prev, [complaintId]: { count: Math.max(0, current.count + (current.userVoted ? -1 : 1)), userVoted: !current.userVoted } }));
  };

  // Metrics
  const submittedCount = complaints.filter((c) => c.status === 'submitted').length;
  const inProgressCount = complaints.filter((c) => ['assigned', 'in_progress', 'under_review'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}

      {/* 1. Welcome Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center text-white flex-shrink-0 shadow-sm backdrop-blur-xs">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={citizenName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-200" />
            )}
          </div>

          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <RoleBadge role={ROLES.CITIZEN} className="bg-white/10 text-white border-white/20" />
              <span className="text-xs text-blue-200">Resident Citizen Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Namaste, {citizenName}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Welcome to your JanSetu civic workspace. Report localized community concerns, upvote urgent neighborhood issues, participate in polls, and track resolution timelines.
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
      </div>

      {/* 2. Metrics */}
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

      {/* 3. Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setLodgeModalOpen(true)}
          type="button"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Lodge New Grievance
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Report road issues, water drainage, waste collection, or power breakdowns with photos.
            </p>
          </div>
        </button>

        <button
          onClick={() => setEmergencyModalOpen(true)}
          type="button"
          className="p-5 rounded-2xl bg-white border border-rose-200 hover:border-rose-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              Emergency &amp; Hazard Desk
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              112, 1090 helplines and immediate alert dispatch for live electric wires or cave-ins.
            </p>
          </div>
        </button>

        <button
          onClick={() => setSchemesModalOpen(true)}
          type="button"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Welfare Schemes
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Explore national and state welfare schemes (PMAY, Ayushman Bharat, Har Ghar Jal).
            </p>
          </div>
        </button>

        <Link
          to="/citizen/profile"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all text-left flex items-start gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Profile &amp; Settings
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Update photo, registered locality ward, notification alerts, and password security.
            </p>
          </div>
        </Link>
      </div>

      {/* 4. My Complaints Section */}
      <section id="my-complaints" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Registered Complaints</h2>
            <p className="text-xs text-slate-500">
              Personal grievances submitted by your account and secured by PostgreSQL Row Level Security.
            </p>
          </div>

          <button
            onClick={() => setLodgeModalOpen(true)}
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
            onAction={() => setLodgeModalOpen(true)}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 rounded-xl px-2 -mx-2 transition-colors"
                onClick={() => setSelectedComplaint(item)}
                title="Click to view complaint details and timeline"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                    {item.tracking_id && (
                      <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {item.tracking_id}
                      </span>
                    )}
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
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

      {/* 5. Community Complaints & Upvoting Section */}
      <section id="community-grievances" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Community Concerns in {constituency}
            </h2>
            <p className="text-xs text-slate-500">
              Support localized issues raised by fellow residents to highlight collective urgency to representatives.
            </p>
          </div>
        </div>

        {communityComplaints.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No community issues logged in this ward yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communityComplaints.map((item) => {
              const upvoteState = upvotes[item.id] || { count: 0, userVoted: false };

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedComplaint(item)}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{item.description}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{item.landmark || item.constituency}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.tracking_id || item.id.slice(0, 8)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggleUpvote(item.id, e)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        upvoteState.userVoted
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${upvoteState.userVoted ? 'fill-current' : ''}`} />
                      <span>{upvoteState.count} {upvoteState.count === 1 ? 'Support' : 'Supports'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5.5. Constituency Geographical Heatmap */}
      <section id="ward-heatmap-section">
        <ConstituencyHeatmap
          complaints={communityComplaints.length > 0 ? communityComplaints : complaints}
          constituency={constituency}
          privacyPrecision={3}
          onSelectComplaint={(c) => setSelectedComplaint(c)}
        />
      </section>

      {/* 6. Surveys & Polls Section */}
      <section id="surveys-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Public Consensus Polls</h2>
            <p className="text-xs text-slate-500">
              Participate in surveys initiated by your constituency representative.
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
            Citizen Voting
          </span>
        </div>

        <SurveyPollWidget constituency={constituency} />
      </section>

      {/* 7. Public Projects Section */}
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
                title="Public Project Tracking Active"
                description="Infrastructure projects registered for this constituency will appear here with budgets and deadlines."
              />
            </div>
          )}
        </div>
      </section>

      {/* 8. Announcements Section */}
      <section id="announcements" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Official Bulletins</h2>
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
            description="Official notices will appear here when representatives or departments publish bulletins for your ward."
          />
        )}
      </section>

      {/* Modals */}
      <LodgeComplaintModal
        isOpen={lodgeModalOpen}
        onClose={() => setLodgeModalOpen(false)}
        onSuccess={handleComplaintSubmitted}
      />

      <ComplaintDetailsModal
        isOpen={!!selectedComplaint}
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
      />

      <SchemesModal
        isOpen={schemesModalOpen}
        onClose={() => setSchemesModalOpen(false)}
      />

      <EmergencyAssistanceModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        onHazardReported={(ticket) => setComplaints((prev) => [ticket, ...prev])}
      />
    </div>
  );
}
