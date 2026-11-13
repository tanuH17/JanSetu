import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Alert from '../common/Alert';
import { Loader2, Bell, Mail, ShieldAlert, BarChart2 } from 'lucide-react';

export default function NotificationPreferencesForm() {
  const { user, profile, refreshProfile } = useAuth();

  const currentPrefs = profile?.preferences || {
    email_notifications: true,
    status_alerts: true,
    announcements: true,
    survey_invites: true,
  };

  const [emailNotifs, setEmailNotifs] = useState(currentPrefs.email_notifications ?? true);
  const [statusAlerts, setStatusAlerts] = useState(currentPrefs.status_alerts ?? true);
  const [announcements, setAnnouncements] = useState(currentPrefs.announcements ?? true);
  const [surveyInvites, setSurveyInvites] = useState(currentPrefs.survey_invites ?? true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedPrefs = {
        email_notifications: emailNotifs,
        status_alerts: statusAlerts,
        announcements: announcements,
        survey_invites: surveyInvites,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ preferences: updatedPrefs })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      {success && (
        <Alert
          type="success"
          message="Notification preferences saved successfully."
          onClose={() => setSuccess(false)}
        />
      )}

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotifs}
            onChange={(e) => setEmailNotifs(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Notifications
            </span>
            <p className="text-slate-500 mt-0.5">
              Receive email digests for urgent constituency notices and grievance updates.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={statusAlerts}
            onChange={(e) => setStatusAlerts(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-slate-400" /> Complaint Status Alerts
            </span>
            <p className="text-slate-500 mt-0.5">
              Receive in-app alerts whenever your grievances are assigned, triaged, or marked resolved.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={announcements}
            onChange={(e) => setAnnouncements(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Official Bulletins
            </span>
            <p className="text-slate-500 mt-0.5">
              Get notified when your representative broadcasts new community alerts or emergency advisories.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={surveyInvites}
            onChange={(e) => setSurveyInvites(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" /> Poll &amp; Survey Alerts
            </span>
            <p className="text-slate-500 mt-0.5">
              Get notified when new consensus polls are opened for voting in your constituency.
            </p>
          </div>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving Preferences…</span>
          </>
        ) : (
          <span>Save Preferences</span>
        )}
      </button>
    </form>
  );
}
