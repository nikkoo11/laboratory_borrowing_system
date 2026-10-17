import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { 
  Tags, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  FolderCheck,
  Package
} from 'lucide-react';

export default function CategoryCrudView({ initialOpenCreate = false }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
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

  useEffect(() => {
    fetchData();
  }, []);

  const getItemCountForCategory = (catId) => {
    return items.filter((item) => String(item.category) === String(catId)).length;
  };

  const handleOpenCreate = () => {
    setCategoryName('');
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.post('/categories/create/', { category_name: categoryName.trim() });
      setSuccessMsg('Category created.');
      setIsCreateOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Error creating category.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

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
      await api.put(`/categories/${selectedCategory.category_id}/update/`, {
        category_name: categoryName.trim(),
      });
      setSuccessMsg('Category updated.');
      setIsEditOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Error updating category.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDelete = (cat) => {
    setSelectedCategory(cat);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedCategory) return;
    setFormSubmitting(true);
    try {
      await api.delete(`/categories/${selectedCategory.category_id}/delete/`);
      setSuccessMsg('Category deleted.');
      setIsDeleteOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot delete category. Apparatus items are still assigned to it.');
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
            <Tags className="text-orange-500" size={20} />
            Apparatus Classifications
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Organize engineering apparatus, laboratory glassware, measurement kits, and electronics.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>New Classification</span>
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading classifications...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500">
            <Tags size={32} className="mx-auto text-zinc-600 mb-2" />
            No categories defined yet.
          </div>
        ) : (
          categories.map((cat) => {
            const count = getItemCountForCategory(cat.category_id);
            return (
              <div
                key={cat.category_id}
                className="p-4 rounded-xl bg-[#12141c] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 mb-2.5">
                      <FolderCheck size={18} />
                    </div>
                    <span className="font-mono text-[11px] text-zinc-500">
                      ID: #{cat.category_id}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    {cat.category_name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Package size={12} className="text-zinc-500" />
                    <span>{count} {count === 1 ? 'apparatus' : 'apparatuses'} registered</span>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                    title="Rename Category"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(cat)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Category"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Electrical & Circuitry Tools"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
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
              {formSubmitting ? 'Creating...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Rename Category"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
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
              {formSubmitting ? 'Saving...' : 'Update Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-300">
            Are you sure you want to delete category{' '}
            <strong className="text-white">"{selectedCategory?.category_name}"</strong>?
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
