import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tags,
  Receipt,
  Users,
  LogOut,
  UserCircle,
  Eye,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';

// ── Role badge (extracted to avoid duplication with UsersCrudView inline badge) ──
function RoleBadge({ role, userType }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
        Admin
      </span>
    );
  }
  if (role === 'STAFF') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        Staff
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
      {userType === 'faculty' ? 'Faculty' : 'Student'}
    </span>
  );
}

export default function Navbar({ currentTab, setCurrentTab, userMode, setUserMode }) {
  const { user, logout, isAdmin, isStaff } = useAuth();

  // ── Navigation items defined once, rendered in both desktop & mobile ────────
  const adminNavItems = [
    { tab: 'dashboard',    Icon: LayoutDashboard, label: 'Dashboard' },
    { tab: 'inventory',    Icon: Package,         label: 'Inventory' },
    { tab: 'categories',   Icon: Tags,            label: 'Categories' },
    { tab: 'transactions', Icon: Receipt,         label: 'Transactions' },
    ...(isAdmin ? [{ tab: 'users', Icon: Users, label: 'Users & Staff' }] : []),
  ];

  const userNavItems = [
    { tab: 'catalog',    Icon: Package,       label: 'Borrow Equipment' },
    { tab: 'my-borrows', Icon: ClipboardList, label: 'My Borrow History' },
    { tab: 'profile',    Icon: UserCircle,    label: 'My Profile' },
  ];

  const navItems = isStaff && !userMode ? adminNavItems : userNavItems;

  const handleTabChange = (tab) => setCurrentTab(tab);

  const handleViewToggle = () => {
    const next = !userMode;
    setUserMode(next);
    setCurrentTab(next ? 'catalog' : 'dashboard');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0d12]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Main bar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 shadow-sm shadow-orange-500/20">
              <img
                src="/logo.png"
                alt="CSU College of Engineering and Architecture"
                className="w-full h-full object-cover rounded-full bg-white"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  CSU <span className="text-orange-500 font-extrabold">&bull; COEA</span>
                </span>
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Lab System
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                College of Engineering &amp; Architecture
              </p>
            </div>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ tab, Icon, label }) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === tab
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right section: view toggle + user info + logout */}
          <div className="flex items-center gap-3">
            {/* Admin ↔ User view toggle */}
            {isStaff && (
              <button
                onClick={handleViewToggle}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  userMode
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Switch between Admin View and User View"
              >
                {userMode ? (
                  <><ShieldAlert size={13} className="text-orange-400" /> Admin Mode</>
                ) : (
                  <><Eye size={13} /> User View</>
                )}
              </button>
            )}

            {/* User info */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-orange-400 uppercase">
                {user?.first_name?.[0] ?? user?.username?.[0] ?? 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-200">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </span>
                  <RoleBadge role={user?.role} userType={user?.user_type} />
                </div>
                <p className="text-[10px] text-zinc-500 truncate max-w-[130px]">
                  {user?.department || 'CSU CEA'}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* ── Mobile nav strip ──────────────────────────────────────────────── */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-zinc-800/80">
          {navItems.map(({ tab, label }) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                currentTab === tab ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      </div>
    </header>
  );
}
