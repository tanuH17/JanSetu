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
import ComplaintDetailsModal from '../../components/complaints/ComplaintDetailsModal';
import {
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  MapPin,
  Layers,
  Filter,
  Search,
  User,
  ShieldAlert,
} from 'lucide-react';

export default function DepartmentDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailsComplaint, setDetailsComplaint] = useState(null);

  const officialName = profile?.full_name || 'Department Official';
  const designation = profile?.designation || 'Nodal Executive Officer';
  const departmentName = profile?.departments?.name || 'Department Division';
  const departmentCode = profile?.departments?.code || 'DEPT';
  const district = profile?.district || 'Lucknow';

  useEffect(() => {
    let mounted = true;

    async function fetchDepartmentData() {
      if (!isSupabaseConfigured || !user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        if (!profile?.department_id) {
          if (mounted) {
            setComplaints([]);
            setProjects([]);
            setLoading(false);
          }
          return;
        }

        // Query complaints assigned to this department
        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*, departments(name, code)')
          .eq('department_id', profile.department_id)
          .order('created_at', { ascending: false });
        if (complaintsError) throw complaintsError;

        // Query projects assigned to this department
        const { data: projectsData, error: projectsError } = await supabase
          .from('public_projects')
          .select('*, departments(name, code)')
          .eq('department_id', profile.department_id)
          .order('created_at', { ascending: false });
        if (projectsError) throw projectsError;

        if (mounted) {
          if (complaintsData) setComplaints(complaintsData);
          if (projectsData) setProjects(projectsData);
        }
      } catch {
        if (mounted) setDataError('Department operational records could not be loaded. Refresh to retry.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDepartmentData();
    return () => {
      mounted = false;
    };
  }, [user, profile?.department_id]);

  const handleComplaintUpdated = (updatedComplaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
  };

  // Filtered complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchPriority = !filterPriority || c.priority === filterPriority;
    const matchSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tracking_id && c.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  // Metrics calculation
  const totalAssigned = complaints.length;
  const pendingWork = complaints.filter((c) => ['assigned', 'submitted', 'under_review'].includes(c.status)).length;
  const inProgressWork = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedWork = complaints.filter((c) => c.status === 'resolved').length;
  const priorityOverdue = complaints.filter((c) => ['high', 'urgent'].includes(c.priority) && c.status !== 'resolved').length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}

      {/* 1. Department Identity & Jurisdiction Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <RoleBadge role={ROLES.DEPARTMENT} className="bg-white/10 text-white border-white/20" />
              <span className="text-xs text-indigo-200">Department Operational Workdesk</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {officialName}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-200 font-semibold">{designation}</p>

            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              Active operational console for <strong>{departmentName}</strong>. Inspect incoming municipal grievances, record field investigations, update resolution milestones, and attach work completion proof.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-indigo-200">
              <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Division Code: {departmentCode}</span>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-300" />
                <span>Territory: {district} Municipal Division</span>
              </div>
            </div>
          </div>

          <div>
            <Link
              to="/department/profile"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <User className="w-4 h-4" />
              <span>Official Profile &amp; Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Operational Workload Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Queue</p>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalAssigned}</p>
          <span className="text-[10px] text-slate-400">Total tickets routed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Triage</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{pendingWork}</p>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting inspection</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <AlertTriangle className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{inProgressWork}</p>
          <span className="text-[10px] text-sky-600 font-medium">Active field work</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{resolvedWork}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Resolved &amp; documented</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority / Urgent</p>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{priorityOverdue}</p>
          <span className="text-[10px] text-rose-500 font-medium">Requires immediate action</span>
        </div>
      </div>

      {/* 3. Assigned Complaint Queue Section */}
      <section id="assigned-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assigned Department Complaint Queue</h2>
            <p className="text-xs text-slate-500">
              Civic tickets routed to {departmentName} under PostgreSQL Row Level Security.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket or ID…"
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {Object.entries(COMPLAINT_STATUSES).map(([key, cfg]) => (
                <option key={key} value={key.toLowerCase()}>{cfg.label}</option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {(filterStatus || filterPriority || searchQuery) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearchQuery(''); }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading assigned department complaints…</p>
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Complaint Queue is Clear"
            description="There are currently no unresolved civic issues assigned to your department. When citizens lodge complaints categorized under your division or representatives forward them, they will populate here."
          />
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No complaints match your selected filters.{' '}
            <button
              onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearchQuery(''); }}
              className="text-indigo-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Tracking ID</th>
                  <th className="p-3">Grievance Title</th>
                  <th className="p-3">Location / Ward</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Reported On</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        {item.tracking_id || item.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 max-w-[200px]">
                      <button
                        onClick={() => setDetailsComplaint(item)}
                        className="text-left hover:text-indigo-600 line-clamp-1 cursor-pointer font-semibold"
                        title="Click to view details"
                      >
                        {item.title}
                      </button>
                    </td>
                    <td className="p-3 text-slate-500 truncate max-w-[140px]">
                      {item.landmark || item.constituency}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3">
                      <span
                        className={`uppercase font-bold text-[10px] px-2 py-0.5 rounded ${
                          item.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedComplaint(item); setUpdateModalOpen(true); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          Update Status
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

      {/* 4. Resolution History & Public Works */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resolution Audit Trail */}
        <section id="history-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Completed Resolutions</h2>
              <p className="text-xs text-slate-500">Audited log of department corrective actions.</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>

          {complaints.filter((c) => c.status === 'resolved').length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No resolved tickets recorded in this period. As field teams mark complaints resolved with remarks and proof, they will be archived here.
            </p>
          ) : (
            <div className="space-y-3">
              {complaints
                .filter((c) => c.status === 'resolved')
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setDetailsComplaint(item)}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{item.title}</span>
                      <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {item.tracking_id || item.id.slice(0, 8)}
                      </span>
                    </div>
                    {item.resolution_notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        "{item.resolution_notes}"
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 pt-1">
                      Resolved: {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : 'Recorded'}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Project Assignments */}
        <section id="projects-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Department Capital Works</h2>
              <p className="text-xs text-slate-500">Public projects assigned to {departmentCode}.</p>
            </div>
            <FolderGit2 className="w-5 h-5 text-slate-400" />
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{p.title}</span>
                    <span className="uppercase text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
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
              title="No Capital Projects Scheduled"
              description="Capital development works assigned to your department will be synchronized here."
            />
          )}
        </section>
      </div>

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
    </div>
  );
}
