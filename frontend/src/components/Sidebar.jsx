import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tags,
  Receipt,
  Users,
  LogOut,
  UserCircle,
  ClipboardList,
  FlaskConical,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin / Staff navigation items (User view toggle removed per request)
  const adminNavItems = [
    { tab: 'dashboard',    Icon: LayoutDashboard, label: 'Dashboard' },
    { tab: 'inventory',    Icon: Package,         label: 'Inventory' },
    { tab: 'categories',   Icon: Tags,            label: 'Categories' },
    { tab: 'transactions', Icon: Receipt,         label: 'Transactions' },
    ...(isAdmin ? [{ tab: 'users', Icon: Users,   label: 'Users & Staff' }] : []),
  ];

  // Borrower / Student navigation items
  const userNavItems = [
    { tab: 'catalog',    Icon: Package,       label: 'Borrow Equipment' },
    { tab: 'my-borrows', Icon: ClipboardList, label: 'My Borrow History' },
    { tab: 'profile',    Icon: UserCircle,    label: 'My Profile' },
  ];

  const navItems = isStaff ? adminNavItems : userNavItems;

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 bg-white border-r border-slate-100 select-none">
      <div>
        {/* Brand header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-orange-600 shadow-xs">
            <FlaskConical size={19} strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight">Laboratory</h1>
            <p className="text-[11px] text-slate-400 font-normal">Inventory management</p>
          </div>
        </div>

        {/* Section label */}
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </span>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1">
          {navItems.map(({ tab, Icon, label }) => {
            const isActive = currentTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50/80 text-orange-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? 'text-orange-600' : 'text-slate-400'}
                  />
                  <span>{label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User & Logout */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {/* User quick badge */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center uppercase shrink-0">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'STAFF' ? 'Staff' : 'Borrower'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span>Log out</span>
        </button>

        <p className="px-3 text-[10px] text-slate-400">
          {isStaff ? 'Administrative workspace' : 'Student & Faculty workspace'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
            <FlaskConical size={18} />
          </div>
          <span className="text-sm font-semibold text-slate-900">Laboratory</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  );
}

