import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AuthView from './views/AuthView';
import { Home, ChevronRight } from 'lucide-react';

// Admin Views
import AdminDashboard from './views/admin/AdminDashboard';
import InventoryCrudView from './views/admin/InventoryCrudView';
import CategoryCrudView from './views/admin/CategoryCrudView';
import TransactionsView from './views/admin/TransactionsView';
import UsersCrudView from './views/admin/UsersCrudView';

// User Views
import BorrowCatalogView from './views/user/BorrowCatalogView';
import MyBorrowHistoryView from './views/user/MyBorrowHistoryView';
import UserProfileView from './views/user/UserProfileView';

const TAB_TITLES = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  categories: 'Categories',
  transactions: 'Transactions',
  users: 'Users & Staff',
  catalog: 'Borrow Equipment',
  'my-borrows': 'My Borrow History',
  profile: 'My Profile',
};

function MainApp() {
  const { user, loading, isStaff } = useAuth();
  
  // Tab state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [tabOptions, setTabOptions] = useState({});

  // Reset default tab when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'STAFF') {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('catalog');
      }
    }
  }, [user?.user_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c] animate-pulse mb-3">
          <span className="font-bold text-sm">CSU</span>
        </div>
        <p className="text-xs text-slate-500 font-medium">Connecting to CSU CEA Laboratory System...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const handleNavigate = (tab, options = {}) => {
    setTabOptions(options);
    setCurrentTab(tab);
  };

  const currentTitle = TAB_TITLES[currentTab] || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col lg:flex-row antialiased">
      {/* ── Left Sidebar Navigation (User View switch removed for admin) ── */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setTabOptions({});
          setCurrentTab(tab);
        }}
      />

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Breadcrumb Bar matching reference */}
        <header className="px-6 lg:px-10 py-5 flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => setCurrentTab(isStaff ? 'dashboard' : 'catalog')}
            className="hover:text-slate-800 transition-colors flex items-center"
            title="Home"
          >
            <Home size={15} strokeWidth={1.8} />
          </button>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="font-medium text-slate-800">{currentTitle}</span>
        </header>

        {/* View container */}
        <main className="flex-1 px-6 lg:px-10 pb-12 max-w-7xl w-full">
          {/* Admin / Staff Views */}
          {isStaff ? (
            <>
              {currentTab === 'dashboard' && (
                <AdminDashboard onNavigate={handleNavigate} />
              )}
              {currentTab === 'inventory' && (
                <InventoryCrudView
                  key={tabOptions?.openCreate ? 'with-create' : 'standard'}
                  initialOpenCreate={Boolean(tabOptions?.openCreate)}
                />
              )}
              {currentTab === 'categories' && (
                <CategoryCrudView
                  key={tabOptions?.openCreate ? 'with-create' : 'standard'}
                  initialOpenCreate={Boolean(tabOptions?.openCreate)}
                />
              )}
              {currentTab === 'transactions' && <TransactionsView />}
              {currentTab === 'users' && <UsersCrudView />}
            </>
          ) : (
            /* Student & Faculty Borrower Views */
            <>
              {currentTab === 'catalog' && (
                <BorrowCatalogView
                  onNavigateToHistory={() => setCurrentTab('my-borrows')}
                />
              )}
              {currentTab === 'my-borrows' && (
                <MyBorrowHistoryView
                  onNavigateToCatalog={() => setCurrentTab('catalog')}
                />
              )}
              {currentTab === 'profile' && <UserProfileView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

