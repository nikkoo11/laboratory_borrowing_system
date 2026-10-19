import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import NotificationBell from '../../components/NotificationBell';
import { Package, Search, Folder, MapPin, ArrowRight, ClipboardCheck } from 'lucide-react';

export default function BorrowCatalogView({ onNavigateToHistory }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([api.get('/inventory/'), api.get('/categories/')]);
      setItems(invRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load equipment catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = item.item_name.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q);
    const matchesCat = selectedCategory ? String(item.category) === String(selectedCategory) : true;
    return matchesSearch && matchesCat;
  });

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !user) return;
    const qty = parseInt(borrowQuantity, 10);
    if (!qty || qty < 1) {
      setErrorMsg('Borrow quantity must be at least 1.');
      return;
    }
    if (qty > selectedItem.quantity) {
      setErrorMsg(`Requested quantity exceeds available stock (${selectedItem.quantity} unit(s)).`);
      return;
    }
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      await api.post('/transactions/create/', {
        item_name: selectedItem.item_id,
        user: user.user_id,
        quantity: qty,
      });
      setSuccessMsg(`Borrow request for ${qty}x "${selectedItem.item_name}" was sent. Staff will review and approve it.`);
      setIsBorrowModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Failed to submit borrowing request.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Laboratory Apparatus Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse available apparatus, shelf locations, and submit borrow requests.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <NotificationBell />
          </div>
          <button
            onClick={onNavigateToHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <ClipboardCheck size={15} className="text-[#ea580c]" />
            <span>My Loans &amp; History</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <span>{successMsg}</span>
          <button onClick={onNavigateToHistory} className="text-emerald-700 underline font-semibold hover:text-emerald-900 text-xs whitespace-nowrap">
            View in My History &rarr;
          </button>
        </div>
      )}
      <Alert type="error" message={errorMsg} />

      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search apparatus by name or storage shelf..."
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
          <option value="">All Classifications ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading laboratory catalog...</div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">No apparatus found matching your search.</div>
        ) : (
          filteredItems.map((item) => {
            const isAvailable = item.status === 'available' && item.quantity > 0;
            const badgeStatus = isAvailable ? 'instock' : item.status;
            return (
              <div
                key={item.item_id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                      <Folder size={11} className="text-[#ea580c]" />
                      {item.category_name || `Category #${item.category}`}
                    </span>
                    <StatusBadge status={badgeStatus} />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{item.item_name}</h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      <span>Shelf: <strong className="text-slate-800">{item.location || 'CEA Lab'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package size={13} className="text-slate-400" />
                      <span>Available stock: <strong className={item.quantity > 0 ? 'text-slate-800 font-mono' : 'text-rose-600'}>{item.quantity} units</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => { setSelectedItem(item); setBorrowQuantity(1); setErrorMsg(''); setIsBorrowModalOpen(true); }}
                    disabled={!isAvailable}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isAvailable
                        ? 'bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    {isAvailable ? (
                      <><span>Request to Borrow</span><ArrowRight size={13} strokeWidth={2.2} /></>
                    ) : (
                      <span>Currently Unavailable</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        title={`Borrow: ${selectedItem?.item_name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBorrowSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-600">
            <div><span className="text-slate-400">Borrower:</span> {user?.first_name} {user?.last_name} (@{user?.username})</div>
            <div><span className="text-slate-400">Department:</span> {user?.department || 'CEA Student'}</div>
            <div><span className="text-slate-400">Storage Shelf:</span> {selectedItem?.location}</div>
            <div><span className="text-slate-400">Available:</span> {selectedItem?.quantity} units in stock</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Quantity to Borrow *</label>
            <input
              type="number"
              min="1"
              max={selectedItem?.quantity || 1}
              required
              value={borrowQuantity}
              onChange={(e) => setBorrowQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBorrowModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {formSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}