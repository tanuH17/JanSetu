import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, MapPin, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand & Purpose */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                JS
              </div>
              <span className="text-xl font-bold text-white tracking-tight">JanSetu</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart Public Service &amp; Constituency Management Platform. Bridging citizens, elected representatives, and municipal departments with transparent civic accountability.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                V1 Foundation Release
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Platform Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                  Home Overview
                </Link>
              </li>
              <li>
                <a href="/#about" className="text-slate-400 hover:text-white transition-colors">
                  About JanSetu
                </a>
              </li>
              <li>
                <a href="/#features" className="text-slate-400 hover:text-white transition-colors">
                  Core Features
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#user-roles" className="text-slate-400 hover:text-white transition-colors">
                  Role Privileges
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact &amp; Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Access Portals */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Authorized Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/citizen/sign-in" className="text-slate-400 hover:text-white transition-colors">
                  Citizen Sign In
                </Link>
              </li>
              <li>
                <Link to="/citizen/sign-up" className="text-slate-400 hover:text-white transition-colors">
                  Citizen Registration
                </Link>
              </li>
              <li>
                <Link to="/representative/sign-in" className="text-slate-400 hover:text-white transition-colors">
                  Representative Portal
                </Link>
              </li>
              <li>
                <Link to="/department/sign-in" className="text-slate-400 hover:text-white transition-colors">
                  Department Official Access
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-slate-400 hover:text-white transition-colors">
                  Account Recovery
                </Link>
              </li>
            </ul>
          </div>

          {/* Pilot Contact & Disclaimer */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Project Development
            </h4>
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <span>Pilot Deployment: Lucknow, Uttar Pradesh, India</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>support@jansetu.local</span>
            </div>
            <p className="text-[11px] text-slate-400 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 leading-relaxed">
              <strong>Notice:</strong> JanSetu is an independent civic-tech platform developed as a collegiate software engineering initiative. It is not an official government portal nor is it endorsed by state authorities.
            </p>
          </div>
        </div>

        {/* Bottom Legal & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} JanSetu Platform. Developed for public service management.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-200 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-200 transition-colors">
              Terms of Use
            </Link>
            <span className="text-slate-600">|</span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              Built with <Heart className="w-3 h-3 text-rose-500 fill-current" /> for Civic Governance
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
