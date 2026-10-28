import { Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Contact &amp; Inquiries</span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Get in Touch with JanSetu Team</h1>
        <p className="text-sm text-slate-600">
          JanSetu is a college project in development. Contact channels will be published when a project team address is available.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950">
          <Mail className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
          <p>A contact form is not connected in this version, so this page does not collect or send messages.</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-600">
          <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <p>No live deployment territory is configured. JanSetu is not connected to a government service.</p>
        </div>
      </div>
    </div>
  );
}
