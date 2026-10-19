<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Boxes, Grid2X2, List, MapPin, PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import api from '../../api/client'
import Modal from '../../components/Modal.vue'
import SuccessModal from '../../components/SuccessModal.vue'

const inventory = ref([]), categories = ref([]), error = ref(''), search = ref('')
const sortBy = ref('name-asc')
const viewMode = ref('list')
const addOpen = ref(false), adding = ref(false)
const form = reactive({ item_name: '', location: '', quantity: 1, category: '' })
const editing = ref(null), editError = ref('')
const deleteTarget = ref(null), deleting = ref(false)
const successMessage = ref('')
const editForm = reactive({ item_name: '', location: '', quantity: 0, category: '', status: 'available' })
const sortOptions = [
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'category-asc', label: 'Category: A to Z' },
  { value: 'location-asc', label: 'Location: A to Z' },
  { value: 'quantity-asc', label: 'Stock: Low to high' },
  { value: 'quantity-desc', label: 'Stock: High to low' },
]
const filteredInventory = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visibleItems = inventory.value.filter((item) =>
    !query || [item.item_name, item.location, item.category_name, item.category?.category_name]
      .some((value) => value?.toLowerCase().includes(query)))

  return [...visibleItems].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-desc':
        return b.item_name.localeCompare(a.item_name, undefined, { sensitivity: 'base', numeric: true })
      case 'category-asc':
        return (a.category_name || a.category?.category_name || '')
          .localeCompare(b.category_name || b.category?.category_name || '', undefined, { sensitivity: 'base', numeric: true })
      case 'location-asc':
        return a.location.localeCompare(b.location, undefined, { sensitivity: 'base', numeric: true })
      case 'quantity-asc':
        return a.quantity - b.quantity
      case 'quantity-desc':
        return b.quantity - a.quantity
      default:
        return a.item_name.localeCompare(b.item_name, undefined, { sensitivity: 'base', numeric: true })
    }
  })
})
async function load() {
  try {
    [inventory.value, categories.value] = (await Promise.all([api.get('/inventory/'), api.get('/categories/')])).map((response) => response.data)
    error.value = ''
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || 'Unable to load inventory and categories. Check the API connection and try again.'
  }
}
async function add() {
  try {
    adding.value = true
    error.value = ''
    await api.post('/inventory/create/', { ...form, quantity: Number(form.quantity) })
    Object.assign(form, { item_name: '', location: '', quantity: 1, category: '' })
    addOpen.value = false
    await load()
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to add equipment.'
  } finally {
    adding.value = false
  }
}
function confirmDelete(item) {
  deleteTarget.value = item
  error.value = ''
}
async function remove() {
  if (!deleteTarget.value || deleting.value) return
  try {
    deleting.value = true
    error.value = ''
    await api.delete(`/inventory/${deleteTarget.value.item_id}/delete/`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Unable to delete equipment.'
  } finally {
    deleting.value = false
  }
}
function openEdit(item) {
  editing.value = item
  editError.value = ''
  Object.assign(editForm, {
    item_name: item.item_name,
    location: item.location,
    quantity: item.quantity,
    category: item.category,
    status: item.status,
  })
}
async function saveEdit() {
  try {
    editError.value = ''
    await api.put(`/inventory/${editing.value.item_id}/update/`, {
      ...editForm,
      quantity: Number(editForm.quantity),
    })
    editing.value = null
    successMessage.value = 'Equipment details were updated successfully.'
    await load()
  } catch (e) {
    const data = e.response?.data
    editError.value = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to update equipment.'
  }
}
onMounted(load)
</script>

<template>
  <section class="inventory-page">
    <header class="inventory-intro">
      <div><span class="page-eyebrow">ASSET MANAGEMENT</span><h2>Equipment inventory</h2><p>Keep laboratory equipment, stock levels, and storage locations organized.</p></div>
      <span class="inventory-total"><Boxes :size="15" /> {{ inventory.length }} registered items</span>
    </header>
    <div class="inventory-summary">
      <article><span class="summary-label">Total equipment</span><strong>{{ inventory.length }}</strong><small>Items in the catalog</small></article>
      <article class="available-summary"><span class="summary-label">Available</span><strong>{{ inventory.filter(item => item.status === 'available').length }}</strong><small>Ready for borrowing</small></article>
      <article class="maintenance-summary"><span class="summary-label">Needs attention</span><strong>{{ inventory.filter(item => item.status !== 'available').length }}</strong><small>Unavailable or in maintenance</small></article>
    </div>
    <div class="panel inventory-panel">
      <div class="panel-heading inventory-heading">
        <h3>Equipment <span class="heading-count">{{ filteredInventory.length }}</span></h3>
        <label class="search-box"><Search :size="16" /><input v-model="search" placeholder="Search equipment"></label>
        <label class="sort-control">
          <span>Sort by</span>
          <select v-model="sortBy" aria-label="Sort equipment">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <div class="view-toggle" role="group" aria-label="Equipment inventory view">
          <button type="button" :class="{ selected: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" aria-label="List view" title="List view" @click="viewMode = 'list'"><List :size="15" /><span>List</span></button>
          <button type="button" :class="{ selected: viewMode === 'grid' }" :aria-pressed="viewMode === 'grid'" aria-label="Grid view" title="Grid view" @click="viewMode = 'grid'"><Grid2X2 :size="15" /><span>Grid</span></button>
        </div>
        <button type="button" class="add-equipment-button" @click="error = ''; addOpen = true"><PackagePlus :size="16" /> Add equipment</button>
      </div>
      <div v-if="viewMode === 'list'" class="table-scroll"><table class="table inventory-table"><colgroup><col class="equipment-column"><col class="category-column"><col class="location-column"><col class="stock-column"><col class="status-column"><col class="actions-column"></colgroup><thead><tr><th>Equipment</th><th>Category</th><th>Location</th><th>Stock</th><th>Status</th><th class="actions-heading">Actions</th></tr></thead><tbody>
        <tr v-for="item in filteredInventory" :key="item.item_id">
          <td><div class="item-name"><span class="item-icon"><Boxes :size="16" /></span><strong>{{ item.item_name }}</strong></div></td>
          <td>{{ item.category_name || item.category?.category_name || '—' }}</td><td>{{ item.location }}</td>
          <td><strong>{{ item.quantity }}</strong> <span class="muted">units</span></td>
          <td><span :class="['stock-status', item.status]"><i></i>{{ item.status }}</span></td>
          <td class="row-actions"><div class="row-action-buttons"><button class="icon-action" :aria-label="`Edit ${item.item_name}`" title="Edit equipment" @click="openEdit(item)"><Pencil :size="15" /></button><button class="icon-action delete-action" :aria-label="`Delete ${item.item_name}`" title="Delete equipment" @click="confirmDelete(item)"><Trash2 :size="15" /></button></div></td>
        </tr>
        <tr v-if="!filteredInventory.length"><td colspan="6" class="empty">{{ search ? 'No equipment matches your search.' : 'No equipment has been added yet.' }}</td></tr>
      </tbody></table></div>
      <div v-else-if="filteredInventory.length" class="inventory-grid">
        <article v-for="item in filteredInventory" :key="item.item_id" class="inventory-card">
          <div class="inventory-card-top">
            <span class="item-icon"><Boxes :size="17" /></span>
            <span :class="['stock-status', item.status]"><i></i>{{ item.status }}</span>
          </div>
          <h4>{{ item.item_name }}</h4>
          <span class="inventory-card-category">{{ item.category_name || item.category?.category_name || 'Uncategorized' }}</span>
          <p class="inventory-card-location"><MapPin :size="13" />{{ item.location || 'Location not specified' }}</p>
          <div class="inventory-card-stock"><span>Stock on hand</span><strong>{{ item.quantity }} <small>{{ item.quantity === 1 ? 'unit' : 'units' }}</small></strong></div>
          <div class="inventory-card-actions">
            <button type="button" :aria-label="`Edit ${item.item_name}`" @click="openEdit(item)"><Pencil :size="14" /> Edit</button>
            <button type="button" class="inventory-card-delete" :aria-label="`Delete ${item.item_name}`" @click="confirmDelete(item)"><Trash2 :size="14" /> Delete</button>
          </div>
        </article>
      </div>
      <div v-else class="inventory-grid-empty">{{ search ? 'No equipment matches your search.' : 'No equipment has been added yet.' }}</div>
    </div>
    <Modal :open="addOpen" title="Add equipment" @close="!adding && (addOpen = false)">
      <form class="add-form" @submit.prevent="add">
        <p class="add-form-intro">Add an item to the laboratory inventory. All fields are required.</p>
        <div class="add-form-grid">
          <label>Equipment name<input v-model.trim="form.item_name" required maxlength="150" placeholder="e.g. Digital multimeter" class="field"></label>
          <label>Storage location<input v-model.trim="form.location" required maxlength="150" placeholder="e.g. Cabinet A1" class="field"></label>
          <label>Category<select v-model="form.category" required class="field"><option value="">Select category</option><option v-for="category in categories" :key="category.category_id" :value="category.category_id">{{ category.category_name }}</option></select></label>
          <label>Quantity<input v-model.number="form.quantity" type="number" min="0" required class="field"></label>
        </div>
        <p v-if="error" class="error add-form-error" role="alert">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" class="secondary" :disabled="adding" @click="addOpen = false">Cancel</button>
          <button class="primary save-equipment-button" :disabled="adding"><Plus v-if="!adding" :size="15" />{{ adding ? 'Saving…' : 'Save equipment' }}</button>
        </div>
      </form>
    </Modal>
    <Modal :open="Boolean(editing)" title="Edit equipment" @close="editing = null">
      <form class="edit-form" @submit.prevent="saveEdit">
        <label>Equipment name<input v-model="editForm.item_name" required maxlength="150" class="field"></label>
        <label>Storage location<input v-model="editForm.location" required maxlength="150" class="field"></label>
        <label>Category<select v-model="editForm.category" required class="field"><option v-for="category in categories" :key="category.category_id" :value="category.category_id">{{ category.category_name }}</option></select></label>
        <label>Quantity<input v-model.number="editForm.quantity" type="number" min="0" required class="field"></label>
        <label>Status<select v-model="editForm.status" required class="field"><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="maintenance">Under maintenance</option></select></label>
        <p v-if="editError" class="error">{{ editError }}</p>
        <div class="modal-actions"><button type="button" class="secondary" @click="editing = null">Cancel</button><button class="primary">Save changes</button></div>
      </form>
    </Modal>
    <Modal :open="Boolean(deleteTarget)" title="Delete equipment?" @close="deleteTarget = null">
      <div class="delete-confirmation">
        <p>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.item_name }}</strong>? This action cannot be undone.
        </p>
        <p class="delete-warning">
          Equipment with borrowing history cannot be deleted. Update its status instead.
        </p>
        <div class="modal-actions">
          <button type="button" class="secondary" :disabled="deleting" @click="deleteTarget = null">Cancel</button>
          <button type="button" class="delete-confirm-button" :disabled="deleting" @click="remove">
            {{ deleting ? 'Deleting…' : 'Delete equipment' }}
          </button>
        </div>
      </div>
    </Modal>
    <SuccessModal
      :open="Boolean(successMessage)"
      :message="successMessage"
      @close="successMessage = ''"
    />
  </section>
