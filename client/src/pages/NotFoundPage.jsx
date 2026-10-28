import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-7xl font-extrabold text-blue-600">404</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Page Not Found</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
          The civic page or resource you are seeking does not exist or may have been relocated.
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to JanSetu Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
