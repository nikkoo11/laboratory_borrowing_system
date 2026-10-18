import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import { Package, Plus, Search, Edit3, Trash2, MapPin, Folder } from 'lucide-react';

// ── Shared form fields for both Create and Edit ──────────────────────────────
function InventoryForm({ formData, onChange, categories, onCancel, onSubmit, submitting, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Apparatus Name *</label>
        <input
          type="text"
          required
          value={formData.item_name}
          onChange={(e) => onChange('item_name', e.target.value)}
          placeholder="e.g. Digital Oscilloscope 100MHz"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
          <select
            required
            value={formData.category}
            onChange={(e) => onChange('category', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
          >
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Stock Quantity *</label>
          <input
            type="number"
            min="0"
            required
            value={formData.quantity}
            onChange={(e) => onChange('quantity', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
          <select
            value={formData.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
          >
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Location / Shelf *</label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="e.g. CEA Room 302 - Cabinet A"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { item_name: '', category: '', quantity: 1, status: 'available', location: '' };

export default function InventoryCrudView({ initialOpenCreate = false }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(initialOpenCreate);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        api.get('/inventory/'),
        api.get('/categories/'),
      ]);
      setItems(invRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = item.item_name.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q);
    const matchesCat = selectedCategory ? String(item.category) === String(selectedCategory) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };
  const updateField = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormData({ ...EMPTY_FORM, category: categories[0]?.category_id || '' });
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.post('/inventory/create/', {
        item_name: formData.item_name,
        category: parseInt(formData.category, 10),
        quantity: parseInt(formData.quantity, 10),
        status: formData.status,
        location: formData.location,
      });
      showSuccess('Apparatus registered in inventory successfully.');
      setIsCreateOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Error creating inventory item.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({ item_name: item.item_name, category: item.category, quantity: item.quantity, status: item.status, location: item.location });
    setErrorMsg('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.put(`/inventory/${selectedItem.item_id}/update/`, {
        item_name: formData.item_name,
        category: parseInt(formData.category, 10),
        quantity: parseInt(formData.quantity, 10),
        status: formData.status,
        location: formData.location,
      });
      showSuccess('Apparatus details updated.');
      setIsEditOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Error updating inventory item.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteSubmit = async () => {
    if (!selectedItem) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/inventory/${selectedItem.item_id}/delete/`);
      showSuccess('Apparatus removed from inventory.');
      setIsDeleteOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete item. It may be linked to existing transactions.');
      setIsDeleteOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Apparatus stock, shelf locations, and equipment health conditions.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add apparatus</span>
        </button>
      </div>

      <Alert type="success" message={successMsg} />
      <Alert type="error" message={errorMsg} />

      {/* Filter bar card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search apparatus or shelf location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 bg-white"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-slate-300 bg-white"
        >
          <option value="">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-slate-300 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="maintenance">Under Maintenance</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading apparatus records...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No apparatus found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Apparatus Name</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3 text-center">Stock</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.item_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-400">#{item.item_id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.item_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                        <Folder size={12} className="text-[#ea580c]" />
                        {item.category_name || `Category #${item.category}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-800 font-mono">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{item.location || 'CEA Lab'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Laboratory Apparatus">
        <InventoryForm
          formData={formData}
          onChange={updateField}
          categories={categories}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          submitting={formSubmitting}
          submitLabel="Register Apparatus"
        />
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit: ${selectedItem?.item_name || ''}`}>
        <InventoryForm
          formData={formData}
          onChange={updateField}
          categories={categories}
          onCancel={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          submitting={formSubmitting}
          submitLabel="Update Apparatus"
        />
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Apparatus" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete <strong className="text-slate-900">"{selectedItem?.item_name}"</strong> from laboratory inventory?
          </p>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs">
            Apparatus linked to active borrowing transactions cannot be deleted.
          </div>
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
              {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

