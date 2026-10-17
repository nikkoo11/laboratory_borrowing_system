import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  Receipt, 
  Search, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Package,
  UserCheck
} from 'lucide-react';

export default function TransactionsView() {
  const { user: currentUser, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New Transaction Form State
  const [newTxForm, setNewTxForm] = useState({
    item_name: '',
    user: '',
    quantity: 1,
    approver: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, invRes, uRes, stRes] = await Promise.all([
        api.get('/transactions/'),
        api.get('/inventory/').catch(() => ({ data: [] })),
        api.get('/users/').catch(() => ({ data: [] })),
        api.get('/staff/').catch(() => ({ data: [] })),
      ]);

      setTransactions(txRes.data || []);
      setInventoryList(invRes.data || []);
      setUserList(uRes.data || []);
      setStaffList(stRes.data || []);

      if (invRes.data?.length > 0 && !newTxForm.item_name) {
        setNewTxForm((prev) => ({
          ...prev,
          item_name: invRes.data[0].item_id,
          user: uRes.data?.[0]?.user_id || '',
        }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const itemMatch = (tx.item_title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const userMatch = (
      (tx.user_full_name || '') + ' ' + (tx.user_username || '')
    ).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = itemMatch || userMatch || String(tx.transaction_id).includes(searchTerm);

    const isReturned = Boolean(tx.return_datetime);
    if (statusFilter === 'active') return matchesSearch && !isReturned;
    if (statusFilter === 'returned') return matchesSearch && isReturned;
    return matchesSearch;
  });

  const handleOpenCreate = () => {
    setNewTxForm({
      item_name: inventoryList[0]?.item_id || '',
      user: userList[0]?.user_id || currentUser.user_id,
      quantity: 1,
      approver: staffList[0]?.staff_id || '',
    });
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        item_name: parseInt(newTxForm.item_name, 10),
        user: parseInt(newTxForm.user, 10),
        quantity: parseInt(newTxForm.quantity, 10),
        approver: newTxForm.approver ? parseInt(newTxForm.approver, 10) : null,
      };
      await api.post('/transactions/create/', payload);
      setSuccessMsg('Loan record registered successfully.');
      setIsCreateOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Error creating transaction.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenReturnModal = (tx) => {
    setSelectedTx(tx);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedTx) return;
    setFormSubmitting(true);
    try {
      const myStaffRecord = staffList.find((s) => s.user === currentUser.user_id);
      const approverId = myStaffRecord ? myStaffRecord.staff_id : selectedTx.approver;

      const payload = {
        item_name: selectedTx.item_name,
        user: selectedTx.user,
        quantity: selectedTx.quantity,
        approver: approverId,
        return_datetime: new Date().toISOString(),
      };
      await api.put(`/transactions/${selectedTx.transaction_id}/update/`, payload);
      setSuccessMsg(`Transaction #${selectedTx.transaction_id} marked as returned.`);
      setIsReturnModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error marking item as returned.');
      setIsReturnModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDelete = (tx) => {
    setSelectedTx(tx);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedTx) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/transactions/${selectedTx.transaction_id}/delete/`);
      setSuccessMsg('Transaction record deleted.');
      setIsDeleteOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete transaction.');
      setIsDeleteOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="text-orange-500" size={20} />
            Borrowing Records & Custody Logs
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor active equipment in student/faculty possession, verify returned items, and assign custodians.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Record Loan</span>
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

      {/* Search & Filter Bar */}
      <div className="p-3.5 rounded-xl bg-[#12141c] border border-zinc-800 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search apparatus, borrower, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-orange-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              statusFilter === 'active'
                ? 'bg-amber-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active ({transactions.filter((t) => !t.return_datetime).length})
          </button>
          <button
            onClick={() => setStatusFilter('returned')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              statusFilter === 'returned'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Returned ({transactions.filter((t) => Boolean(t.return_datetime)).length})
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-[#12141c] border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading transaction logs...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <Receipt size={32} className="mx-auto text-zinc-600 mb-2" />
            No transaction records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Apparatus</th>
                  <th className="px-4 py-3">Borrower</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Borrowed At</th>
                  <th className="px-4 py-3">Returned At</th>
                  <th className="px-4 py-3">Custodian</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredTransactions.map((tx) => {
                  const isReturned = Boolean(tx.return_datetime);
                  return (
                    <tr key={tx.transaction_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-400 font-medium">
                        #{tx.transaction_id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {tx.item_title || `Item #${tx.item_name}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-200 font-medium">
                          {tx.user_full_name || tx.user_username || `User #${tx.user}`}
                        </div>
                        <div className="text-[10px] text-zinc-500">@{tx.user_username}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {tx.quantity}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {tx.borrow_datetime
                          ? new Date(tx.borrow_datetime).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {isReturned ? (
                          new Date(tx.return_datetime).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        ) : (
                          <span className="text-amber-400/80 italic text-[11px]">
                            Pending check-in
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {tx.approver_name ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-orange-400">
                            <UserCheck size={11} /> {tx.approver_name}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle size={10} /> Returned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={10} /> Active Loan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isReturned && (
                            <button
                              onClick={() => handleOpenReturnModal(tx)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1"
                              title="Check-in Returned Item"
                            >
                              <CheckCircle size={11} />
                              <span>Check In</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenDelete(tx)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record New Equipment Loan"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Select Apparatus *
            </label>
            <select
              required
              value={newTxForm.item_name}
              onChange={(e) => setNewTxForm({ ...newTxForm, item_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            >
              {inventoryList.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.item_name} ({item.quantity} available, {item.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Borrower (User) *
              </label>
              <select
                required
                value={newTxForm.user}
                onChange={(e) => setNewTxForm({ ...newTxForm, user: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                {userList.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.first_name} {u.last_name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newTxForm.quantity}
                onChange={(e) => setNewTxForm({ ...newTxForm, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Laboratory Custodian / Approver
            </label>
            <select
              value={newTxForm.approver}
              onChange={(e) => setNewTxForm({ ...newTxForm, approver: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            >
              <option value="">No approver assigned</option>
              {staffList.map((st) => (
                <option key={st.staff_id} value={st.staff_id}>
                  {st.full_name || st.username} - {st.position}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Recording...' : 'Register Loan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CHECK-IN RETURN MODAL */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Check-in Returned Equipment"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Confirm that{' '}
            <strong className="text-white">{selectedTx?.user_full_name || 'the borrower'}</strong> has returned{' '}
            <strong className="text-white">
              {selectedTx?.quantity}x "{selectedTx?.item_title}"
            </strong>?
          </p>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs space-y-1">
            <div>
              <span className="text-zinc-500">Transaction ID:</span> #{selectedTx?.transaction_id}
            </div>
            <div>
              <span className="text-zinc-500">Loan Date:</span>{' '}
              {selectedTx?.borrow_datetime ? new Date(selectedTx.borrow_datetime).toLocaleString() : 'N/A'}
            </div>
            <div>
              <span className="text-zinc-500">Return Date:</span> Recorded automatically as current timestamp
            </div>
          </div>
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
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Checking in...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Record"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Permanently delete transaction record <strong className="text-white">#{selectedTx?.transaction_id}</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
