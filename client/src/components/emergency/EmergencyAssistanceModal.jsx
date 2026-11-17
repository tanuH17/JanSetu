import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Zap,
  Droplets,
  HeartPulse,
  Send,
  Loader2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Alert from '../common/Alert';

const EMERGENCY_HELPLINES = [
  { number: '112', title: 'National Emergency Helpline', subtitle: 'Police, Fire, Ambulance & Rescue', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { number: '1090', title: 'Women Powerline', subtitle: '24x7 Safety & Harassment Relief', icon: HeartPulse, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { number: '1070', title: 'State Disaster Relief', subtitle: 'Floods, Earthquakes & Structural Calamities', icon: Flame, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { number: '1912', title: 'Power Disaster Helpline', subtitle: 'Live Cable Breakage & Transformer Hazards', icon: Zap, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { number: '1533', title: 'Municipal Disaster Desk', subtitle: 'Sewer Gas, Manhole Cavities & Inundation', icon: Droplets, color: 'text-sky-600 bg-sky-50 border-sky-200' },
];

const URGENT_HAZARDS = [
  { value: 'Fallen High-Tension Electric Wire', deptCode: 'POWER' },
  { value: 'Open Sewer / Collapsed Manhole Shaft', deptCode: 'WATER' },
  { value: 'Major Water Main Burst / Road Cave-in', deptCode: 'WATER' },
  { value: 'Unstable Hazardous Building / Structural Collapse Risk', deptCode: 'PWD' },
  { value: 'Chemical Spill or Acute Toxic Sewage Overflow', deptCode: 'MUNICIPAL' },
];

export default function EmergencyAssistanceModal({ isOpen, onClose, onHazardReported }) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('helplines'); // 'helplines' | 'report'

  // Report hazard state
  const [hazardCategory, setHazardCategory] = useState(URGENT_HAZARDS[0].value);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportedTicket, setReportedTicket] = useState(null);

  if (!isOpen) return null;

  async function handleReportHazard(e) {
    e.preventDefault();
    setError(null);

    if (!landmark.trim()) {
      setError('Please specify the exact location/landmark of the urgent hazard.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide a brief description (at least 10 characters).');
      return;
    }

    if (!user) {
      setError('Please sign in to lodge an urgent civic hazard report.');
      return;
    }

    setLoading(true);
    try {
      const selectedHazard = URGENT_HAZARDS.find((h) => h.value === hazardCategory);
      let matchedDeptId = null;

      if (isSupabaseConfigured && selectedHazard?.deptCode) {
        try {
          const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('code', selectedHazard.deptCode)
            .maybeSingle();
          if (dept?.id) matchedDeptId = dept.id;
        } catch {
          // Fallback ignored
        }
      }

      const district = profile?.district;
      const constituency = profile?.constituency;
      if (!district || !constituency) {
        throw new Error('Add your district and constituency to your profile before submitting an urgent civic report.');
      }

      const insertPayload = {
        citizen_id: user.id,
        title: `[URGENT HAZARD] ${hazardCategory}`,
        description: `URGENT PUBLIC SAFETY HAZARD REPORTED:\n${description.trim()}`,
        category: 'Disaster & Hazard',
        district,
        constituency,
        landmark: landmark.trim(),
        department_id: matchedDeptId,
        status: 'submitted',
        priority: 'urgent',
      };

      const { data, error: insertError } = await supabase
        .from('complaints')
        .insert([insertPayload])
        .select('*, departments(name, code)')
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('The report was not returned by the database. Refresh and verify before retrying.');
      const record = data;

      setReportedTicket(record);
      if (onHazardReported) onHazardReported(record);
    } catch (err) {
      setError(err.message || 'Failed to submit urgent hazard report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="emergency-title" className="text-base font-bold text-slate-900">
                Civic Emergency &amp; Urgent Hazard Desk
              </h3>
              <p className="text-xs text-slate-500">
                Verified helplines &amp; high-priority civic hazard reporting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statutory Disclaimer Alert */}
        <div className="mt-4 p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Statutory Disclaimer
          </p>
          <p className="text-[11px] text-rose-800 leading-relaxed">
            JanSetu coordinates municipal repairs and is <strong>not</strong> a substitute for police, fire, or acute medical ambulance services. For immediate life-safety emergencies, dial <strong>112</strong> immediately.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('helplines')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'helplines'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emergency Helplines
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'report'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Report Urgent Hazard
          </button>
        </div>

        {/* Tab 1: Helplines */}
        {activeTab === 'helplines' && (
          <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {EMERGENCY_HELPLINES.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.number}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${h.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{h.title}</h4>
                      <p className="text-[10px] text-slate-500">{h.subtitle}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${h.number}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Dial {h.number}</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Report Urgent Hazard */}
        {activeTab === 'report' && (
          <div className="mt-4 space-y-4">
            {reportedTicket ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Urgent Civic Report Submitted</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Reference: <strong className="font-mono text-rose-700">{reportedTicket.tracking_id || reportedTicket.id.slice(0, 8)}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  This report was saved for review in JanSetu. It was not sent to an emergency dispatch service. For immediate danger, call 112.
                </p>
                <button
                  type="button"
                  onClick={() => { setReportedTicket(null); onClose(); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportHazard} className="space-y-3" noValidate>
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Urgent Hazard Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={hazardCategory}
                    onChange={(e) => setHazardCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-rose-300 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    {URGENT_HAZARDS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Exact Location / Street / Landmark <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Pillar 42, Metro Crossing, Hazratganj"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Immediate Danger Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe immediate threat (e.g. sparking wire lying in puddle, traffic blocked)…"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching Alert…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Urgent Alert</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
