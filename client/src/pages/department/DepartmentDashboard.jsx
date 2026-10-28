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
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Sparkles,
  MapPin,
  Layers,
} from 'lucide-react';

export default function DepartmentDashboard() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalFeature, setActiveModalFeature] = useState('');

  const officialName = profile?.full_name || 'Department Official';
  const designation = profile?.designation || 'Nodal Executive Officer';
  const departmentName = profile?.departments?.name || 'Department not assigned';
  const departmentCode = profile?.departments?.code || 'UNASSIGNED';
  const district = profile?.district || 'Lucknow';

  useEffect(() => {
    let mounted = true;

    async function fetchDepartmentData() {
      if (!isSupabaseConfigured || !user) {
        return;
      }

      try {
        // Query complaints assigned to this department
        if (!profile?.department_id) {
          if (mounted) {
            setComplaints([]);
            setProjects([]);
          }
          return;
        }

        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*, departments(name, code)')
          .eq('department_id', profile.department_id)
          .order('created_at', { ascending: false });
        if (complaintsError) throw complaintsError;

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
        if (mounted) setDataError('Assigned information could not be loaded. Refresh the page to try again.');
      }
    }

    fetchDepartmentData();
    return () => {
      mounted = false;
    };
  }, [user, profile?.department_id]);

  const openPhaseNotice = (featureName) => {
    setActiveModalFeature(featureName);
    setModalOpen(true);
  };

  // Metrics calculation
  const totalAssigned = complaints.length;
  const pendingWork = complaints.filter((c) => ['assigned', 'submitted', 'under_review'].includes(c.status)).length;
  const inProgressWork = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedWork = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-8">
      {dataError && <Alert type="error" message={dataError} />}
      {/* 1. DEPARTMENT IDENTITY & JURISDICTION HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <RoleBadge role={ROLES.DEPARTMENT} className="bg-white/10 text-white border-white/20" />
            <span className="text-xs text-indigo-200">Department Operational Workdesk</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {officialName}
          </h1>

          <p className="text-xs sm:text-sm text-indigo-200 font-semibold">{designation}</p>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            Dashboard foundation for <strong>{departmentName}</strong>. Complaint assignments, resolution tools, and project updates are planned for a later phase.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-indigo-200">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Division: {departmentCode}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>Territory: {district} Municipal Division</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL WORKLOAD METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
      </div>

      {/* 3. ASSIGNED COMPLAINT QUEUE SECTION */}
      <section id="assigned-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assigned Department Complaint Queue</h2>
            <p className="text-xs text-slate-500">
              Civic tickets routed to {departmentName} under PostgreSQL Row Level Security.
            </p>
          </div>

          <button
            onClick={() => openPhaseNotice('Batch Status Update')}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Batch Status Update</span>
          </button>
        </div>

        {complaints.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Complaint Queue is Clear"
            description="There are currently no unresolved civic issues assigned to your department. When citizens lodge complaints categorized under your division, they will populate here."
            actionLabel="View All Department Assignments"
            onAction={() => openPhaseNotice('Department Queue Inspector')}
            isFutureModule={true}
            phase="Phase 2 Intake"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Grievance Title</th>
                  <th className="p-3">Complainant</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{item.title}</td>
                    <td className="p-3">{item.profiles?.full_name || 'Citizen'}</td>
                    <td className="p-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3 uppercase font-semibold text-[10px] text-amber-700">
                      {item.priority}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openPhaseNotice(`Update Status: ${item.title}`)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. RESOLUTION & ACTION HISTORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section id="history-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Resolution &amp; Action Notes</h2>
              <p className="text-xs text-slate-500">Official log of corrective actions.</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
          </div>

          <EmptyState
            icon={CheckCircle2}
            title="Resolution Audit Trail"
            description="Whenever an inspector visits a site and completes repairs (e.g. road patching, pipe repair), resolution summaries and closure timestamps will be permanently audited here."
            actionLabel="Document Action Taken"
            onAction={() => openPhaseNotice('Resolution Documenter')}
            isFutureModule={true}
            phase="Phase 2"
          />
        </section>

        {/* Project Assignments */}
        <section id="projects-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Department Public Works</h2>
              <p className="text-xs text-slate-500">Capital projects assigned to {departmentCode}.</p>
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
              title="Department Projects Synchronized"
              description="Project tracking is planned for a later phase. No live project data is configured."
              isFutureModule={true}
              phase="Database Seed"
            />
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
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold">Coming in Next Phase (Phase 2):</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The foundation for <strong>{activeModalFeature}</strong> is prepared in our database schema and security policies. Department officials will be able to update status transitions (e.g. from Under Review &rarr; In Progress &rarr; Resolved) and attach photo proof of work completion.
          </p>
        </div>
      </Modal>
    </div>
  );
}
