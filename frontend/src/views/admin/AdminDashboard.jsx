import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  Package, 
  Receipt, 
  Tags, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    activeBorrows: 0,
    categoriesCount: 0,
    usersCount: 0,
    maintenanceCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes, transRes, userRes] = await Promise.all([
        api.get('/inventory/'),
        api.get('/categories/'),
        api.get('/transactions/'),
        api.get('/users/').catch(() => ({ data: [] })),
      ]);

      const items = invRes.data || [];
      const categories = catRes.data || [];
      const transactions = transRes.data || [];
      const users = userRes.data || [];

      const activeBorrows = transactions.filter((t) => !t.return_datetime).length;
      const maintenanceCount = items.filter((i) => i.status === 'maintenance').length;
      const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

      setStats({
        totalItems: items.length,
        totalQuantity,
        activeBorrows,
        categoriesCount: categories.length,
        usersCount: users.length,
        maintenanceCount,
      });

      setRecentTransactions(transactions.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Minimalist Header Banner with CSU CEA Emblem */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12141c] border border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-orange-600 to-amber-500 shadow-md shadow-orange-500/10 hidden sm:block">
            <img
              src="/logo.png"
              alt="CSU CEA"
              className="w-full h-full object-cover rounded-full bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                CSU COEA Laboratory Overview
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Ad Optimum Educans
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live equipment inventory, custody logs, and apparatus reservations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('inventory', { openCreate: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all"
          >
            <Plus size={15} />
            <span>Add Equipment</span>
          </button>
          <button
            onClick={() => onNavigate('categories', { openCreate: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-all"
          >
            <Tags size={14} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Minimalist KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Equipment */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="p-4 rounded-xl bg-[#12141c] border border-zinc-800/90 hover:border-orange-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Apparatus</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.totalItems}</span>
            <span className="text-xs text-zinc-500">({stats.totalQuantity} units)</span>
          </div>
          <div className="mt-2 text-[11px] text-orange-400 flex items-center gap-1">
            <span>Manage equipment</span>
            <ArrowUpRight size={11} />
          </div>
        </div>

        {/* Active Loans */}
        <div 
          onClick={() => onNavigate('transactions')}
          className="p-4 rounded-xl bg-[#12141c] border border-zinc-800/90 hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Active Borrowings</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">{stats.activeBorrows}</span>
            <span className="text-xs text-zinc-500">in circulation</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
            <span>Review custody logs</span>
            <ArrowUpRight size={11} />
          </div>
        </div>

        {/* Categories */}
        <div 
          onClick={() => onNavigate('categories')}
          className="p-4 rounded-xl bg-[#12141c] border border-zinc-800/90 hover:border-orange-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Classifications</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Tags size={16} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.categoriesCount}</span>
            <span className="text-xs text-zinc-500">categories</span>
          </div>
          <div className="mt-2 text-[11px] text-orange-400 flex items-center gap-1">
            <span>View classifications</span>
            <ArrowUpRight size={11} />
          </div>
        </div>

        {/* Maintenance */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="p-4 rounded-xl bg-[#12141c] border border-zinc-800/90 hover:border-rose-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Maintenance</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">{stats.maintenanceCount}</span>
            <span className="text-xs text-zinc-500">needs repair</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
            <span>Inspect status</span>
            <ArrowUpRight size={11} />
          </div>
        </div>

      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-2xl bg-[#12141c] border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
              Recent Custody Logs
            </h3>
            <p className="text-[11px] text-zinc-400">Latest apparatus borrowed and returned</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading transactions...</div>
        ) : recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">ID</th>
                  <th className="px-3.5 py-2.5">Apparatus / Item</th>
                  <th className="px-3.5 py-2.5">Borrower</th>
                  <th className="px-3.5 py-2.5">Borrowed At</th>
                  <th className="px-3.5 py-2.5">Qty</th>
                  <th className="px-3.5 py-2.5 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-3.5 py-3 font-mono font-medium text-zinc-400">#{tx.transaction_id}</td>
                    <td className="px-3.5 py-3 font-medium text-white">{tx.item_title || `Item #${tx.item_name}`}</td>
                    <td className="px-3.5 py-3 text-zinc-300">{tx.user_full_name || tx.user_username || `User #${tx.user}`}</td>
                    <td className="px-3.5 py-3 text-zinc-400">
                      {tx.borrow_datetime ? new Date(tx.borrow_datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td className="px-3.5 py-3 text-zinc-300 font-mono">{tx.quantity}</td>
                    <td className="px-3.5 py-3">
                      {tx.return_datetime ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={10} /> Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock size={10} /> Active Loan
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
