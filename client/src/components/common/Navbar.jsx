import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/constants';
import RoleBadge from './RoleBadge';
import {
  Menu,
  X,
  User,
  Shield,
  Building2,
  LogOut,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    const confirmed = window.confirm('Sign out of JanSetu?');
    if (!confirmed) return;
    await signOut();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!profile?.role) return '/citizen/dashboard';
    return ROLE_CONFIG[profile.role]?.dashboardPath || '/citizen/dashboard';
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
                JS
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  JanSetu
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
                  Citizen &amp; Governance Bridge
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors ${
                  location.pathname === '/' ? 'text-blue-600 font-semibold' : ''
                }`}
              >
                Home
              </Link>
              <a
                href="/#about"
                className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                About
              </a>
              <a
                href="/#features"
                className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                Features
              </a>
              <a
                href="/#how-it-works"
                className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                How It Works
              </a>
              <a
                href="/#user-roles"
                className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                Roles
              </a>
              <Link
                to="/contact"
                className={`px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100/70 transition-colors ${
                  location.pathname === '/contact' ? 'text-blue-600 font-semibold' : ''
                }`}
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Right Action / Auth State */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {(profile?.full_name || user.email)?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                      {profile?.full_name || user.email.split('@')[0]}
                    </span>
                    {profile?.role && (
                      <RoleBadge role={profile.role} showIcon={false} className="text-[10px] py-0 px-1.5" />
                    )}
                  </div>
                </div>

                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                <button
                  onClick={handleSignOut}
                  title="Sign out from JanSetu"
                  type="button"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Sign-in Role Portal Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                    onBlur={() => setTimeout(() => setPortalDropdownOpen(false), 200)}
                    type="button"
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <span>Sign In</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {portalDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Select Sign-In Portal
                      </div>

                      <Link
                        to="/citizen/sign-in"
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <User className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold">Citizen Sign In</div>
                          <div className="text-xs text-slate-500">For resident civic access</div>
                        </div>
                      </Link>

                      <Link
                        to="/representative/sign-in"
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold">Representative Portal</div>
                          <div className="text-xs text-slate-500">For MPs, MLAs &amp; council members</div>
                        </div>
                      </Link>

                      <Link
                        to="/department/sign-in"
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold">Department Official</div>
                          <div className="text-xs text-slate-500">PWD, Water, Sanitation &amp; Power</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  to="/citizen/sign-up"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Citizen Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Home
            </Link>
            <a
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              About
            </a>
            <a
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Features
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              How It Works
            </a>
            <a
              href="/#user-roles"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Roles
            </a>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Contact
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {user ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{profile?.full_name || user.email}</div>
                    {profile?.role && <RoleBadge role={profile.role} className="mt-1" />}
                  </div>
                </div>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600"
                >
                  <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/citizen/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200"
                >
                  Citizen Sign In
                </Link>
                <Link
                  to="/citizen/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Register as Citizen
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    to="/representative/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    Representative Portal
                  </Link>
                  <Link
                    to="/department/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200"
                  >
                    Department Portal
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
