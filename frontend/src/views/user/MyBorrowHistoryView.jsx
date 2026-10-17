import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  MapPin, 
  CheckCircle, 
  Package
} from 'lucide-react';

export default function MyBorrowHistoryView({ onNavigateToCatalog }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Return modal state
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const activeBorrows = transactions.filter((t) => !t.return_datetime);
  const returnedBorrows = transactions.filter((t) => Boolean(t.return_datetime));

  const handleOpenReturnModal = (tx) => {
    setSelectedTx(tx);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedTx) return;
    setSubmitting(true);
    try {
      const payload = {
        item_name: selectedTx.item_name,
        user: selectedTx.user,
        quantity: selectedTx.quantity,
        return_datetime: new Date().toISOString(),
      };
      await api.put(`/transactions/${selectedTx.transaction_id}/update/`, payload);
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="text-orange-500" size={20} />
            My Active Loans & Custody History
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Apparatus currently in your custody and past returned items.
          </p>
        </div>
        <button
          onClick={onNavigateToCatalog}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Package size={15} />
          <span>Borrow More Apparatus</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: ACTIVE BORROWS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-amber-400" />
          <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
            Currently In Your Possession ({activeBorrows.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500 bg-[#12141c] rounded-xl border border-zinc-800">
            Loading active loans...
          </div>
        ) : activeBorrows.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 bg-[#12141c] rounded-xl border border-zinc-800">
            No active borrowed equipment in your possession.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeBorrows.map((tx) => (
              <div
                key={tx.transaction_id}
                className="p-4 rounded-xl bg-[#12141c] border border-amber-500/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-orange-400 font-semibold">
                      Transaction #{tx.transaction_id}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock size={10} /> In Custody
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-1.5">
                    {tx.item_title || `Equipment #${tx.item_name}`}
                  </h4>

                  <div className="mt-2.5 space-y-1 text-xs text-zinc-400">
                    <div>
                      Quantity: <strong className="text-zinc-200">{tx.quantity} unit(s)</strong>
                    </div>
                    <div>
                      Borrowed On:{' '}
                      <strong className="text-zinc-200">
                        {tx.borrow_datetime ? new Date(tx.borrow_datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </strong>
                    </div>
                    {tx.item_location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-zinc-500" />
                        <span>Return location: {tx.item_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500">
                    Return to custodian for check-in
                  </span>
                  {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => handleOpenReturnModal(tx)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all"
                    >
                      <RotateCcw size={12} />
                      <span>Check In (Staff)</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: RETURNED HISTORY */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={15} className="text-emerald-400" />
          <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
            Returned Equipment History ({returnedBorrows.length})
          </h3>
        </div>

        <div className="rounded-2xl bg-[#12141c] border border-zinc-800 overflow-hidden">
          {returnedBorrows.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No return records yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Tx ID</th>
                    <th className="px-4 py-3">Apparatus</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Date Borrowed</th>
                    <th className="px-4 py-3">Date Returned</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {returnedBorrows.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        #{tx.transaction_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {tx.item_title || `Equipment #${tx.item_name}`}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-mono">
                        {tx.quantity}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {tx.borrow_datetime ? new Date(tx.borrow_datetime).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-emerald-400">
                        {tx.return_datetime ? new Date(tx.return_datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={10} /> Returned
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM RETURN MODAL */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Check-in Returned Equipment"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Confirm check-in of{' '}
            <strong className="text-white">
              {selectedTx?.quantity}x "{selectedTx?.item_title || 'Apparatus'}"
            </strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {submitting ? 'Checking in...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
