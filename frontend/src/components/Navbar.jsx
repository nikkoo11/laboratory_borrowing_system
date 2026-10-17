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
  ClipboardList
} from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab, userMode, setUserMode }) {
  const { user, logout, isAdmin, isStaff } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            Admin
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {user?.user_type === 'faculty' ? 'Faculty' : 'Student'}
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0d12]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* CSU COEA Logo & Brand */}
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
              <p className="text-[11px] text-zinc-400 hidden sm:block font-normal">
                College of Engineering & Architecture
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {/* If user is Admin or Staff AND in Admin mode */}
            {isStaff && !userMode ? (
              <>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'dashboard'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </button>

                <button
                  onClick={() => setCurrentTab('inventory')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'inventory'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Package size={15} />
                  Inventory
                </button>

                <button
                  onClick={() => setCurrentTab('categories')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'categories'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Tags size={15} />
                  Categories
                </button>

                <button
                  onClick={() => setCurrentTab('transactions')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'transactions'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Receipt size={15} />
                  Transactions
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setCurrentTab('users')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      currentTab === 'users'
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Users size={15} />
                    Users & Staff
                  </button>
                )}
              </>
            ) : (
              /* User / Student Mode Navigation */
              <>
                <button
                  onClick={() => setCurrentTab('catalog')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'catalog'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Package size={15} />
                  Borrow Equipment
                </button>

                <button
                  onClick={() => setCurrentTab('my-borrows')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'my-borrows'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <ClipboardList size={15} />
                  My Borrow History
                </button>

                <button
                  onClick={() => setCurrentTab('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentTab === 'profile'
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <UserCircle size={15} />
                  My Profile
                </button>
              </>
            )}
          </nav>

          {/* Right Section: View Switcher, User Profile, Logout */}
          <div className="flex items-center gap-3">
            {/* Admin toggle to preview User View */}
            {isStaff && (
              <button
                onClick={() => {
                  const nextMode = !userMode;
                  setUserMode(nextMode);
                  setCurrentTab(nextMode ? 'catalog' : 'dashboard');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  userMode
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Switch between Admin View and User View"
              >
                {userMode ? (
                  <>
                    <ShieldAlert size={13} className="text-orange-400" />
                    Admin Mode
                  </>
                ) : (
                  <>
                    <Eye size={13} className="text-zinc-400" />
                    User View
                  </>
                )}
              </button>
            )}

            {/* User Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-orange-400 uppercase">
                {user?.first_name ? user.first_name[0] : user?.username?.[0] || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-200">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </span>
                  {getRoleBadge(user?.role)}
                </div>
                <p className="text-[10px] text-zinc-500 truncate max-w-[130px]">
                  {user?.department || 'CSU CEA'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-zinc-800/80">
          {isStaff && !userMode ? (
            <>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'dashboard' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentTab('inventory')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'inventory' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setCurrentTab('categories')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'categories' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setCurrentTab('transactions')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'transactions' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                Transactions
              </button>
              {isAdmin && (
                <button
                  onClick={() => setCurrentTab('users')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                    currentTab === 'users' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                  }`}
                >
                  Users & Staff
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentTab('catalog')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'catalog' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                Borrow Equipment
              </button>
              <button
                onClick={() => setCurrentTab('my-borrows')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'my-borrows' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                My History
              </button>
              <button
                onClick={() => setCurrentTab('profile')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  currentTab === 'profile' ? 'bg-orange-600 text-white' : 'text-zinc-400 bg-zinc-900'
                }`}
              >
                My Profile
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
