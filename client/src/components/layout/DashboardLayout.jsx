import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_CONFIG } from '../../lib/constants';
import RoleBadge from '../common/RoleBadge';
import SupabaseSetupNotice from '../common/SupabaseSetupNotice';
import {
  LayoutDashboard,
  FileText,
  FolderGit2,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = profile?.role;
  const config = ROLE_CONFIG[userRole] || ROLE_CONFIG[ROLES.CITIZEN];

  const handleSignOut = async () => {
    const confirmed = window.confirm('Sign out of JanSetu?');
    if (!confirmed) return;
    await signOut();
    navigate('/');
  };

  // Role-specific navigation items
  const getNavLinks = () => {
    switch (userRole) {
      case ROLES.REPRESENTATIVE:
        return [
          { name: 'Constituency Overview', path: '/representative/dashboard', icon: LayoutDashboard },
          { name: 'Complaints Monitoring', path: '#complaints-section', icon: FileText, isSection: true },
          { name: 'Community Concerns', path: '#community-section', icon: CheckCircle2, isSection: true },
          { name: 'Public Projects', path: '#projects-section', icon: FolderGit2, isSection: true },
          { name: 'Official Announcements', path: '#announcements-section', icon: Bell, isSection: true },
        ];
      case ROLES.DEPARTMENT:
        return [
          { name: 'Department Workdesk', path: '/department/dashboard', icon: LayoutDashboard },
          { name: 'Assigned Complaints', path: '#assigned-section', icon: FileText, isSection: true },
          { name: 'Resolution History', path: '#history-section', icon: CheckCircle2, isSection: true },
          { name: 'Project Assignments', path: '#projects-section', icon: FolderGit2, isSection: true },
        ];
      case ROLES.CITIZEN:
      default:
        return [
          { name: 'My Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
          { name: 'My Complaints', path: '#my-complaints', icon: FileText, isSection: true },
          { name: 'Public Projects', path: '#public-projects', icon: FolderGit2, isSection: true },
          { name: 'Announcements', path: '#announcements', icon: Bell, isSection: true },
          { name: 'Profile & Settings', path: '/citizen/profile', icon: User },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <SupabaseSetupNotice />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
          {/* Brand header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                JS
              </div>
              <span className="font-bold text-slate-900 tracking-tight">JanSetu</span>
            </Link>
            {config && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                {config.name.split(' ')[0]}
              </span>
            )}
          </div>

          {/* User profile capsule in sidebar */}
          <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {(profile?.full_name || user?.email)?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {profile?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <RoleBadge role={userRole} className="text-[10px]" />
              <span className="text-[10px] text-slate-400">
                {profile?.district || 'Lucknow'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (item.isSection) {
                return (
                  <a
                    key={item.name}
                    href={item.path}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-slate-200 space-y-1">
            <Link
              to="/"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>JanSetu Public Portal</span>
            </Link>
            <button
              onClick={handleSignOut}
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    JS
                  </div>
                  <span className="font-bold text-slate-900">JanSetu</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-900">{profile?.full_name || user?.email}</p>
                <RoleBadge role={userRole} className="mt-1" />
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-200 space-y-2">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleSignOut();
                  }}
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top header */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                type="button"
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {config?.name || 'Account'} portal
                </h2>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Verified Jurisdiction: {profile?.constituency || profile?.district || 'Lucknow, Uttar Pradesh'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RoleBadge role={userRole} />
              <button
                onClick={handleSignOut}
                type="button"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
