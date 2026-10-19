<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { CalendarDays, CheckCircle2, ClipboardList, Grid2X2, List, Package, PackageCheck, Pencil, RotateCcw, Search, X } from 'lucide-vue-next'
import api from '../../api/client'
import Modal from '../../components/Modal.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SuccessModal from '../../components/SuccessModal.vue'
import TransactionTable from '../shared/TransactionTable.vue'
const transactions = ref([]), inventory = ref([]), error = ref(''), message = ref('')
const selectedStatus = ref('all'), sortBy = ref('date-desc'), search = ref('')
const viewMode = ref('list')
const returnTarget = ref(null), requestingReturn = ref(false)
const editing = ref(null), editError = ref('')
const editForm = reactive({ item_name: '', quantity: 1 })
const editSuccessMessage = ref('')
let messageTimeout
const sortOptions = [
  { value: 'date-desc', label: 'Borrowed: Newest first' },
  { value: 'date-asc', label: 'Borrowed: Oldest first' },
  { value: 'equipment-asc', label: 'Equipment: A to Z' },
  { value: 'equipment-desc', label: 'Equipment: Z to A' },
  { value: 'quantity-asc', label: 'Quantity: Low to high' },
  { value: 'quantity-desc', label: 'Quantity: High to low' },
]
const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Using' },
  { value: 'return_requested', label: 'Return requested' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
]
function matchesBorrowDate(transaction, query) {
  const value = transaction.borrow_datetime || transaction.borrow_date
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).toLowerCase().includes(query)

  const displayedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
  return [displayedDate, date.toLocaleDateString(), date.toISOString()]
    .some((dateValue) => dateValue.toLowerCase().includes(query))
}
const filteredTransactions = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visibleTransactions = transactions.value.filter((transaction) => {
    const matchesStatus = selectedStatus.value === 'all' || transaction.status === selectedStatus.value
    const equipmentName = transaction.item_title || transaction.item_name || transaction.item?.item_name || ''
    return matchesStatus && (
      !query
      || equipmentName.toLowerCase().includes(query)
      || matchesBorrowDate(transaction, query)
    )
  })

  return [...visibleTransactions].sort((a, b) => {
    if (sortBy.value === 'date-asc' || sortBy.value === 'date-desc') {
      const getTime = (transaction) => {
        const value = transaction.borrow_datetime || transaction.borrow_date
        const time = value ? new Date(value).getTime() : 0
        return Number.isNaN(time) ? 0 : time
      }
      const difference = getTime(a) - getTime(b)
      return sortBy.value === 'date-asc' ? difference : -difference
    }
    if (sortBy.value === 'quantity-asc' || sortBy.value === 'quantity-desc') {
      const difference = Number(a.quantity || 0) - Number(b.quantity || 0)
      return sortBy.value === 'quantity-asc' ? difference : -difference
    }

    const getName = (transaction) => transaction.item_title || transaction.item_name || transaction.item?.item_name || ''
    const difference = String(getName(a)).localeCompare(String(getName(b)), undefined, { sensitivity: 'base', numeric: true })
    return sortBy.value === 'equipment-desc' ? -difference : difference
  })
})
function countFor(status) {
  return status === 'all'
    ? transactions.value.length
    : transactions.value.filter((transaction) => transaction.status === status).length
}
function equipmentName(transaction) {
  return transaction.item_title || transaction.item_name || transaction.item?.item_name || 'Equipment'
}
function formatBorrowedOn(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function showSuccess(text) {
  window.clearTimeout(messageTimeout)
  message.value = text
  messageTimeout = window.setTimeout(() => {
    message.value = ''
  }, 6000)
}
function getEditErrorMessage(error) {
  const data = error.response?.data
  if (data?.message || data?.detail) return data.message || data.detail

  if (data && typeof data === 'object') {
    const fieldLabels = { item_name: 'Equipment', quantity: 'Quantity' }
    const messages = Object.entries(data).flatMap(([field, values]) => {
      const fieldMessages = (Array.isArray(values) ? values : [values]).map(String)
      return fieldMessages.map((fieldMessage) => {
        if (field === 'item_name' && /currently unavailable|under maintenance/i.test(fieldMessage)) {
          const availability = /under maintenance/i.test(fieldMessage) ? 'under maintenance' : 'unavailable'
          return `This equipment is ${availability}. Choose another available item or contact laboratory staff.`
        }
        const stockError = fieldMessage.match(/Insufficient stock: only (\d+) unit\(s\) available\./i)
        if (field === 'quantity' && stockError) {
          return `Only ${stockError[1]} unit(s) are currently available. Adjust the quantity and try again.`
        }
        return `${fieldLabels[field] || field}: ${fieldMessage}`
      })
    })
    if (messages.length) return messages.join(' ')
  }

  if (error.response?.status) return `Unable to update this request (HTTP ${error.response.status}).`
  if (error.request) return 'Cannot reach the server. Check your connection and try again.'
  return error.message || 'Unable to update this request.'
}
function equipmentOptionLabel(item) {
  if (item.status === 'maintenance') return `${item.item_name} (Under maintenance)`
  if (item.status !== 'available') return `${item.item_name} (Unavailable)`
  return `${item.item_name} (${item.quantity} available)`
}
async function action(transaction, actionName) {
  if (actionName === 'request-return') {
    returnTarget.value = transaction
    return
  }
  if (actionName === 'edit') {
    try {
      editError.value = ''
      inventory.value = (await api.get('/inventory/')).data
      editing.value = transaction
      Object.assign(editForm, { item_name: transaction.item_name, quantity: transaction.quantity })
    } catch {
      error.value = 'Unable to load equipment for editing this request.'
    }
    return
  }
  if (actionName !== 'cancel' || !confirm('Cancel this pending borrow request?')) return
  try {
    error.value = ''
    await api.delete(`/transactions/${transaction.transaction_id}/delete/`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Unable to cancel this request.'
  }
}
async function submitReturnRequest() {
  const transaction = returnTarget.value
  if (!transaction || requestingReturn.value) return
  window.clearTimeout(messageTimeout)
  error.value = ''
  message.value = ''
  requestingReturn.value = true
  try {
    await api.post(`/transactions/${transaction.transaction_id}/return-request/`)
    returnTarget.value = null
    selectedStatus.value = 'return_requested'
    showSuccess('Return request sent. Your item is waiting for staff inspection and approval.')
    await load()
  } catch (e) {
    try {
      const { data } = await api.get(`/transactions/${transaction.transaction_id}/`)
      if (data.status === 'return_requested') {
        returnTarget.value = null
        selectedStatus.value = 'return_requested'
        showSuccess('Your return request was received. Your item is waiting for staff inspection and approval.')
        await load()
        return
      }
    } catch {
      returnTarget.value = null
      error.value = 'Unable to verify whether the return request was received. Refresh your borrowing history before trying again.'
      return
    }
    returnTarget.value = null
    const data = e.response?.data
    if (data?.message || data?.detail) {
      error.value = data.message || data.detail
    } else if (e.response?.status === 404) {
      error.value = 'The running backend does not have the return-request endpoint. Restart Django from the backend folder, then refresh this page and try again.'
    } else if (e.response?.status) {
      error.value = `Unable to request this return (HTTP ${e.response.status}).`
    } else {
      error.value = 'Unable to reach the server to request this return.'
    }
  } finally {
    requestingReturn.value = false
  }
}
async function saveEdit() {
  const selectedItem = inventory.value.find((item) => Number(item.item_id) === Number(editForm.item_name))
  if (selectedItem && selectedItem.status !== 'available') {
    editError.value = `“${selectedItem.item_name}” is ${selectedItem.status === 'maintenance' ? 'under maintenance' : 'unavailable'}. Choose another available item or contact laboratory staff.`
    return
  }
  if (selectedItem && Number(editForm.quantity) > selectedItem.quantity) {
    editError.value = `Only ${selectedItem.quantity} unit(s) of “${selectedItem.item_name}” are currently available. Adjust the quantity and try again.`
    return
  }
  try {
    editError.value = ''
    await api.put(`/transactions/${editing.value.transaction_id}/update/`, {
      item_name: editForm.item_name,
      quantity: Number(editForm.quantity),
    })
    editing.value = null
    editSuccessMessage.value = 'Your borrowing request was updated successfully.'
    await load()
  } catch (e) {
    editError.value = getEditErrorMessage(e)
  }
}
async function load() { try { error.value = ''; transactions.value = (await api.get('/transactions/')).data } catch { error.value = 'Unable to load borrowing history.' } }
onMounted(load)
onUnmounted(() => window.clearTimeout(messageTimeout))
</script>
<template>
  <section class="history-page">
    <header class="history-intro">
      <div class="history-intro-copy"><span class="page-eyebrow"><ClipboardList :size="13" /> YOUR LAB ACTIVITY</span><h2>Requests, loans, and returns</h2><p>Follow the status of your equipment requests and current loans in one place.</p></div>
      <div class="history-total"><strong>{{ transactions.length }}</strong><span>{{ transactions.length === 1 ? 'request' : 'requests' }} total</span></div>
    </header>
    <div class="history-summary" aria-label="Quick filters for borrowing history">
      <button type="button" :class="['summary-card', 'all-summary', { selected: selectedStatus === 'all' }]" :aria-pressed="selectedStatus === 'all'" @click="selectedStatus = 'all'">
        <span class="summary-icon"><ClipboardList :size="18" /></span><span class="summary-copy"><span>All requests</span><strong>{{ countFor('all') }}</strong></span>
      </button>
      <button type="button" :class="['summary-card', 'loan-summary', { selected: selectedStatus === 'approved' }]" :aria-pressed="selectedStatus === 'approved'" @click="selectedStatus = 'approved'">
        <span class="summary-icon"><PackageCheck :size="18" /></span><span class="summary-copy"><span>Currently using</span><strong>{{ countFor('approved') }}</strong></span>
      </button>
      <button type="button" :class="['summary-card', 'return-summary', { selected: selectedStatus === 'returned' }]" :aria-pressed="selectedStatus === 'returned'" @click="selectedStatus = 'returned'">
        <span class="summary-icon"><CheckCircle2 :size="18" /></span><span class="summary-copy"><span>Successfully returned</span><strong>{{ countFor('returned') }}</strong></span>
      </button>
    </div>
    <div class="panel history-panel">
      <div class="history-panel-heading">
        <div><h3>Borrowing activity</h3><p><RotateCcw :size="13" /> Staff must inspect and approve returns before they are marked returned.</p></div>
        <span class="shown-count">{{ filteredTransactions.length }} shown</span>
      </div>
      <p v-if="message" class="success" role="status">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="history-controls">
        <nav class="filters" aria-label="Filter borrowing history by status">
          <button v-for="filter in statusFilters" :key="filter.value" type="button" :class="['filter', { selected: selectedStatus === filter.value }]" :aria-pressed="selectedStatus === filter.value" @click="selectedStatus = filter.value">
            {{ filter.label }} <span class="count">{{ countFor(filter.value) }}</span>
          </button>
        </nav>
        <div class="history-search-row">
          <label class="history-search"><Search :size="16" aria-hidden="true" /><input v-model="search" aria-label="Search borrowing history" placeholder="Search equipment or date"></label>
          <label class="sort-control">
            <span>Sort by</span>
            <select v-model="sortBy" aria-label="Sort borrowing history">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <div class="view-toggle" role="group" aria-label="Borrowing activity view">
            <button type="button" :class="{ selected: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" aria-label="List view" title="List view" @click="viewMode = 'list'"><List :size="16" /><span>List</span></button>
            <button type="button" :class="{ selected: viewMode === 'grid' }" :aria-pressed="viewMode === 'grid'" aria-label="Grid view" title="Grid view" @click="viewMode = 'grid'"><Grid2X2 :size="15" /><span>Grid</span></button>
          </div>
        </div>
      </div>
      <TransactionTable v-if="viewMode === 'list'" :items="filteredTransactions" owner @action="action" />
      <div v-else class="history-grid">
        <article v-for="transaction in filteredTransactions" :key="transaction.transaction_id" class="history-card">
          <div class="history-card-top">
            <span class="history-card-icon"><Package :size="18" /></span>
            <StatusBadge :status="transaction.status" />
          </div>
          <div class="history-card-title">
            <span>LAB EQUIPMENT</span>
            <h4>{{ equipmentName(transaction) }}</h4>
          </div>
          <dl class="history-card-details">
            <div><dt>Quantity</dt><dd>{{ transaction.quantity ?? '—' }} {{ transaction.quantity === 1 ? 'unit' : 'units' }}</dd></div>
            <div><dt>Borrowed on</dt><dd><CalendarDays :size="13" /> {{ formatBorrowedOn(transaction.borrow_datetime || transaction.borrow_date) }}</dd></div>
          </dl>
          <div v-if="['pending', 'approved', 'return_requested'].includes(transaction.status)" class="history-card-actions">
            <template v-if="transaction.status === 'pending'">
              <button type="button" class="card-edit-action" @click="action(transaction, 'edit')"><Pencil :size="14" /> Edit request</button>
              <button type="button" class="card-cancel-action" @click="action(transaction, 'cancel')"><X :size="14" /> Cancel</button>
            </template>
            <button v-else-if="transaction.status === 'approved'" type="button" class="card-return-action" @click="action(transaction, 'request-return')"><RotateCcw :size="14" /> Request return</button>
            <span v-else class="card-waiting"><RotateCcw :size="14" /> Awaiting staff inspection</span>
          </div>
        </article>
        <div v-if="!filteredTransactions.length" class="grid-empty">No transactions found.</div>
      </div>
    </div>
    <Modal :open="Boolean(returnTarget)" title="Request equipment return?" dialog-class="return-confirmation-dialog" @close="!requestingReturn && (returnTarget = null)">
      <div class="return-confirmation">
        <span class="return-confirmation-icon"><RotateCcw :size="19" /></span>
        <p>Send a return request for <strong>{{ returnTarget?.item_title || returnTarget?.item_name || returnTarget?.item?.item_name || 'this equipment' }}</strong>?</p>
        <p class="return-confirmation-note">The item will remain on loan until laboratory staff inspect it and approve the return.</p>
        <div class="return-confirmation-actions">
          <button type="button" class="return-cancel-button" :disabled="requestingReturn" @click="returnTarget = null">Cancel</button>
          <button type="button" class="return-submit-button" :disabled="requestingReturn" @click="submitReturnRequest">
            {{ requestingReturn ? 'Sending request…' : 'Send return request' }}
          </button>
        </div>
      </div>
    </Modal>
    <Modal
      :open="Boolean(editing)"
      title="Edit pending request"
      :close-on-escape="!editError"
      @close="editing = null"
    >
      <form class="edit-form" @submit.prevent="saveEdit">
        <label>Equipment<select v-model="editForm.item_name" required class="field"><option v-for="item in inventory" :key="item.item_id" :value="item.item_id" :disabled="item.status !== 'available' || item.quantity < 1">{{ equipmentOptionLabel(item) }}</option></select></label>
        <label>Quantity<input v-model.number="editForm.quantity" type="number" min="1" :max="inventory.find(item => Number(item.item_id) === Number(editForm.item_name))?.quantity || undefined" required class="field"></label>
        <div class="modal-actions"><button type="button" class="secondary" @click="editing = null">Cancel</button><button class="primary">Save changes</button></div>
      </form>
    </Modal>
    <Modal :open="Boolean(editError)" title="Unable to save changes" @close="editError = ''">
      <div class="edit-error-dialog">
        <p class="edit-error-message" role="alert">{{ editError }}</p>
        <div class="modal-actions">
          <button type="button" class="primary" autofocus @click="editError = ''">Okay</button>
        </div>
      </div>
    </Modal>
    <SuccessModal
      :open="Boolean(editSuccessMessage)"
      :message="editSuccessMessage"
      @close="editSuccessMessage = ''"
    />
  </section>
</template>
<style scoped>
@reference "../../index.css";
.history-page { display: grid; gap: 17px; }
.history-intro { position: relative; display: flex; min-height: 122px; align-items: center; justify-content: space-between; gap: 16px; overflow: hidden; border: 1px solid #f0d7c7; border-radius: 17px; background: radial-gradient(ellipse at 94% 10%, rgb(255 255 255 / 85%), transparent 35%), linear-gradient(115deg, #fff3eb, #fffaf6 72%, #f8e7db); padding: 20px 24px; }
.history-intro::after { position: absolute; right: 85px; bottom: -75px; width: 170px; height: 170px; border: 1px solid rgb(194 65 12 / 10%); border-radius: 50%; content: ''; }
.history-intro-copy { position: relative; z-index: 1; display: grid; gap: 6px; }
.page-eyebrow { display: inline-flex; align-items: center; gap: 6px; color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.history-intro h2 { margin: 0; color: #34261f; font-size: clamp(19px, 2.3vw, 25px); font-weight: 760; letter-spacing: -.04em; }
.history-intro p { margin: 0; color: #806b5c; font-size: 11px; }
.history-total { position: relative; z-index: 1; display: grid; min-width: 92px; justify-items: center; gap: 2px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 14px; background: rgb(255 255 255 / 82%); padding: 10px 14px; box-shadow: 0 5px 15px rgb(87 54 32 / 5%); }
.history-total strong { color: #bd4b16; font-size: 23px; line-height: 1; }.history-total span { color: #806b5c; font-size: 9px; font-weight: 600; }
.history-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; }
.summary-card { display: flex; min-width: 0; align-items: center; gap: 12px; border: 1px solid #e8edf4; border-radius: 14px; background: #fff; padding: 13px 16px; text-align: left; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.summary-card:hover { transform: translateY(-2px); border-color: #d5dce7; box-shadow: 0 8px 20px #1720330b; }.summary-card.selected { border-color: #fd4d01; box-shadow: 0 0 0 3px #fd4d0117; }
.summary-icon { display: grid; width: 37px; height: 37px; flex: 0 0 auto; place-items: center; border-radius: 11px; background: #fff1e9; color: #c2410c; }
.summary-copy { display: grid; gap: 4px; }.summary-copy span { color: #6e7a8d; font-size: 10px; font-weight: 650; }.summary-copy strong { color: #263449; font-size: 20px; line-height: 1; }
.loan-summary .summary-icon { background: #fff1e9; color: #c2410c; }.loan-summary .summary-copy strong { color: #c2410c; }
.return-summary .summary-icon { background: #eafaf3; color: #07845b; }.return-summary .summary-copy strong { color: #07845b; }
.history-panel { overflow: hidden; padding: 20px; }
.history-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -2px 0 15px; border-bottom: 1px solid #edf0f4; padding: 0 0 13px; }
.history-panel-heading h3 { margin: 0 0 4px; color: #273449; font-size: 15px; font-weight: 700; }.history-panel-heading p { display: flex; align-items: center; gap: 6px; margin: 0; color: #8791a2; font-size: 10px; }.history-panel-heading p svg { flex: 0 0 auto; color: #c2410c; }
.shown-count { border: 1px solid #e8edf4; border-radius: 999px; background: #f8fafc; padding: 7px 10px; color: #667085; font-size: 9px; font-weight: 650; white-space: nowrap; }
.error { margin: 0 0 12px; color: #be123c; font-size: 12px; }
.success { margin: 0 0 12px; color: #047857; font-size: 12px; }
.history-controls { display: grid; gap: 10px; margin-bottom: 13px; border: 1px solid #edf0f4; border-radius: 13px; background: #f9fafb; padding: 10px; }
.filters { display: flex; gap: 4px; overflow-x: auto; margin-bottom: 0; padding-bottom: 1px; }
.history-controls .filters { min-width: 0; }
.history-search-row { display: flex; align-items: center; gap: 9px; border-top: 1px solid #edf0f4; padding-top: 9px; }
.history-search { display: flex; width: min(100%, 360px); min-height: 39px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 0 11px; color: #98a2b3; transition: border-color .15s ease, box-shadow .15s ease; }
.history-search:focus-within { border-color: #fb923c; box-shadow: 0 0 0 3px rgb(251 146 60 / 14%); }
.history-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.sort-control { display: flex; min-height: 39px; width: fit-content; max-width: 100%; align-items: center; gap: 7px; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 0 10px; color: #667085; font-size: 11px; white-space: nowrap; }
.sort-control select { max-width: 165px; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.view-toggle { display: flex; flex: 0 0 auto; gap: 2px; margin-left: auto; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 3px; }
.view-toggle button { display: inline-flex; min-height: 31px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 7px; background: transparent; padding: 0 9px; color: #778397; font-size: 10px; font-weight: 600; }
.view-toggle button:hover { background: #f8fafc; color: #344054; }.view-toggle button.selected { background: #fff1e9; color: #bd3e05; }
.history-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.history-card { display: flex; min-width: 0; flex-direction: column; border: 1px solid #e5eaf1; border-radius: 13px; background: white; padding: 15px; transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.history-card:hover { transform: translateY(-2px); border-color: #f0c8b1; box-shadow: 0 8px 20px rgb(87 54 32 / 6%); }
.history-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.history-card-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 10px; background: #fff1e9; color: #c2410c; }
.history-card-title { min-width: 0; margin-top: 15px; }
.history-card-title > span { color: #bd5a2a; font-size: 8px; font-weight: 750; letter-spacing: .11em; }
.history-card-title h4 { overflow: hidden; margin: 4px 0 0; color: #263449; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.history-card-details { display: grid; gap: 10px; margin: 15px 0 0; border-top: 1px solid #edf0f4; padding-top: 12px; }
.history-card-details div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.history-card-details dt { color: #8791a2; font-size: 9px; }.history-card-details dd { display: inline-flex; align-items: center; gap: 5px; margin: 0; color: #475467; font-size: 10px; text-align: right; }
.history-card-details dd svg { color: #9aa3b1; }
.history-card-actions { display: flex; align-items: center; gap: 7px; margin-top: 13px; border-top: 1px solid #edf0f4; padding-top: 11px; }
.history-card-actions button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; gap: 5px; border: 1px solid #e5eaf1; border-radius: 8px; background: white; padding: 0 9px; font-size: 9px; font-weight: 650; }
.card-edit-action { color: #bd3e05; }.card-edit-action:hover { background: #fff7f2; border-color: #f2cbb7; }
.history-card-actions .card-cancel-action { color: #be123c; }.card-cancel-action:hover { background: #fff1f2; border-color: #fecdd3; }
.history-card-actions .card-return-action { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }.card-return-action:hover { background: #ffedd5; }
.card-waiting { display: inline-flex; align-items: center; gap: 6px; color: #778397; font-size: 9px; }
.grid-empty { grid-column: 1 / -1; border: 1px dashed #d9e0e8; border-radius: 12px; background: #fff; padding: 32px 12px; color: #8791a2; font-size: 12px; text-align: center; }
.return-confirmation { display: grid; justify-items: start; gap: 12px; }
.return-confirmation-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 12px; background: #fff1e9; color: #c2410c; }
.return-confirmation > p { margin: 0; color: #475467; font-size: 13px; line-height: 1.55; }.return-confirmation > p strong { color: #202d40; }
.return-confirmation .return-confirmation-note { border-radius: 9px; background: #f8fafc; padding: 10px 12px; color: #748096; font-size: 11px; }
.return-confirmation-actions { display: flex; width: 100%; justify-content: flex-end; gap: 9px; margin-top: 5px; }
.return-confirmation-actions button { min-height: 40px; border-radius: 9px; padding: 0 13px; font-size: 11px; font-weight: 650; }
.return-cancel-button { border: 1px solid #e4e9f0; background: white; color: #475467; }.return-cancel-button:hover:not(:disabled) { background: #f8fafc; }
.return-submit-button { border: 1px solid #c2410c; background: #c2410c; color: white; }.return-submit-button:hover:not(:disabled) { border-color: #9a3412; background: #9a3412; }
.return-confirmation-actions button:disabled { cursor: wait; opacity: .65; }
.history-page :deep(.return-confirmation-dialog) { max-width: 440px; border-radius: 17px; }
.history-page :deep(.return-confirmation-dialog header) { min-height: 58px; padding: 8px 16px; }
.history-page :deep(.return-confirmation-dialog header h3) { font-size: 15px; }
.history-page :deep(.return-confirmation-dialog .modal-content) { padding: 18px 20px 20px; }
.history-page :deep(.return-confirmation-icon) { width: 38px; height: 38px; }
.history-page :deep(.return-confirmation) { gap: 10px; }
.history-page :deep(.return-confirmation-actions) { margin-top: 2px; }
.history-page :deep(.return-confirmation-actions button) { min-height: 38px; }
.filter { display: flex; min-height: 32px; flex: 0 0 auto; align-items: center; gap: 6px; border: 1px solid transparent; border-radius: 8px; background: transparent; padding: 0 10px; color: #697586; font-size: 10px; transition: color .15s ease, background .15s ease, border-color .15s ease; }
.filter:hover { background: white; color: #344054; }
.filter.selected { border-color: #f6d7c5; background: #fff1e9; color: #bd3e05; font-weight: 700; }
.count { min-width: 19px; border-radius: 20px; background: #edf1f5; padding: 3px 6px; color: #667085; font-size: 9px; text-align: center; }
.selected .count { background: #fff; color: #c2410c; }
.history-panel :deep(.table-scroll) { border: 1px solid #e5eaf1; border-radius: 12px; background: white; }
.history-panel :deep(.table) { min-width: 680px; }
.history-panel :deep(.table th) { border-bottom: 1px solid #e5eaf1; background: #f7f9fc; padding: 13px 14px; color: #64748b; font-size: 9px; font-weight: 750; letter-spacing: .075em; text-transform: uppercase; }
.history-panel :deep(.table td) { border-bottom-color: #edf0f4; padding: 14px; color: #334155; font-size: 11px; }
.history-panel :deep(.table tbody tr) { transition: background-color .15s ease; }
.history-panel :deep(.table tbody tr:hover) { background: #fffaf6; }
.history-panel :deep(.table tbody tr:last-child td) { border-bottom: 0; }
.edit-error-dialog { display: grid; gap: 18px; }
.edit-error-message { margin: 0; border: 1px solid #ffe4e6; border-radius: 10px; background: #fff1f2; padding: 14px; color: #be123c; font-size: 14px; line-height: 1.6; }
.edit-form { display: grid; gap: 13px; }.edit-form label { display: grid; gap: 5px; color: #667085; font-size: 11px; font-weight: 650; }.edit-form .field { width: 100%; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }.secondary { min-height: 40px; border: 1px solid #e4e9f0; border-radius: 9px; background: white; padding: 0 13px; color: #667085; font-size: 12px; }.error { color: #be123c; }
@media (max-width: 1000px) { .history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .history-search-row { flex-wrap: wrap; }.history-search { flex: 1 1 220px; width: auto; }.sort-control { flex: 1 1 220px; justify-content: space-between; }.sort-control select { max-width: 70%; }.view-toggle { margin-left: 0; } }
@media (max-width: 600px) { .history-page { gap: 13px; }.history-intro { min-height: 0; padding: 17px; }.history-intro::after { right: 10px; }.history-summary { gap: 8px; }.summary-card { align-items: flex-start; flex-direction: column; gap: 8px; padding: 11px; }.summary-icon { width: 32px; height: 32px; }.summary-copy { gap: 3px; }.summary-copy span { font-size: 9px; }.summary-copy strong { font-size: 18px; }.history-panel { padding: 13px; }.history-panel-heading { align-items: flex-start; }.history-panel-heading p { align-items: flex-start; line-height: 1.45; }.history-controls { padding: 8px; }.filters { gap: 2px; }.filter { min-height: 30px; padding: 0 8px; font-size: 9px; }.history-search-row { gap: 8px; }.history-search { min-height: 38px; }.view-toggle { width: 100%; }.view-toggle button { flex: 1; }.history-grid { grid-template-columns: 1fr; }.history-panel :deep(.table th), .history-panel :deep(.table td) { padding-right: 10px; padding-left: 10px; }.history-page :deep(.return-confirmation-dialog) { max-width: calc(100vw - 28px); }.history-page :deep(.return-confirmation-dialog .modal-content) { padding: 15px; }.history-page :deep(.return-confirmation-actions) { flex-wrap: wrap; }.history-page :deep(.return-confirmation-actions button) { flex: 1; padding: 0 9px; } }
</style>
