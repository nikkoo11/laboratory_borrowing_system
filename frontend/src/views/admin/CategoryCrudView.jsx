import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import { Tags, Plus, Edit3, Trash2, FolderCheck, Package } from 'lucide-react';

export default function CategoryCrudView({ initialOpenCreate = false }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(initialOpenCreate);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, invRes] = await Promise.all([
        api.get('/categories/'),
        api.get('/inventory/').catch(() => ({ data: [] })),
      ]);
      setCategories(catRes.data || []);
      setItems(invRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getItemCount = (catId) => items.filter((i) => String(i.category) === String(catId)).length;
  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.post('/categories/create/', { category_name: categoryName.trim() });
      showSuccess('Category created successfully.');
      setIsCreateOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Error creating category.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setCategoryName(cat.category_name);
    setErrorMsg('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !categoryName.trim()) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.put(`/categories/${selectedCategory.category_id}/update/`, { category_name: categoryName.trim() });
      showSuccess('Category updated.');
      setIsEditOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Error updating category.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteSubmit = async () => {
    if (!selectedCategory) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/categories/${selectedCategory.category_id}/delete/`);
      showSuccess('Category deleted.');
      setIsDeleteOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete category. Apparatus items are still assigned to it.');
      setIsDeleteOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const CategoryNameField = (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
      <input
        type="text"
        required
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        placeholder="e.g. Electrical & Circuitry Tools"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Apparatus Classifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize apparatus categories, glassware, measurement kits, and electronics.
          </p>
        </div>
        <button
          onClick={() => { setCategoryName(''); setErrorMsg(''); setIsCreateOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>New classification</span>
        </button>
      </div>

      <Alert type="success" message={successMsg} />
      <Alert type="error" message={errorMsg} />

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading classifications...</div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">No categories defined yet.</div>
        ) : (
          categories.map((cat) => {
            const count = getItemCount(cat.category_id);
            return (
              <div
                key={cat.category_id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c] mb-3">
                      <FolderCheck size={18} strokeWidth={2} />
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">#{cat.category_id}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{cat.category_name}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Package size={13} className="text-slate-400" />
                    <span>{count} {count === 1 ? 'apparatus' : 'apparatuses'} registered</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Rename"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => { setSelectedCategory(cat); setIsDeleteOpen(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Category" maxWidth="max-w-md">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {CategoryNameField}
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
              {formSubmitting ? 'Creating...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Rename Category" maxWidth="max-w-md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {CategoryNameField}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Update Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Category" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete category <strong className="text-slate-900">"{selectedCategory?.category_name}"</strong>?
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

