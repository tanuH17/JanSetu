import React, { useState } from 'react';
import { BarChart3, Download, PieChart, TrendingUp, Clock, FolderGit2 } from 'lucide-react';

export default function AnalyticsReportsCard({
  complaints = [],
  projects = [],
  title = 'Constituency Civic Analytics & Export',
  subtitle = 'Database-driven grievance statistics and CSV export reporting',
}) {
  const [exporting, setExporting] = useState(false);

  // Compute metrics
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;
  const inProgressComplaints = complaints.filter((c) => ['assigned', 'in_progress', 'under_review'].includes(c.status)).length;
  const pendingComplaints = complaints.filter((c) => c.status === 'submitted').length;
  const urgentComplaints = complaints.filter((c) => c.priority === 'urgent').length;

  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

  // Category counts
  const categoryCounts = complaints.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Export to CSV
  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = [
        'Tracking ID',
        'Title',
        'Category',
        'Priority',
        'Status',
        'Constituency',
        'District',
        'Landmark',
        'Department',
        'Reported Date',
        'Resolved Date',
        'Resolution Notes',
      ];

      const rows = complaints.map((c) => [
        `"${c.tracking_id || c.id.slice(0, 8)}"`,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        `"${c.category || ''}"`,
        `"${c.priority || ''}"`,
        `"${c.status || ''}"`,
        `"${c.constituency || ''}"`,
        `"${c.district || ''}"`,
        `"${(c.landmark || '').replace(/"/g, '""')}"`,
        `"${c.departments?.name || 'Unassigned'}"`,
        `"${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}"`,
        `"${c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : ''}"`,
        `"${(c.resolution_notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `jansetu_grievance_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            {title}
          </h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting || complaints.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>{exporting ? 'Generating CSV…' : 'Export Grievance CSV'}</span>
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Velocity</p>
          <p className="text-xl font-black text-slate-900 mt-1">{resolutionRate}%</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>{resolvedComplaints} of {totalComplaints} closed</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Active Pipeline</p>
          <p className="text-xl font-black text-sky-600 mt-1">{inProgressComplaints}</p>
          <div className="flex items-center gap-1 text-[10px] text-sky-600 font-medium mt-0.5">
            <Clock className="w-3 h-3" />
            <span>Assigned to department</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Triage</p>
          <p className="text-xl font-black text-amber-600 mt-1">{pendingComplaints}</p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Needs routing</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {projects && projects.length > 0 ? 'Capital Works' : 'Urgent Hazards'}
          </p>
          <p className="text-xl font-black text-rose-600 mt-1">
            {projects && projects.length > 0 ? projects.length : urgentComplaints}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-rose-600 font-medium mt-0.5">
            {projects && projects.length > 0 ? (
              <>
                <FolderGit2 className="w-3 h-3 text-indigo-600" />
                <span className="text-indigo-600">Active public works</span>
              </>
            ) : (
              <span>High-priority tickets</span>
            )}
          </div>
        </div>
      </div>

      {/* Top Issue Categories Breakdown */}
      {topCategories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-slate-400" />
            Top Grievance Categories Across Jurisdiction
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topCategories.map(([cat, count]) => {
              const pct = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
              return (
                <div key={cat} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="truncate max-w-[200px]">{cat}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
