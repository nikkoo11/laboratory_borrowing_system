import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import { Receipt, Search, CheckCircle, Plus, Trash2, User, Package, UserCheck, XCircle } from 'lucide-react';

function getTxStatus(tx) {
  if (tx.status === 'pending') return 'pending';
  if (tx.status === 'rejected') return 'rejected';
  if (tx.status === 'returned' || Boolean(tx.return_datetime)) return 'returned';
  return 'active';
}

function fmtDateTime(dt) {
  if (!dt) return { date: 'N/A', time: '' };
  const d = new Date(dt);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date, time };
}

export default function TransactionsView() {
  const { user: currentUser, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [newTxForm, setNewTxForm] = useState({ item_name: '', user: '', quantity: 1, approver: '' });

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
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const filteredTransactions = transactions.filter((tx) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (tx.item_title || '').toLowerCase().includes(q) ||
      `${tx.user_full_name || ''} ${tx.user_username || ''}`.toLowerCase().includes(q) ||
      String(tx.transaction_id).includes(q);
    const st = getTxStatus(tx);
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    return matchesSearch;
  });

  const pendingCount  = transactions.filter((t) => t.status === 'pending').length;
  const activeCount   = transactions.filter((t) => t.status === 'approved' && !t.return_datetime).length;
  const returnedCount = transactions.filter((t) => t.status === 'returned' || Boolean(t.return_datetime)).length;

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
      await api.post('/transactions/create/', {
        item_name: parseInt(newTxForm.item_name, 10),
        user: parseInt(newTxForm.user, 10),
        quantity: parseInt(newTxForm.quantity, 10),
        approver: newTxForm.approver ? parseInt(newTxForm.approver, 10) : null,
        status: 'approved',
      });
      showSuccess('Loan record registered successfully.');
      setIsCreateOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Error creating transaction.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenApproveModal = (tx) => {
    setSelectedTx(tx);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedTx) return;
    setFormSubmitting(true);
    try {
      await api.post(`/transactions/${selectedTx.transaction_id}/approve/`);
      showSuccess(`Request #${selectedTx.transaction_id} approved.`);
      setIsApproveModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to approve request.');
      setIsApproveModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleReject = async (tx) => {
    setFormSubmitting(true);
    try {
      await api.post(`/transactions/${tx.transaction_id}/reject/`);
      showSuccess(`Request #${tx.transaction_id} rejected.`);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedTx) return;
    setFormSubmitting(true);
    try {
      const myStaff = staffList.find((s) => s.user === currentUser.user_id);
      await api.put(`/transactions/${selectedTx.transaction_id}/update/`, {
        item_name: selectedTx.item_name,
        user: selectedTx.user,
        quantity: selectedTx.quantity,
        approver: myStaff ? myStaff.staff_id : selectedTx.approver,
        return_datetime: new Date().toISOString(),
        status: 'returned',
      });
      showSuccess(`Transaction #${selectedTx.transaction_id} marked as returned.`);
      setIsReturnModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Error marking item as returned.');
      setIsReturnModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedTx) return;
    const id = selectedTx.transaction_id;
    setFormSubmitting(true);
    setIsDeleteOpen(false);
    try {
      await api.delete(`/transactions/${id}/delete/`);
      setTransactions((prev) => prev.filter((t) => t.transaction_id !== id));
      showSuccess('Transaction record deleted.');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete transaction.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filterButtons = [
    { key: 'all',      label: `All (${transactions.length})` },
    { key: 'pending',  label: `Pending (${pendingCount})` },
    { key: 'active',   label: `Active (${activeCount})` },
    { key: 'returned', label: `Returned (${returnedCount})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Borrowing Records &amp; Custody Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Approve requests, verify check-ins, and inspect custody history.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Record loan</span>
        </button>
      </div>

      <Alert type="success" message={successMsg} />
      <Alert type="error" message={errorMsg} />

      {/* Filter bar card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search apparatus, borrower, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 bg-white"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === key ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading transaction logs...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No transaction records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Apparatus</th>
                  <th className="px-6 py-3">Borrower</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3">Borrowed At</th>
                  <th className="px-6 py-3">Returned At</th>
                  <th className="px-6 py-3">Custodian</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTransactions.map((tx) => {
                  const st = getTxStatus(tx);
                  const isPending  = st === 'pending';
                  const isActive   = st === 'active';
                  const isReturned = st === 'returned';
                  const borrowed = fmtDateTime(tx.borrow_datetime);
                  const returned = fmtDateTime(tx.return_datetime);

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-400">#{tx.transaction_id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{tx.item_title || `Item #${tx.item_name}`}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{tx.user_full_name || tx.user_username || `User #${tx.user}`}</div>
                        <div className="text-[11px] text-slate-400">@{tx.user_username}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-slate-800">{tx.quantity}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="block font-medium text-slate-800">{borrowed.date}</span>
                        {borrowed.time && <span className="text-[11px] text-slate-400">{borrowed.time}</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {isReturned ? (
                          <>
                            <span className="block font-medium text-slate-800">{returned.date}</span>
                            {returned.time && <span className="text-[11px] text-slate-400">{returned.time}</span>}
                          </>
                        ) : (
                          <span className="text-amber-600/90 text-xs font-medium">Pending check-in</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tx.approver_name ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <UserCheck size={13} className="text-[#ea580c]" /> {tx.approver_name}
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={st} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleOpenApproveModal(tx)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(tx)}
                                disabled={formSubmitting}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}
                          {isActive && (
                            <button
                              onClick={() => { setSelectedTx(tx); setIsReturnModalOpen(true); }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all flex items-center gap-1"
                            >
                              <CheckCircle size={12} /> Check in
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => { setSelectedTx(tx); setIsDeleteOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
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

      {/* RECORD LOAN MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Record New Equipment Loan">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Apparatus *</label>
            <select
              required
              value={newTxForm.item_name}
              onChange={(e) => setNewTxForm({ ...newTxForm, item_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Borrower *</label>
              <select
                required
                value={newTxForm.user}
                onChange={(e) => setNewTxForm({ ...newTxForm, user: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
              >
                {userList.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.first_name} {u.last_name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={newTxForm.quantity}
                onChange={(e) => setNewTxForm({ ...newTxForm, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Laboratory Custodian / Approver</label>
            <select
              value={newTxForm.approver}
              onChange={(e) => setNewTxForm({ ...newTxForm, approver: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="">No approver assigned</option>
              {staffList.map((st) => (
                <option key={st.staff_id} value={st.staff_id}>
                  {st.full_name || st.username} — {st.position}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Recording...' : 'Register Loan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM APPROVAL MODAL */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Confirm Loan Approval" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Approve borrowing request for <strong className="text-slate-900">{selectedTx?.user_full_name || 'the student'}</strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1.5">
            <div><span className="text-slate-400">Request ID:</span> #{selectedTx?.transaction_id}</div>
            <div><span className="text-slate-400">Apparatus:</span> <strong className="text-slate-800">{selectedTx?.item_title}</strong></div>
            <div><span className="text-slate-400">Requested Quantity:</span> <strong className="text-slate-800 font-mono">{selectedTx?.quantity} unit(s)</strong></div>
            <div><span className="text-slate-400">Approver:</span> {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.username}</div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApprove}
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {formSubmitting ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CHECK-IN RETURN MODAL */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Check-in Returned Equipment" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirm that <strong className="text-slate-900">{selectedTx?.user_full_name || 'the borrower'}</strong> has returned{' '}
            <strong className="text-slate-900">{selectedTx?.quantity}x "{selectedTx?.item_title}"</strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1">
            <div><span className="text-slate-400">Transaction ID:</span> #{selectedTx?.transaction_id}</div>
            <div><span className="text-slate-400">Loan Date:</span> {selectedTx?.borrow_datetime ? new Date(selectedTx.borrow_datetime).toLocaleString() : 'N/A'}</div>
            <div><span className="text-slate-400">Return Date:</span> Recorded as current timestamp</div>
          </div>
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
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Checking in...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Record" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Permanently delete transaction record <strong className="text-slate-900">#{selectedTx?.transaction_id}</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

