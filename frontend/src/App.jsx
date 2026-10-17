import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthView from './views/AuthView';

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

function MainApp() {
  const { user, loading, isStaff } = useAuth();
  
  // Tab state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [userMode, setUserMode] = useState(false);
  const [tabOptions, setTabOptions] = useState({});

  // Reset default tab when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'STAFF') {
        setUserMode(false);
        setCurrentTab('dashboard');
      } else {
        setUserMode(true);
        setCurrentTab('catalog');
      }
    }
  }, [user?.user_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-orange-600 to-amber-500 mb-3 animate-pulse">
          <img src="/logo.png" alt="CSU CEA" className="w-full h-full object-cover rounded-full bg-white" />
        </div>
        <p className="text-xs text-zinc-400 font-medium">Connecting to CSU CEA Laboratory System...</p>
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

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-orange-600 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setTabOptions({});
          setCurrentTab(tab);
        }}
        userMode={userMode}
        setUserMode={setUserMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* If user is Staff/Admin and viewing in Admin mode */}
        {isStaff && !userMode ? (
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
          /* User View (Student, Faculty, or Admin previewing User View) */
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

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-3.5 bg-[#0c0d12] text-center text-[11px] text-zinc-500">
        Cagayan State University &bull; College of Engineering & Architecture &bull; Laboratory Borrowing System &copy; {new Date().getFullYear()}
      </footer>
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
