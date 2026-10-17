import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { 
  Users, 
  Shield, 
  Search, 
  Briefcase, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Building
} from 'lucide-react';

export default function UsersCrudView() {
  const [users, setUsers] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
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
    try {
      const [uRes, stRes] = await Promise.all([
        api.get('/users/'),
        api.get('/staff/').catch(() => ({ data: [] })),
      ]);
      setUsers(uRes.data || []);
      setStaffRecords(stRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
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
      setSuccessMsg(`Role for @${selectedUser.username} updated to ${newRole}!`);
      setIsRoleModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
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
    if (existing) {
      setExistingStaffId(existing.staff_id);
      setStaffPosition(existing.position);
    } else {
      setExistingStaffId(null);
      setStaffPosition('Laboratory Custodian');
    }
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
        await api.put(`/staff/${existingStaffId}/update/`, {
          user: selectedUser.user_id,
          position: staffPosition.trim(),
        });
      } else {
        await api.post('/staff/', {
          user: selectedUser.user_id,
          position: staffPosition.trim(),
        });
      }
      setSuccessMsg(`Staff designation updated for @${selectedUser.username}!`);
      setIsStaffModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save staff position.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDelete = (u) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/users/${selectedUser.user_id}/delete/`);
      setSuccessMsg(`User @${selectedUser.username} deleted.`);
      setIsDeleteModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete user. Existing transactions may be linked.');
      setIsDeleteModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            Admin
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            Borrower
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="text-orange-500" size={20} />
            Users & Laboratory Custodians
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage student, faculty, and administrative accounts, system privileges, and staff designations.
          </p>
        </div>
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
            placeholder="Search by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleFilter === '' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleFilter === 'ADMIN' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Admins
          </button>
          <button
            onClick={() => setRoleFilter('STAFF')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleFilter === 'STAFF' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => setRoleFilter('VIEWER')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              roleFilter === 'VIEWER' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Borrowers
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#12141c] border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading accounts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <Users size={32} className="mx-auto text-zinc-600 mb-2" />
            No user accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name / Username</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Custody Title</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredUsers.map((u) => {
                  const staffRec = staffRecords.find((s) => s.user === u.user_id);
                  return (
                    <tr key={u.user_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-400 font-medium">
                        #{u.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-[10px] text-zinc-500">@{u.username}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-300">
                        {u.user_type || 'student'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Building size={11} className="text-zinc-500" />
                          <span>{u.department || 'CEA Engineering'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="px-4 py-3">
                        {staffRec ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-orange-400 font-medium">
                            <Briefcase size={11} /> {staffRec.position}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-medium transition-all flex items-center gap-1"
                            title="Change Role"
                          >
                            <Shield size={11} className="text-orange-400" />
                            <span>Role</span>
                          </button>
                          
                          {(u.role === 'STAFF' || u.role === 'ADMIN') && (
                            <button
                              onClick={() => handleOpenStaffModal(u)}
                              className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-medium transition-all flex items-center gap-1"
                              title="Set Position"
                            >
                              <Briefcase size={11} className="text-amber-400" />
                              <span>Position</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDelete(u)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={13} />
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
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={`Change Role: @${selectedUser?.username}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <p className="text-xs text-zinc-300">
            Updating the system role for{' '}
            <strong className="text-white">
              {selectedUser?.first_name} {selectedUser?.last_name}
            </strong>:
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Select Role *
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            >
              <option value="VIEWER">VIEWER (Regular Student/Faculty Borrower)</option>
              <option value="STAFF">STAFF (Can check-in & approve borrowings)</option>
              <option value="ADMIN">ADMIN (Full system access & user management)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* STAFF POSITION MODAL */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={`Staff Position: @${selectedUser?.username}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Position Designation *
            </label>
            <input
              type="text"
              required
              value={staffPosition}
              onChange={(e) => setStaffPosition(e.target.value)}
              placeholder="e.g. CEA Laboratory Custodian, Technician"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Position'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Account"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Are you sure you want to delete user{' '}
            <strong className="text-white">@{selectedUser?.username}</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
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
