import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  Package, 
  Search, 
  Folder, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ClipboardCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function BorrowCatalogView({ onNavigateToHistory }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Borrow Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Failed to load equipment catalog.');
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
    return matchesSearch && matchesCat;
  });

  const handleOpenBorrowModal = (item) => {
    setSelectedItem(item);
    setBorrowQuantity(1);
    setErrorMsg('');
    setIsBorrowModalOpen(true);
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !user) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        item_name: selectedItem.item_id,
        user: user.user_id,
        quantity: parseInt(borrowQuantity, 10),
      };
      await api.post('/transactions/create/', payload);
      setSuccessMsg(`Successfully borrowed ${borrowQuantity}x "${selectedItem.item_name}"!`);
      setIsBorrowModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        'Failed to submit borrowing request.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CSU CEA Minimalist Header Banner */}
      <div className="p-5 rounded-2xl bg-[#12141c] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-orange-600 to-amber-500 shadow-md shadow-orange-500/10">
            <img
              src="/logo.png"
              alt="CSU CEA"
              className="w-full h-full object-cover rounded-full bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                COEA Laboratory Equipment
              </span>
              <span className="text-xs text-zinc-400 hidden md:inline">
                College of Engineering & Architecture
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Laboratory Apparatus Catalog
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select available tools, check cabinet locations, and request equipment loans.
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToHistory}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <ClipboardCheck size={15} className="text-orange-400" />
          <span>My Loans & History</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-emerald-400 underline font-semibold hover:text-emerald-300 text-xs"
          >
            View in My History &rarr;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="p-3.5 rounded-xl bg-[#12141c] border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search apparatus by name or storage shelf..."
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
            <option value="">All Classifications ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading laboratory catalog...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500">
            <Package size={32} className="mx-auto text-zinc-600 mb-2" />
            No apparatus found matching your search.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isAvailable = item.status === 'available' && item.quantity > 0;
            return (
              <div
                key={item.item_id}
                className="p-4 rounded-xl bg-[#12141c] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      <Folder size={10} className="text-orange-400" />
                      {item.category_name || `Category #${item.category}`}
                    </span>
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={10} /> In Stock
                      </span>
                    ) : item.status === 'maintenance' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle size={10} /> Maintenance
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <XCircle size={10} /> Unavailable
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    {item.item_name}
                  </h3>

                  <div className="mt-2.5 space-y-1 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1">
                      <MapPin size={11} className="text-zinc-500" />
                      <span>Shelf: <strong className="text-zinc-300">{item.location || 'CEA Lab'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package size={11} className="text-zinc-500" />
                      <span>Available stock: <strong className={item.quantity > 0 ? 'text-zinc-200' : 'text-rose-400'}>{item.quantity} units</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleOpenBorrowModal(item)}
                    disabled={!isAvailable}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isAvailable
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm shadow-orange-600/30'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                    }`}
                  >
                    <span>{isAvailable ? 'Borrow Apparatus' : 'Currently Unavailable'}</span>
                    {isAvailable && <ArrowRight size={13} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BORROW MODAL */}
      <Modal
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        title={`Borrow: ${selectedItem?.item_name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBorrowSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1 text-zinc-300">
            <div>
              <span className="text-zinc-500">Borrower:</span> {user?.first_name} {user?.last_name} (@{user?.username})
            </div>
            <div>
              <span className="text-zinc-500">Department:</span> {user?.department || 'CEA Student'}
            </div>
            <div>
              <span className="text-zinc-500">Storage Shelf:</span> {selectedItem?.location}
            </div>
            <div>
              <span className="text-zinc-500">Available:</span> {selectedItem?.quantity} units in stock
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Quantity to Borrow *
            </label>
            <input
              type="number"
              min="1"
              max={selectedItem?.quantity || 1}
              required
              value={borrowQuantity}
              onChange={(e) => setBorrowQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsBorrowModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Submitting...' : 'Confirm Borrow'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