</template>

<style scoped>
.inventory-page { display: grid; gap: 17px; }
.inventory-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 3px 2px; }
.inventory-intro > div { display: grid; gap: 5px; }
.page-eyebrow { color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.inventory-intro h2 { margin: 0; color: #202d40; font-size: clamp(22px, 2.8vw, 29px); font-weight: 760; letter-spacing: -.04em; }
.inventory-intro p { margin: 0; color: #778397; font-size: 12px; }
.inventory-total { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #e8edf4; border-radius: 999px; background: white; padding: 9px 12px; color: #667085; font-size: 10px; font-weight: 650; white-space: nowrap; }
.inventory-total svg { color: #c2410c; }
.inventory-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; }
.inventory-summary article { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 3px 10px; border: 1px solid #e8edf4; border-radius: 14px; background: white; padding: 13px 16px; box-shadow: 0 3px 12px rgb(16 24 40 / 2%); }
.summary-label { color: #6e7a8d; font-size: 10px; font-weight: 650; }.inventory-summary strong { grid-column: 2; grid-row: 1 / span 2; color: #263449; font-size: 22px; font-weight: 760; }.inventory-summary small { color: #9aa3b1; font-size: 9px; }
.available-summary strong { color: #07845b; }.maintenance-summary strong { color: #c2410c; }
.inventory-panel { overflow: hidden; padding: 20px; }
.panel-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 17px; }
.panel-heading h3 { flex: 1; margin: 0; color: #273449; font-size: 15px; font-weight: 700; }
.field { width: 100%; }
.add-equipment-button { display: inline-flex; min-height: 40px; flex: 0 0 auto; align-items: center; justify-content: center; gap: 8px; border: 1px solid #c2410c; border-radius: 10px; background: #c2410c; padding: 0 15px; color: white; font-size: 12px; font-weight: 650; transition: background .15s, border-color .15s; }
.add-equipment-button:hover { border-color: #9a3412; background: #9a3412; }
.add-form { display: grid; gap: 18px; }
.add-form-intro { margin: 0; color: #667085; font-size: 13px; line-height: 1.55; }
.add-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.add-form-grid label { display: grid; min-width: 0; gap: 7px; color: #475467; font-size: 12px; font-weight: 650; }
.add-form-grid .field { min-height: 44px; border: 1px solid #d0d5dd; border-radius: 9px; padding: 0 12px; color: #344054; font-size: 13px; }
.add-form-grid .field:focus { border-color: #c2410c; outline: 2px solid rgb(194 65 12 / 15%); }
.add-form-error { border: 1px solid #ffe4e6; border-radius: 9px; background: #fff1f2; padding: 11px 13px; line-height: 1.5; }
.add-form .modal-actions { justify-content: flex-end; padding-top: 2px; }
.add-form .secondary, .save-equipment-button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 7px; border-radius: 9px; padding: 0 15px; font-size: 12px; font-weight: 650; }
.add-form .secondary { border: 1px solid #d0d5dd; background: white; color: #475467; }
.add-form .secondary:hover:not(:disabled) { background: #f8fafc; }
.save-equipment-button { border: 1px solid #c2410c; background: #c2410c; color: white; }
.save-equipment-button:hover:not(:disabled) { border-color: #9a3412; background: #9a3412; }
.add-form button:disabled { cursor: wait; opacity: .65; }
.error { margin: 0; color: #be123c; font-size: 12px; }
.inventory-heading { margin-bottom: 13px; }
.view-toggle { display: flex; flex: 0 0 auto; gap: 2px; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 3px; }
.view-toggle button { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 7px; background: transparent; padding: 0 8px; color: #778397; font-size: 9px; font-weight: 600; }
.view-toggle button:hover { background: #f8fafc; color: #344054; }.view-toggle button.selected { background: #fff1e9; color: #bd3e05; }
.heading-count { margin-left: 5px; border-radius: 20px; background: #f1f5f9; padding: 3px 7px; color: #667085; font-size: 10px; font-weight: 600; }
.search-box { display: flex; width: min(100%, 230px); min-height: 38px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 11px; color: #98a2b3; }
.search-box input { width: 100%; border: 0; outline: 0; color: #344054; font-size: 12px; }
.sort-control { display: flex; min-height: 38px; align-items: center; gap: 7px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 9px; color: #667085; font-size: 11px; white-space: nowrap; }
.sort-control select { max-width: 145px; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.table-scroll { overflow-x: auto; }
.inventory-table { width: 100%; min-width: 760px; table-layout: fixed; }
.inventory-table th, .inventory-table td { padding-right: 12px; padding-left: 12px; text-align: left; }
.equipment-column { width: 21%; }.category-column { width: 22%; }.location-column { width: 18%; }.stock-column { width: 13%; }.status-column { width: 16%; }.actions-column { width: 10%; }
.inventory-table .actions-heading { text-align: center; }
.item-name { color: #344054; }
.item-name strong { font-size: 12px; font-weight: 650; }
.item-icon { display: none; }
.inventory-table .row-actions { white-space: nowrap; }
.row-action-buttons { display: flex; align-items: center; justify-content: center; gap: 4px; }
.muted { color: #98a2b3; font-size: 11px; }
.stock-status { display: inline-flex; align-items: center; gap: 6px; border-radius: 20px; background: #f1f5f9; padding: 5px 8px; color: #667085; font-size: 10px; text-transform: capitalize; }
.stock-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.stock-status.available { background: #ecfdf3; color: #027a48; }.stock-status.unavailable { background: #fff1f0; color: #c4320a; }.stock-status.maintenance { background: #fffaeb; color: #b54708; }
.icon-action { display: grid; width: 31px; height: 31px; flex: 0 0 31px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #98a2b3; }.icon-action:hover { background: #fff1f0; color: #dc2626; }
.row-actions .icon-action:first-child:hover { background: #fff1e9; color: #c2410c; }
.empty { padding: 35px 12px !important; color: #8791a2; text-align: center; }
.inventory-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.inventory-card { display: flex; min-width: 0; flex-direction: column; border: 1px solid #e8edf4; border-radius: 14px; background: #fff; padding: 15px; transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }.inventory-card:hover { transform: translateY(-2px); border-color: #f0c8b1; box-shadow: 0 8px 20px rgb(87 54 32 / 6%); }
.inventory-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.item-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 10px; background: #fff1e9; color: #c2410c; }
.inventory-card h4 { overflow: hidden; margin: 13px 0 4px; color: #344054; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.inventory-card-category { overflow: hidden; color: #bd5a2a; font-size: 9px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }.inventory-card-location { display: flex; align-items: center; gap: 5px; overflow: hidden; margin: 8px 0 0; color: #8791a2; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.inventory-card-location svg { flex: 0 0 auto; }
.inventory-card-stock { display: flex; align-items: center; justify-content: space-between; margin-top: 13px; border-top: 1px solid #eef1f5; padding-top: 10px; }.inventory-card-stock span { color: #8791a2; font-size: 9px; }.inventory-card-stock strong { color: #344054; font-size: 12px; }.inventory-card-stock small { color: #98a2b3; font-size: 9px; font-weight: 500; }
.inventory-card-actions { display: flex; gap: 7px; margin-top: 11px; border-top: 1px solid #eef1f5; padding-top: 10px; }.inventory-card-actions button { display: inline-flex; min-height: 30px; align-items: center; gap: 5px; border: 1px solid #e4e9f0; border-radius: 8px; background: white; padding: 0 9px; color: #bd3e05; font-size: 9px; font-weight: 650; }.inventory-card-actions button:hover { border-color: #f0c8b1; background: #fff7f2; }.inventory-card-actions .inventory-card-delete { color: #be123c; }.inventory-card-actions .inventory-card-delete:hover { border-color: #fecdd3; background: #fff1f2; }
.inventory-grid-empty { border: 1px dashed #d9e0e8; border-radius: 12px; padding: 35px 12px; color: #8791a2; font-size: 12px; text-align: center; }
:deep(.inventory-table thead) { background: #f8fafc; }
:deep(.inventory-table th) { padding-top: 13px; padding-bottom: 13px; color: #738096; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
:deep(.inventory-table td) { padding-top: 13px; padding-bottom: 13px; color: #475467; font-size: 11px; }
:deep(.inventory-table tbody tr:hover) { background: #fbfcfe; }
.edit-form { display: grid; gap: 13px; }.edit-form label { display: grid; gap: 5px; color: #667085; font-size: 11px; font-weight: 650; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }.secondary { min-height: 40px; border: 1px solid #e4e9f0; border-radius: 9px; background: white; padding: 0 13px; color: #667085; font-size: 12px; }
.delete-confirmation { display: grid; gap: 12px; color: #475467; font-size: 14px; line-height: 1.6; }
.delete-confirmation p { margin: 0; }
.delete-confirmation strong { color: #172033; }
.delete-warning { border-radius: 8px; background: #fff7ed; padding: 10px 12px; color: #9a3412; font-size: 12px; }
.delete-confirmation .modal-actions { padding-top: 6px; }
.delete-confirmation .secondary:disabled,
.delete-confirm-button:disabled { cursor: wait; opacity: .65; }
.delete-confirm-button { min-height: 40px; border: 1px solid #be123c; border-radius: 9px; background: #be123c; padding: 0 13px; color: white; font-size: 12px; font-weight: 650; }
.delete-confirm-button:hover:not(:disabled) { border-color: #9f1239; background: #9f1239; }
@media (max-width: 760px) { .inventory-heading { align-items: stretch; flex-wrap: wrap; }.inventory-heading h3 { flex-basis: 100%; }.search-box { width: 100%; flex: 1 1 180px; }.sort-control { flex: 1 1 180px; justify-content: space-between; }.sort-control select { max-width: none; }.add-equipment-button { flex: 1 1 180px; } }
@media (max-width: 900px) { .inventory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .inventory-grid { grid-template-columns: 1fr; }.view-toggle { flex: 1 1 auto; }.view-toggle button { flex: 1; } }
@media (max-width: 600px) { .inventory-intro { align-items: flex-start; flex-direction: column; }.inventory-summary { grid-template-columns: 1fr; gap: 8px; }.inventory-summary article { padding: 11px 13px; } }
@media (max-width: 520px) { .inventory-panel { padding: 14px; }.add-form-grid { grid-template-columns: 1fr; gap: 13px; }.add-form .modal-actions { flex-direction: column-reverse; }.add-form .modal-actions button { width: 100%; } }
</style>
