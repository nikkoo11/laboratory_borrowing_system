import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import NotificationBell from '../../components/NotificationBell';
import {
  Clock,
  Tags,
  Wrench,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    activeBorrows: 0,
    categoriesCount: 0,
    maintenanceCount: 0,
  });
  const [activeBorrowList, setActiveBorrowList] = useState([]);
  const [filteredBorrows, setFilteredBorrows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [invRes, catRes, transRes] = await Promise.all([
          api.get('/inventory/'),
          api.get('/categories/'),
          api.get('/transactions/'),
        ]);

        const items = invRes.data || [];
        const categories = catRes.data || [];
        const transactions = transRes.data || [];

        // Active borrowings = approved and not returned yet
        const active = transactions.filter(
          (t) => t.status === 'approved' && !t.return_datetime
        );
        const maintenance = items.filter((i) => i.status === 'maintenance').length;

        setStats({
          activeBorrows: active.length,
          categoriesCount: categories.length,
          maintenanceCount: maintenance,
        });

        setActiveBorrowList(active);
        setFilteredBorrows(active);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBorrows(activeBorrowList);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredBorrows(
        activeBorrowList.filter(
          (t) =>
            (t.user_full_name || '').toLowerCase().includes(q) ||
            (t.user_username || '').toLowerCase().includes(q) ||
            (t.item_title || '').toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, activeBorrowList]);

  // Formatter matching screenshot: e.g. "10/18/26" and "2:32 AM"
  const formatDateParts = (dt) => {
    if (!dt) return { date: 'N/A', time: '' };
    const d = new Date(dt);
    const date = d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { date, time };
  };

  // Get borrower initials for circular avatar badge
  const getInitials = (tx) => {
    if (tx.user_full_name) {
      const parts = tx.user_full_name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (tx.user_username) return tx.user_username.slice(0, 2).toUpperCase();
    return 'NF';
  };

  return (
    <div className="space-y-8">
      {/* ── Top Header Section ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage custody logs and apparatus reservations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Notification Bell integration */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <NotificationBell />
          </div>

          <button
            onClick={() => onNavigate('inventory', { openCreate: true })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add apparatus</span>
          </button>
        </div>
      </div>

      {/* ── 3 Overview KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Borrowings */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5.5 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium text-slate-600">Active Borrowings</span>
              <Clock size={16} strokeWidth={1.8} className="text-slate-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {stats.activeBorrows}
              </span>
              <span className="text-xs text-slate-500">in circulation</span>
            </div>
          </div>
          <div className="mt-6 pt-2 flex items-center gap-1 text-xs font-semibold text-[#ea580c] group-hover:text-[#c2410c]">
            <span>Review custody logs</span>
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </div>
        </div>

        {/* Card 2: Classifications */}
        <div
          onClick={() => onNavigate('categories')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5.5 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium text-slate-600">Classifications</span>
              <Tags size={16} strokeWidth={1.8} className="text-slate-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {stats.categoriesCount}
              </span>
              <span className="text-xs text-slate-500">categories</span>
            </div>
          </div>
          <div className="mt-6 pt-2 flex items-center gap-1 text-xs font-semibold text-[#ea580c] group-hover:text-[#c2410c]">
            <span>View classifications</span>
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </div>
        </div>

        {/* Card 3: Maintenance */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5.5 flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium text-slate-600">Maintenance</span>
              <Wrench size={16} strokeWidth={1.8} className="text-slate-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {stats.maintenanceCount}
              </span>
              <span className="text-xs text-slate-500">need attention</span>
            </div>
          </div>
          <div className="mt-6 pt-2 flex items-center gap-1 text-xs font-semibold text-[#ea580c] group-hover:text-[#c2410c]">
            <span>Inspect maintenance</span>
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* ── Active Borrowings Section Header ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Active borrowings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {stats.activeBorrows}
            </span>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition-colors"
          >
            <span>View all transactions</span>
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Keep track of apparatus currently in circulation.
        </p>
      </div>

      {/* ── Active Borrowings Card with Table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by borrower..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 bg-white"
            />
          </div>

          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal size={14} className="text-slate-500" />
            <span>All statuses</span>
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Loading active borrowings...
          </div>
        ) : filteredBorrows.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No active apparatus in circulation right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-3">Borrower</th>
                  <th className="px-6 py-3">Borrowed At</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredBorrows.map((tx) => {
                  const { date, time } = formatDateParts(tx.borrow_datetime);
                  const borrowerName =
                    tx.user_full_name || tx.user_username || `Borrower #${tx.user}`;
                  const initials = getInitials(tx);

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Borrower with circular avatar and name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {borrowerName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {tx.item_title || `Item #${tx.item_name}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Borrowed At formatted */}
                      <td className="px-6 py-4 text-slate-600">
                        <span className="block font-medium text-slate-800">{date}</span>
                        {time && <span className="text-[11px] text-slate-400">{time}</span>}
                      </td>

                      {/* Qty */}
                      <td className="px-6 py-4 text-center font-medium text-slate-800">
                        {tx.quantity}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-right">
                        <StatusBadge status="active" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredBorrows.length} of {activeBorrowList.length}{' '}
            {activeBorrowList.length === 1 ? 'borrowing' : 'borrowings'}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled
              className="p-1 rounded-md text-slate-300 cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 font-semibold flex items-center justify-center text-xs">
              1
            </span>
            <button
              disabled
              className="p-1 rounded-md text-slate-300 cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}