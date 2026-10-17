import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MapPin, 
  Folder
} from 'lucide-react';

export default function InventoryCrudView({ initialOpenCreate = false }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(initialOpenCreate);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form data state
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    quantity: 1,
    status: 'available',
    location: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        api.get('/inventory/'),
        api.get('/categories/'),
      ]);
      setItems(invRes.data || []);
      setCategories(catRes.data || []);
      if (catRes.data?.length > 0 && !formData.category) {
        setFormData((prev) => ({ ...prev, category: catRes.data[0].category_id }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory ? String(item.category) === String(selectedCategory) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleOpenCreate = () => {
    setFormData({
      item_name: '',
      category: categories[0]?.category_id || '',
      quantity: 1,
      status: 'available',
      location: '',
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
        item_name: formData.item_name,
        category: parseInt(formData.category, 10),
        quantity: parseInt(formData.quantity, 10),
        status: formData.status,
        location: formData.location,
      };
      await api.post('/inventory/create/', payload);
      setSuccessMsg('Apparatus registered in inventory successfully.');
      setIsCreateOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Error creating inventory item.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      status: item.status,
      location: item.location,
    });
    setErrorMsg('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        item_name: formData.item_name,
        category: parseInt(formData.category, 10),
        quantity: parseInt(formData.quantity, 10),
        status: formData.status,
        location: formData.location,
      };
      await api.put(`/inventory/${selectedItem.item_id}/update/`, payload);
      setSuccessMsg('Apparatus details updated.');
      setIsEditOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Error updating inventory item.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedItem) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/inventory/${selectedItem.item_id}/delete/`);
      setSuccessMsg('Apparatus removed from inventory.');
      setIsDeleteOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete item. It may be linked to existing transactions.');
      setIsDeleteOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={11} /> Available
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={11} /> Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <XCircle size={11} /> Unavailable
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
            <Package className="text-orange-500" size={20} />
            Laboratory Apparatus & Inventory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full inventory control: apparatus registration, stock updates, shelf locations, and equipment health.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Apparatus</span>
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
      <div className="p-3.5 rounded-xl bg-[#12141c] border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search apparatus or shelf location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-[#12141c] border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading apparatus records...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <Package size={32} className="mx-auto text-zinc-600 mb-2" />
            No apparatus found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Apparatus Name</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Stock Units</th>
                  <th className="px-4 py-3">Storage Location</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredItems.map((item) => (
                  <tr key={item.item_id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-zinc-400 font-medium">
                      #{item.item_id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <Folder size={11} className="text-orange-400" />
                        {item.category_name || `Category #${item.category}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className={item.quantity > 0 ? 'text-zinc-200' : 'text-rose-400'}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-zinc-500" />
                        <span>{item.location || 'CEA Lab'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title="Edit Apparatus"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Apparatus"
                        >
                          <Trash2 size={14} />
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
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Laboratory Apparatus"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Apparatus Name *
            </label>
            <input
              type="text"
              required
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="e.g. Digital Oscilloscope 100MHz"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Location / Shelf *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. CEA Room 302 - Cabinet A"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
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
              {formSubmitting ? 'Saving...' : 'Register Apparatus'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Apparatus: ${selectedItem?.item_name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Apparatus Name *
            </label>
            <input
              type="text"
              required
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
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
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Location / Shelf *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Update Apparatus'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remove Apparatus"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Are you sure you want to delete{' '}
            <strong className="text-white">"{selectedItem?.item_name}"</strong> from laboratory inventory?
          </p>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
            Integrity check: Items linked to existing loans cannot be deleted.
          </div>
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
              {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
