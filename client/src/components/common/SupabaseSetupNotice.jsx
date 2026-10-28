import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react';

export default function SupabaseSetupNotice() {
  const { isConfigured } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isConfigured) return null;

  const envTemplate = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold">Supabase Configuration Required:</span>
            <span className="hidden sm:inline text-amber-800">
              Database and Auth will become active once you connect your Supabase project keys in <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">.env.local</code>.
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
          >
            {expanded ? 'Hide Guide' : 'Setup Guide'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-amber-200/80 text-xs text-amber-950 space-y-2">
            <p className="font-medium">Follow these 3 quick steps to enable authentication & database storage:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-amber-900">
              <li>
                Create a free project at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                Go to <strong>Project Settings &gt; API</strong> in your Supabase dashboard and copy the <strong>Project URL</strong> and <strong>anon (public) key</strong>.
              </li>
              <li>
                Create or edit <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">JanSetu/client/.env.local</code> and paste your keys:
              </li>
            </ol>

            <div className="relative mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
              <pre>{envTemplate}</pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="pt-1 text-[11px] text-amber-800">
              4. Open the <strong>SQL Editor</strong> and apply the three migrations in order from <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">JanSetu/supabase/migrations/</code>. The complete order is in the setup guide.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
