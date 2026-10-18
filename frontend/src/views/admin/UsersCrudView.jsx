import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import { Users, Shield, Search, Briefcase, Trash2, Building } from 'lucide-react';

function RoleBadge({ role }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
        Admin
      </span>
    );
  }
  if (role === 'STAFF') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Staff
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      Borrower
    </span>
  );
}

export default function UsersCrudView() {
  const [users, setUsers] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('VIEWER');
  const [staffPosition, setStaffPosition] = useState('');
  const [existingStaffId, setExistingStaffId] = useState(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [uRes, stRes] = await Promise.all([
        api.get('/users/'),
        api.get('/staff/').catch(() => ({ data: [] })),
      ]);
      setUsers(uRes.data || []);
      setStaffRecords(stRes.data || []);
    } catch (err) {
      console.error('Error fetching users/staff:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load user accounts.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(q) ||
      fullName.includes(q) ||
      (u.department && u.department.toLowerCase().includes(q));
    return matchesSearch && (roleFilter ? u.role === roleFilter : true);
  });

  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role || 'VIEWER');
    setErrorMsg('');
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.patch(`/users/${selectedUser.user_id}/role/`, { role: newRole });
      showSuccess(`Role for @${selectedUser.username} updated to ${newRole}!`);
      setIsRoleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update user role.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenStaffModal = (u) => {
    setSelectedUser(u);
    const existing = staffRecords.find((s) => s.user === u.user_id);
    setExistingStaffId(existing?.staff_id ?? null);
    setStaffPosition(existing?.position ?? 'Laboratory Custodian');
    setErrorMsg('');
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !staffPosition.trim()) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      if (existingStaffId) {
        await api.put(`/staff/${existingStaffId}/update/`, { user: selectedUser.user_id, position: staffPosition.trim() });
      } else {
        await api.post('/staff/', { user: selectedUser.user_id, position: staffPosition.trim() });
      }
      showSuccess(`Staff designation updated for @${selectedUser.username}!`);
      setIsStaffModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save staff position.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/users/${selectedUser.user_id}/delete/`);
      showSuccess(`User @${selectedUser.username} deleted.`);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete user. Existing transactions may be linked.');
      setIsDeleteModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const roleButtons = [
    { value: '',       label: 'All Roles' },
    { value: 'ADMIN',  label: 'Admins' },
    { value: 'STAFF',  label: 'Staff' },
    { value: 'VIEWER', label: 'Borrowers' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Users &amp; Laboratory Custodians
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage accounts, permissions, and custodian designations.
        </p>
      </div>

      <Alert type="success" message={successMsg} />
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <span>{errorMsg}</span>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter bar card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 bg-white"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
          {roleButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === value ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No user accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Name / Username</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">System Role</th>
                  <th className="px-6 py-3">Custody Title</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.map((u) => {
                  const staffRec = staffRecords.find((s) => s.user === u.user_id);
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-400">#{u.user_id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{u.first_name} {u.last_name}</div>
                        <div className="text-[11px] text-slate-400">@{u.username}</div>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">{u.user_type || 'student'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building size={13} className="text-slate-400" />
                          <span>{u.department || 'CEA Engineering'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                      <td className="px-6 py-4">
                        {staffRec ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <Briefcase size={13} className="text-[#ea580c]" /> {staffRec.position}
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all flex items-center gap-1"
                            title="Change Role"
                          >
                            <Shield size={12} className="text-[#ea580c]" /> Role
                          </button>
                          {(u.role === 'STAFF' || u.role === 'ADMIN') && (
                            <button
                              onClick={() => handleOpenStaffModal(u)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all flex items-center gap-1"
                              title="Set Position"
                            >
                              <Briefcase size={12} className="text-amber-600" /> Position
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedUser(u); setIsDeleteModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* CHANGE ROLE MODAL */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={`Change Role: @${selectedUser?.username}`} maxWidth="max-w-md">
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Updating the system role for{' '}
            <strong className="text-slate-900">{selectedUser?.first_name} {selectedUser?.last_name}</strong>:
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Role *</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="VIEWER">VIEWER (Regular Student/Faculty Borrower)</option>
              <option value="STAFF">STAFF (Can check-in &amp; approve borrowings)</option>
              <option value="ADMIN">ADMIN (Full system access &amp; user management)</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* STAFF POSITION MODAL */}
      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title={`Staff Position: @${selectedUser?.username}`} maxWidth="max-w-md">
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Position Designation *</label>
            <input
              type="text"
              required
              value={staffPosition}
              onChange={(e) => setStaffPosition(e.target.value)}
              placeholder="e.g. CEA Laboratory Custodian, Technician"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Position'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User Account" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete user <strong className="text-slate-900">@{selectedUser?.username}</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
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

