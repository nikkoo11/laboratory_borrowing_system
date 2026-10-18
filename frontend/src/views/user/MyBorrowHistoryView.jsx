import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import { ClipboardList, Clock, CheckCircle2, RotateCcw, MapPin, CheckCircle, Package, XCircle, Hourglass } from 'lucide-react';

function fmtDateTime(dt, opts = { dateStyle: 'short', timeStyle: 'short' }) {
  return dt ? new Date(dt).toLocaleString([], opts) : 'N/A';
}

export default function MyBorrowHistoryView({ onNavigateToCatalog }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTx, setSelectedTx] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions/');
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load your borrow history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const pendingRequests  = transactions.filter((t) => t.status === 'pending');
  const activeBorrows    = transactions.filter((t) => t.status === 'approved' && !t.return_datetime);
  const rejectedRequests = transactions.filter((t) => t.status === 'rejected');
  const returnedBorrows  = transactions.filter((t) => t.status === 'returned' || Boolean(t.return_datetime));

  const handleConfirmReturn = async () => {
    if (!selectedTx) return;
    setSubmitting(true);
    try {
      await api.put(`/transactions/${selectedTx.transaction_id}/update/`, {
        item_name: selectedTx.item_name,
        user: selectedTx.user,
        quantity: selectedTx.quantity,
        return_datetime: new Date().toISOString(),
      });
      setSuccessMsg(`"${selectedTx.item_title || 'Apparatus'}" marked as returned!`);
      setIsReturnModalOpen(false);
      fetchTransactions();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to check in item.');
      setIsReturnModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const SectionHeader = ({ icon: Icon, iconColor, label }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className={iconColor} strokeWidth={2} />
      <h3 className="text-xs font-semibold text-slate-900 tracking-wide uppercase">{label}</h3>
    </div>
  );

  const EmptyBox = ({ text }) => (
    <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
      {text}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Active Loans &amp; Custody History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pending borrow requests, apparatus in your custody, and returned items.
          </p>
        </div>
        <button
          onClick={onNavigateToCatalog}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Package size={15} /> <span>Borrow apparatus</span>
        </button>
      </div>

      <Alert type="success" message={successMsg} />
      <Alert type="error" message={errorMsg} />

      {/* ── Pending Requests ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Hourglass} iconColor="text-sky-600" label={`Waiting for Staff Approval (${pendingRequests.length})`} />
        {loading ? (
          <EmptyBox text="Loading requests..." />
        ) : pendingRequests.length === 0 ? (
          <EmptyBox text="No borrow requests waiting for staff approval." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((tx) => (
              <div key={tx.transaction_id} className="p-5 rounded-2xl bg-white border border-sky-100 shadow-2xs">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-[#ea580c] font-semibold">Request #{tx.transaction_id}</span>
                  <StatusBadge status="pending" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{tx.item_title || `Equipment #${tx.item_name}`}</h4>
                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                  <div>Quantity: <strong className="text-slate-900 font-mono">{tx.quantity} unit(s)</strong></div>
                  <div>Requested: <strong className="text-slate-800">{fmtDateTime(tx.borrow_datetime)}</strong></div>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  This request is waiting for a lab custodian or admin to confirm.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Borrows ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Clock} iconColor="text-[#ea580c]" label={`Currently In Your Possession (${activeBorrows.length})`} />
        {loading ? (
          <EmptyBox text="Loading active loans..." />
        ) : activeBorrows.length === 0 ? (
          <EmptyBox text="No active borrowed equipment in your possession." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBorrows.map((tx) => (
              <div key={tx.transaction_id} className="p-5 rounded-2xl bg-white border border-orange-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-[#ea580c] font-semibold">Transaction #{tx.transaction_id}</span>
                    <StatusBadge status="active" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{tx.item_title || `Equipment #${tx.item_name}`}</h4>
                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <div>Quantity: <strong className="text-slate-900 font-mono">{tx.quantity} unit(s)</strong></div>
                    <div>Borrowed On: <strong className="text-slate-800">{fmtDateTime(tx.borrow_datetime)}</strong></div>
                    {tx.item_location && (
                      <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span>Return location: <strong className="text-slate-800">{tx.item_location}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Return to custodian for check-in</span>
                  {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => { setSelectedTx(tx); setIsReturnModalOpen(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
                    >
                      <RotateCcw size={13} /> Check In (Staff)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rejected ─────────────────────────────────────────────────────────── */}
      {rejectedRequests.length > 0 && (
        <div>
          <SectionHeader icon={XCircle} iconColor="text-rose-600" label={`Declined Requests (${rejectedRequests.length})`} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedRequests.map((tx) => (
              <div key={tx.transaction_id} className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-slate-400 font-semibold">Request #{tx.transaction_id}</span>
                  <StatusBadge status="rejected" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{tx.item_title || `Equipment #${tx.item_name}`}</h4>
                <p className="mt-2 text-xs text-slate-500">{tx.quantity} unit(s) &mdash; this request was not approved.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Return History Table ─────────────────────────────────────────────── */}
      <div className="pt-2">
        <SectionHeader icon={CheckCircle} iconColor="text-emerald-600" label={`Returned Equipment History (${returnedBorrows.length})`} />
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
          {returnedBorrows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No return records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="px-6 py-3">Tx ID</th>
                    <th className="px-6 py-3">Apparatus</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3">Date Borrowed</th>
                    <th className="px-6 py-3">Date Returned</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {returnedBorrows.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-400">#{tx.transaction_id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{tx.item_title || `Equipment #${tx.item_name}`}</td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-slate-800">{tx.quantity}</td>
                      <td className="px-6 py-4 text-slate-600">{tx.borrow_datetime ? new Date(tx.borrow_datetime).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{fmtDateTime(tx.return_datetime)}</td>
                      <td className="px-6 py-4 text-right"><StatusBadge status="returned" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM RETURN MODAL */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Check-in Returned Equipment" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirm check-in of <strong className="text-slate-900">{selectedTx?.quantity}x "{selectedTx?.item_title || 'Apparatus'}"</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Checking in...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

