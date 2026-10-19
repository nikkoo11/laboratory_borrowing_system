<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Boxes, Grid2X2, List, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-vue-next'
import api from '../../api/client'
import Modal from '../../components/Modal.vue'
import SuccessModal from '../../components/SuccessModal.vue'

const categories = ref([]), inventory = ref([]), name = ref(''), error = ref(''), search = ref('')
const addDetails = ref(null)
const sortBy = ref('name-asc')
const viewMode = ref('list')
const editing = ref(null), editName = ref(''), editError = ref('')
const deleteTarget = ref(null), deleting = ref(false), deleteError = ref('')
const successMessage = ref('')
const sortOptions = [
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'items-asc', label: 'Equipment: Fewest first' },
  { value: 'items-desc', label: 'Equipment: Most first' },
]
const filteredCategories = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visibleCategories = categories.value.filter((category) =>
    !query || category.category_name.toLowerCase().includes(query))

  return [...visibleCategories].sort((a, b) => {
    if (sortBy.value === 'items-asc' || sortBy.value === 'items-desc') {
      const difference = itemCount(a.category_id) - itemCount(b.category_id)
      return sortBy.value === 'items-asc' ? difference : -difference
    }

    const difference = a.category_name.localeCompare(b.category_name, undefined, { sensitivity: 'base', numeric: true })
    return sortBy.value === 'name-desc' ? -difference : difference
  })
})
function itemCount(categoryId) {
  return inventory.value.filter((item) => Number(item.category) === Number(categoryId)).length
}
async function load() {
  try {
    [categories.value, inventory.value] = (await Promise.all([api.get('/categories/'), api.get('/inventory/')])).map((response) => response.data)
    error.value = ''
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || 'Unable to load categories and inventory. Check the API connection and try again.'
  }
}
async function add() {
  try {
    error.value = ''
    await api.post('/categories/create/', { category_name: name.value })
    name.value = ''
    addDetails.value.open = false
    await load()
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to add category.'
  }
}
function closeAddOnOutsideClick(event) {
  if (addDetails.value?.open && !addDetails.value.contains(event.target)) {
    addDetails.value.open = false
  }
}
function requestDelete(category) {
  deleteTarget.value = category
  error.value = ''
}
async function remove() {
  if (!deleteTarget.value || deleting.value) return
  try {
    deleting.value = true
    error.value = ''
    await api.delete(`/categories/${deleteTarget.value.category_id}/delete/`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    deleteTarget.value = null
    deleteError.value = e.response?.data?.message || e.response?.data?.detail || 'Unable to delete category.'
  } finally {
    deleting.value = false
  }
}
function openEdit(category) {
  editing.value = category
  editName.value = category.category_name
  editError.value = ''
}
async function saveEdit() {
  try {
    editError.value = ''
    await api.put(`/categories/${editing.value.category_id}/update/`, { category_name: editName.value })
    editing.value = null
    successMessage.value = 'The category was updated successfully.'
    await load()
  } catch (e) {
    const data = e.response?.data
    editError.value = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to update category.'
  }
}
onMounted(() => {
  load()
  document.addEventListener('click', closeAddOnOutsideClick)
})
onUnmounted(() => document.removeEventListener('click', closeAddOnOutsideClick))
</script>

<template>
  <section class="category-page">
    <header class="category-intro">
      <div><span class="page-eyebrow">INVENTORY ORGANIZATION</span><h2>Equipment categories</h2><p>Group equipment so it is easier to browse, maintain, and locate.</p></div>
      <div class="category-total"><strong>{{ categories.length }}</strong><span>{{ categories.length === 1 ? 'category' : 'categories' }} created</span></div>
    </header>
    <div class="panel list-panel">
      <div class="list-header">
        <h3>Categories <span class="count">{{ filteredCategories.length }}</span></h3>
        <label class="search-box"><Search :size="16" /><input v-model="search" placeholder="Search categories"></label>
        <label class="sort-control">
          <span>Sort by</span>
          <select v-model="sortBy" aria-label="Sort categories">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <div class="view-toggle" role="group" aria-label="Category view">
          <button type="button" :class="{ selected: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" aria-label="List view" title="List view" @click="viewMode = 'list'"><List :size="15" /><span>List</span></button>
          <button type="button" :class="{ selected: viewMode === 'grid' }" :aria-pressed="viewMode === 'grid'" aria-label="Grid view" title="Grid view" @click="viewMode = 'grid'"><Grid2X2 :size="15" /><span>Grid</span></button>
        </div>
        <details ref="addDetails" class="add-details">
          <summary><Plus :size="16" /> Add category</summary>
          <form class="add-form" @submit.prevent="add">
            <label for="category-name">Category name</label>
            <div class="add-controls"><input id="category-name" v-model="name" required maxlength="100" placeholder="e.g. Measuring tools" class="field"><button class="primary">Save</button></div>
          </form>
        </details>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div v-if="filteredCategories.length && viewMode === 'list'" class="category-list">
        <article v-for="category in filteredCategories" :key="category.category_id" class="category-row">
          <span class="category-icon"><Tags :size="17" /></span>
          <div class="category-copy"><strong>{{ category.category_name }}</strong><span><Boxes :size="13" /> {{ itemCount(category.category_id) }} equipment items</span></div>
          <button class="delete-button" :aria-label="`Edit ${category.category_name}`" title="Edit category" @click="openEdit(category)"><Pencil :size="15" /></button>
          <button class="delete-button" :aria-label="`Delete ${category.category_name}`" title="Delete category" @click="requestDelete(category)"><Trash2 :size="16" /></button>
        </article>
      </div>
      <div v-else-if="filteredCategories.length" class="category-grid">
        <article v-for="category in filteredCategories" :key="category.category_id" class="category-card">
          <div class="category-card-top"><span class="category-icon"><Tags :size="18" /></span><span class="category-equipment-count">{{ itemCount(category.category_id) }} items</span></div>
          <h4>{{ category.category_name }}</h4>
          <p><Boxes :size="14" /> Equipment in this category</p>
          <div class="category-card-actions">
            <button type="button" :aria-label="`Edit ${category.category_name}`" @click="openEdit(category)"><Pencil :size="14" /> Edit</button>
            <button type="button" class="category-card-delete" :aria-label="`Delete ${category.category_name}`" @click="requestDelete(category)"><Trash2 :size="14" /> Delete</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">{{ search ? 'No categories match your search.' : 'No categories yet. Select “Add category” to create one.' }}</div>
    </div>
    <Modal :open="Boolean(editing)" title="Edit category" @close="editing = null">
      <form class="edit-form" @submit.prevent="saveEdit">
        <label>Category name<input v-model="editName" required maxlength="200" class="field"></label>
        <p v-if="editError" class="error">{{ editError }}</p>
        <div class="modal-actions"><button type="button" class="secondary" @click="editing = null">Cancel</button><button class="primary">Save changes</button></div>
      </form>
    </Modal>
    <Modal :open="Boolean(deleteTarget)" title="Delete category?" @close="deleteTarget = null">
      <div class="delete-confirmation">
        <p>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.category_name }}</strong>?
        </p>
        <p class="delete-warning">
          Categories used by equipment cannot be deleted. Reassign or remove the equipment first.
        </p>
        <div class="delete-actions">
          <button type="button" class="cancel-button" :disabled="deleting" @click="deleteTarget = null">Cancel</button>
          <button type="button" class="confirm-delete-button" :disabled="deleting" @click="remove">
            {{ deleting ? 'Deleting…' : 'Delete category' }}
          </button>
        </div>
      </div>
    </Modal>
    <Modal :open="Boolean(deleteError)" title="Unable to delete category" @close="deleteError = ''">
      <div class="delete-error">
        <p role="alert">{{ deleteError }}</p>
        <div class="delete-actions">
          <button type="button" class="confirm-delete-button" autofocus @click="deleteError = ''">Okay</button>
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
.category-page { display: grid; gap: 17px; }
.category-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 3px 2px; }
.category-intro > div:first-child { display: grid; gap: 5px; }
.page-eyebrow { color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.category-intro h2 { margin: 0; color: #202d40; font-size: clamp(22px, 2.8vw, 29px); font-weight: 760; letter-spacing: -.04em; }
.category-intro p { margin: 0; color: #778397; font-size: 12px; }
.category-total { display: grid; min-width: 115px; justify-items: center; gap: 3px; border: 1px solid #e8edf4; border-radius: 13px; background: white; padding: 9px 13px; }
.category-total strong { color: #c2410c; font-size: 20px; line-height: 1; }.category-total span { color: #818da0; font-size: 9px; }
.list-panel { overflow: visible; padding: 20px; }
.list-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.list-header h3 { flex: 1; margin: 0; color: #273449; font-size: 15px; font-weight: 700; }
.field { width: 100%; }
.count { margin-left: 5px; border-radius: 20px; background: #f1f5f9; padding: 3px 7px; color: #667085; font-size: 10px; font-weight: 600; }
.search-box { display: flex; width: min(100%, 230px); min-height: 38px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 10px; color: #98a2b3; }
.search-box input { width: 100%; border: 0; outline: 0; color: #344054; font-size: 11px; }
.sort-control { display: flex; min-height: 38px; align-items: center; gap: 7px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 9px; color: #667085; font-size: 11px; white-space: nowrap; }
.sort-control select { max-width: 150px; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.view-toggle { display: flex; flex: 0 0 auto; gap: 2px; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 3px; }
.view-toggle button { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 7px; background: transparent; padding: 0 8px; color: #778397; font-size: 9px; font-weight: 600; }
.view-toggle button:hover { background: #f8fafc; color: #344054; }.view-toggle button.selected { background: #fff1e9; color: #bd3e05; }
.add-details { position: relative; }
.add-details summary { display: inline-flex; min-height: 38px; align-items: center; gap: 7px; border-radius: 9px; background: #c2410c; padding: 0 12px; color: white; cursor: pointer; font-size: 11px; font-weight: 650; list-style: none; white-space: nowrap; }
.add-details summary::-webkit-details-marker { display: none; }
.add-form { position: absolute; z-index: 10; top: 45px; right: 0; width: min(360px, calc(100vw - 48px)); border: 1px solid #e8edf4; border-radius: 13px; background: white; padding: 15px; box-shadow: 0 15px 40px rgb(16 24 40 / 14%); }
.add-form label { display: block; margin-bottom: 6px; color: #667085; font-size: 11px; font-weight: 650; }
.add-controls { display: flex; gap: 8px; }.add-controls .primary { flex: 0 0 auto; }
.error { margin: 8px 0 0; color: #be123c; font-size: 11px; }
.category-list { border-top: 1px solid #eef1f5; }
.category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-top: 5px; }
.category-card { min-width: 0; border: 1px solid #e8edf4; border-radius: 14px; background: white; padding: 15px; transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.category-card:hover { transform: translateY(-2px); border-color: #f0c8b1; box-shadow: 0 8px 20px rgb(87 54 32 / 6%); }
.category-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.category-equipment-count { border-radius: 999px; background: #f1f5f9; padding: 5px 8px; color: #667085; font-size: 9px; font-weight: 650; }
.category-card h4 { overflow: hidden; margin: 13px 0 5px; color: #344054; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.category-card > p { display: flex; align-items: center; gap: 5px; margin: 0; color: #8791a2; font-size: 9px; }.category-card > p svg { color: #c2410c; }
.category-card-actions { display: flex; gap: 7px; margin-top: 14px; border-top: 1px solid #eef1f5; padding-top: 10px; }.category-card-actions button { display: inline-flex; min-height: 30px; align-items: center; gap: 5px; border: 1px solid #e4e9f0; border-radius: 8px; background: #fff; padding: 0 9px; color: #bd3e05; font-size: 9px; font-weight: 650; }.category-card-actions button:hover { border-color: #f0c8b1; background: #fff7f2; }.category-card-actions .category-card-delete { color: #be123c; }.category-card-actions .category-card-delete:hover { border-color: #fecdd3; background: #fff1f2; }
.category-row { display: flex; min-height: 66px; align-items: center; gap: 12px; border-bottom: 1px solid #eef1f5; padding: 11px 7px; transition: background .15s ease; }
.category-row:hover { background: #fbfcfe; }
.category-icon { display: grid; width: 37px; height: 37px; flex: 0 0 37px; place-items: center; border-radius: 11px; background: #fff7ed; color: #c2410c; }
.category-copy { min-width: 0; flex: 1; }.category-copy strong { display: block; overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.category-copy span { display: flex; align-items: center; gap: 4px; margin-top: 5px; color: #98a2b3; font-size: 10px; }
.delete-button { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #98a2b3; }.delete-button:hover { background: #fff1f0; color: #dc2626; }
.empty-state { padding: 32px 12px; color: #8791a2; font-size: 12px; text-align: center; }
.delete-confirmation { display: grid; gap: 12px; color: #475467; font-size: 14px; line-height: 1.6; }
.delete-confirmation p { margin: 0; }
.delete-confirmation strong { color: #172033; }
.delete-warning { border-radius: 8px; background: #fff7ed; padding: 10px 12px; color: #9a3412; font-size: 12px; }
.delete-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding-top: 6px; }
.delete-actions button { display: inline-flex; min-height: 42px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 9px; padding: 0 16px; font-size: 13px; font-weight: 650; white-space: nowrap; }
.cancel-button { min-width: 96px; border: 1px solid #d0d5dd; background: white; color: #475467; }
.cancel-button:hover:not(:disabled) { background: #f8fafc; }
.confirm-delete-button { min-width: 142px; border: 1px solid #be123c; background: #be123c; color: white; }
.confirm-delete-button:hover:not(:disabled) { border-color: #9f1239; background: #9f1239; }
.delete-actions button:disabled { cursor: wait; opacity: .65; }
.delete-error p { margin: 0; border: 1px solid #ffe4e6; border-radius: 9px; background: #fff1f2; padding: 13px; color: #be123c; font-size: 13px; line-height: 1.6; }
.delete-error .delete-actions { margin-top: 16px; }
.edit-form { display: grid; gap: 13px; }.edit-form label { display: grid; gap: 5px; color: #667085; font-size: 11px; font-weight: 650; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }.secondary { min-height: 40px; border: 1px solid #e4e9f0; border-radius: 9px; background: white; padding: 0 13px; color: #667085; font-size: 12px; }
@media (max-width: 900px) { .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .list-header { flex-wrap: wrap; }.list-header h3 { flex-basis: 100%; }.search-box { flex: 1 1 180px; width: 100%; }.sort-control { flex: 1 1 180px; justify-content: space-between; }.sort-control select { max-width: none; } }
@media (max-width: 560px) { .category-intro { align-items: flex-start; flex-direction: column; }.category-total { min-width: 0; grid-template-columns: auto auto; align-items: center; justify-items: start; gap: 8px; }.category-total strong { font-size: 16px; } }
@media (max-width: 560px) { .list-panel { padding: 14px; }.add-form { right: auto; left: 0; }.view-toggle { flex: 1 1 auto; }.view-toggle button { flex: 1; }.category-grid { grid-template-columns: 1fr; } }
</style>
