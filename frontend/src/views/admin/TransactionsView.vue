<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { CheckCircle2, ClipboardList, Clock3, PackageCheck, RotateCcw, Search, XCircle } from 'lucide-vue-next'
import api from '../../api/client'
import TransactionTable from '../shared/TransactionTable.vue'
import { useAuth } from '../../composables/useAuth'
import Modal from '../../components/Modal.vue'
import SuccessModal from '../../components/SuccessModal.vue'

const transactions = ref([]), inventory = ref([]), users = ref([]), error = ref('')
const approvalError = ref('')
const returnSuccessMessage = ref('')
const returnTarget = ref(null), approvingReturn = ref(false)
const deleteTarget = ref(null), deleting = ref(false)
const selectedStatus = ref('all'), search = ref(''), sortBy = ref('date-desc')
const { isAdmin } = useAuth()
const form = reactive({ item_id: '', user: '', quantity: 1 })
const sortOptions = [
  { value: 'date-desc', label: 'Borrowed: Newest first' },
  { value: 'date-asc', label: 'Borrowed: Oldest first' },
  { value: 'equipment-asc', label: 'Equipment: A to Z' },
  { value: 'equipment-desc', label: 'Equipment: Z to A' },
  { value: 'borrower-asc', label: 'Borrower: A to Z' },
  { value: 'borrower-desc', label: 'Borrower: Z to A' },
  { value: 'quantity-asc', label: 'Quantity: Low to high' },
  { value: 'quantity-desc', label: 'Quantity: High to low' },
]
const statusFilters = [
  { value: 'all', label: 'All requests' },
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
    const matchesSearch = !query || [transaction.item_title, transaction.user_full_name, transaction.user_username]
      .some((value) => value?.toLowerCase().includes(query))
    return matchesStatus && (matchesSearch || matchesBorrowDate(transaction, query))
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

    const field = sortBy.value.startsWith('borrower-') ? 'borrower' : 'equipment'
    const getValue = (transaction) => field === 'borrower'
      ? transaction.user_full_name || transaction.user_username || transaction.user_name || ''
      : transaction.item_title || transaction.item_name || transaction.item?.item_name || ''
    const difference = String(getValue(a)).localeCompare(String(getValue(b)), undefined, { sensitivity: 'base', numeric: true })
    return sortBy.value.endsWith('-desc') ? -difference : difference
  })
})
function countStatus(status) {
  return status === 'all' ? transactions.value.length : transactions.value.filter((transaction) => transaction.status === status).length
}
async function focusNotificationTransaction(notification) {
  const transactionId = notification?.transaction_id
  selectedStatus.value = notification?.title === 'Equipment Return Requested'
    ? 'return_requested'
    : 'all'
  search.value = ''
  highlightedTransactionId.value = transactionId
  await load()
  await nextTick()
  document.getElementById(`transaction-${transactionId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}
const highlightedTransactionId = ref(null)
function getErrorMessage(e, fallback) {
  const data = e.response?.data
  if (data?.message || data?.detail) return data.message || data.detail
  if (data && typeof data === 'object') {
    const fields = Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
      .join(' ')
    if (fields) return fields
  }
  if (e.response?.status) return `${fallback} (HTTP ${e.response.status}).`
  if (e.request) return 'Cannot reach the API. Check that the backend server is running and try again.'
  return e.message || fallback
}
async function load() {
  try {
    const result = await Promise.all([api.get('/transactions/'), api.get('/inventory/'), api.get('/users/')])
    ;[transactions.value, inventory.value, users.value] = result.map((response) => response.data)
  } catch (e) {
    error.value = getErrorMessage(e, 'Unable to load transaction data.')
  }
}
async function create() {
  try {
    error.value = ''
    await api.post('/transactions/create/', {
      item_name: form.item_id,
      user: form.user,
      quantity: Number(form.quantity),
    })
    Object.assign(form, { item_id: '', user: '', quantity: 1 })
    await load()
  } catch (e) {
    error.value = getErrorMessage(e, 'Unable to create transaction.')
  }
}
async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return
  try {
    deleting.value = true
    error.value = ''
    await api.delete(`/transactions/${deleteTarget.value.transaction_id}/delete/`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    error.value = getErrorMessage(e, 'Unable to delete this borrowing request')
  } finally {
    deleting.value = false
  }
}
async function action(transaction, name) {
  if (name === 'delete') {
    deleteTarget.value = transaction
    error.value = ''
    return
  }
  if (name === 'return') {
    returnTarget.value = transaction
    error.value = ''
    return
  }
  try {
    error.value = ''
    await api.post(`/transactions/${transaction.transaction_id}/${name}/`)
    await load()
  } catch (e) {
    const actionLabels = { approve: 'Approval failed', reject: 'Rejection failed', return: 'Return failed', delete: 'Delete failed' }
    const message = getErrorMessage(e, actionLabels[name] || 'Unable to update transaction')
    if (name === 'approve' && /unavailable|under maintenance/i.test(message)) {
      approvalError.value = `${message} The request has not been approved. Update the equipment availability or ask the borrower to choose another item.`
    } else {
      error.value = message
    }
  }
}
async function approveReturn() {
  const transaction = returnTarget.value
  if (!transaction || approvingReturn.value) return
  approvingReturn.value = true
  error.value = ''
  try {
    await api.post(`/transactions/${transaction.transaction_id}/return/`)
    returnTarget.value = null
    await load()
    const itemName = transaction.item_title || transaction.item_name || 'Equipment'
    returnSuccessMessage.value = `${itemName} was successfully returned and marked available in the inventory.`
  } catch (e) {
    error.value = getErrorMessage(e, 'Return failed')
    returnTarget.value = null
  } finally {
    approvingReturn.value = false
  }
}
const handleNotificationOpen = (event) => focusNotificationTransaction(event.detail)
onMounted(() => {
  load()
  window.addEventListener('transactions:notification-open', handleNotificationOpen)
})
onUnmounted(() => window.removeEventListener('transactions:notification-open', handleNotificationOpen))
</script>

<template>
  <section class="transactions-page">
    <header class="transactions-intro">
      <div class="intro-copy">
        <span class="intro-eyebrow"><ClipboardList :size="14" /> LABORATORY OPERATIONS</span>
        <h2>Transactions</h2>
        <p>Review borrowing activity and keep equipment requests moving.</p>
      </div>
      <div class="total-requests"><span class="total-dot"></span>{{ transactions.length }} total requests</div>
    </header>
    <div class="summary-grid" aria-label="Transaction status summary">
      <button
        v-for="summary in [
          { status: 'pending', label: 'Pending review', icon: Clock3, tone: 'pending' },
          { status: 'approved', label: 'Currently borrowed', icon: PackageCheck, tone: 'borrowed' },
          { status: 'return_requested', label: 'Returns to inspect', icon: RotateCcw, tone: 'returning' },
          { status: 'returned', label: 'Successfully returned', icon: CheckCircle2, tone: 'returned' },
        ]"
        :key="summary.status"
        type="button"
        :class="['summary-card', summary.tone, { 'summary-selected': selectedStatus === summary.status }]"
        :aria-pressed="selectedStatus === summary.status"
        @click="selectedStatus = selectedStatus === summary.status ? 'all' : summary.status"
      >
        <span class="summary-icon"><component :is="summary.icon" :size="18" /></span>
        <span class="summary-copy"><span>{{ summary.label }}</span><strong>{{ countStatus(summary.status) }}</strong></span>
        <span class="summary-mark" aria-hidden="true"></span>
      </button>
    </div>
    <details class="panel create-panel">
      <summary><span class="create-icon"><ClipboardList :size="17" /></span><span class="create-copy"><strong>Create a borrowing request</strong><small>Record a loan for a borrower</small></span><span class="create-toggle">+</span></summary>
      <form class="form-grid" @submit.prevent="create">
        <label>Equipment<select v-model="form.item_id" required class="field"><option value="">Choose equipment</option><option v-for="item in inventory" :key="item.item_id" :value="item.item_id" :disabled="item.status !== 'available' || item.quantity < 1">{{ item.item_name }} ({{ item.quantity }} available)</option></select></label>
        <label>Borrower<select v-model="form.user" required class="field"><option value="">Choose a user</option><option v-for="person in users" :key="person.user_id" :value="person.user_id">{{ person.first_name }} {{ person.last_name }} (@{{ person.username }})</option></select></label>
        <label>Quantity<input v-model.number="form.quantity" class="field" type="number" min="1" :max="inventory.find(item => Number(item.item_id) === Number(form.item_id))?.quantity || undefined" required></label>
        <div class="form-action"><button class="primary">Create request</button></div>
      </form>
    </details>
    <p v-if="error" class="error"><XCircle :size="16" />{{ error }}</p>
    <div class="panel request-panel">
      <div class="request-heading"><div class="request-title"><h3>Borrowing requests</h3><p>Filter and manage equipment loans.</p></div><div class="request-controls"><label class="search-box"><Search :size="16" /><input v-model="search" placeholder="Search equipment, borrower or date"></label><label class="sort-control"><span>Sort by</span><select v-model="sortBy" aria-label="Sort transactions"><option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div></div>
      <div class="filters" aria-label="Filter transactions by status"><button v-for="filter in statusFilters" :key="filter.value" type="button" :class="['filter-button', { selected: selectedStatus === filter.value }]" :aria-pressed="selectedStatus === filter.value" @click="selectedStatus = filter.value">{{ filter.label }}<span>{{ countStatus(filter.value) }}</span></button></div>
      <div class="results-caption"><span>{{ filteredTransactions.length }} {{ filteredTransactions.length === 1 ? 'request' : 'requests' }} shown</span><span v-if="search || selectedStatus !== 'all'">Filtered from {{ transactions.length }} total</span></div>
      <TransactionTable :items="filteredTransactions" :highlight-transaction-id="highlightedTransactionId" staff :admin="isAdmin" @action="action" />
    </div>
    <Modal :open="Boolean(approvalError)" title="Cannot approve this request" @close="approvalError = ''">
      <div class="approval-error-dialog">
        <p role="alert">{{ approvalError }}</p>
        <div class="approval-error-actions">
          <button type="button" class="primary" autofocus @click="approvalError = ''">Okay</button>
        </div>
      </div>
    </Modal>
    <Modal :open="Boolean(returnTarget)" title="Confirm equipment return" @close="!approvingReturn && (returnTarget = null)">
      <div class="return-approval-dialog">
        <span class="return-approval-icon"><PackageCheck :size="19" /></span>
        <p>Approve the return of <strong>{{ returnTarget?.item_title || returnTarget?.item_name || 'this equipment' }}</strong>?</p>
        <p class="return-approval-note">Confirm that you physically inspected the equipment and all borrowed units are present. This will mark the item as returned and update its available stock.</p>
        <div class="return-approval-actions">
          <button type="button" class="return-approval-cancel" :disabled="approvingReturn" @click="returnTarget = null">Cancel</button>
          <button type="button" class="return-approval-confirm" :disabled="approvingReturn" @click="approveReturn">{{ approvingReturn ? 'Approving…' : 'Confirm return' }}</button>
        </div>
      </div>
    </Modal>
    <SuccessModal
      :open="Boolean(returnSuccessMessage)"
      title="Return completed"
      :message="returnSuccessMessage"
      @close="returnSuccessMessage = ''"
    />
    <Modal :open="Boolean(deleteTarget)" title="Delete borrowing request?" @close="deleteTarget = null">
      <div class="delete-confirmation">
        <p>
          Delete the borrowing request for
          <strong>{{ deleteTarget?.item_title || 'this equipment' }}</strong>
          from <strong>{{ deleteTarget?.user_full_name || deleteTarget?.user_username || 'the borrower' }}</strong>?
        </p>
        <p class="delete-warning">This permanently removes this request from the borrowing history.</p>
        <div class="delete-confirmation-actions">
          <button type="button" class="delete-cancel-button" :disabled="deleting" @click="deleteTarget = null">Cancel</button>
          <button type="button" class="delete-confirm-button" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete request' }}
          </button>
        </div>
      </div>
    </Modal>
  </section>
</template>

<style scoped>
.transactions-page { display: grid; gap: 18px; }
.transactions-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; padding: 4px 2px 2px; }
.intro-copy { display: grid; gap: 6px; }
.intro-eyebrow { display: inline-flex; align-items: center; gap: 7px; color: #c2410c; font-size: 10px; font-weight: 750; letter-spacing: .12em; }
.intro-copy h2 { margin: 0; color: #182436; font-size: clamp(24px, 3vw, 31px); font-weight: 750; letter-spacing: -.04em; line-height: 1.15; }
.intro-copy p { margin: 0; color: #748096; font-size: 13px; }
.total-requests { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 3px; border: 1px solid #e6ebf2; border-radius: 999px; background: #fff; padding: 9px 13px; color: #667085; font-size: 11px; font-weight: 600; white-space: nowrap; }
.total-dot { width: 8px; height: 8px; border-radius: 50%; background: #16a36a; box-shadow: 0 0 0 4px #e8f8f0; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-card { position: relative; display: flex; min-width: 0; min-height: 92px; align-items: center; gap: 12px; overflow: hidden; border: 1px solid #e8edf4; border-radius: 15px; background: #fff; padding: 16px; text-align: left; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.summary-card:hover { transform: translateY(-2px); border-color: #d5dce7; box-shadow: 0 8px 20px #1720330b; }
.summary-card.summary-selected { border-color: #fd4d01; box-shadow: 0 0 0 3px #fd4d0117; }
.summary-icon { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border-radius: 12px; }
.summary-copy { display: grid; gap: 5px; min-width: 0; }
.summary-copy span { overflow: hidden; color: #778397; font-size: 10px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.summary-copy strong { color: #202d40; font-size: 23px; font-weight: 750; line-height: 1; }
.summary-mark { position: absolute; right: -15px; bottom: -29px; width: 74px; height: 74px; border: 10px solid currentColor; border-radius: 50%; opacity: .055; }
.summary-card.pending { color: #d97706; }.summary-card.pending .summary-icon { background: #fff7e8; }
.summary-card.borrowed { color: #c2410c; }.summary-card.borrowed .summary-icon { background: #fff1e9; }
.summary-card.returning { color: #7c3aed; }.summary-card.returning .summary-icon { background: #f4efff; }
.summary-card.returned { color: #059669; }.summary-card.returned .summary-icon { background: #eafaf3; }
.approval-error-dialog p { margin: 0; border: 1px solid #ffe4e6; border-radius: 10px; background: #fff1f2; padding: 14px; color: #be123c; font-size: 14px; line-height: 1.6; }
.approval-error-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
.return-approval-dialog { display: grid; justify-items: start; gap: 12px; }
.return-approval-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; background: #eafaf3; color: #07845b; }
.return-approval-dialog > p { margin: 0; color: #475467; font-size: 13px; line-height: 1.55; }.return-approval-dialog > p strong { color: #202d40; }
.return-approval-dialog .return-approval-note { border-radius: 9px; background: #f8fafc; padding: 11px 12px; color: #748096; font-size: 11px; }
.return-approval-actions { display: flex; width: 100%; justify-content: flex-end; gap: 9px; margin-top: 3px; }
.return-approval-actions button { min-height: 40px; border-radius: 9px; padding: 0 13px; font-size: 11px; font-weight: 650; }
.return-approval-cancel { border: 1px solid #e4e9f0; background: white; color: #475467; }.return-approval-cancel:hover:not(:disabled) { background: #f8fafc; }
.return-approval-confirm { border: 1px solid #07845b; background: #07845b; color: white; }.return-approval-confirm:hover:not(:disabled) { border-color: #06734f; background: #06734f; }
.return-approval-actions button:disabled { cursor: wait; opacity: .65; }
.delete-confirmation { display: grid; gap: 12px; color: #475467; font-size: 14px; line-height: 1.6; }
.delete-confirmation p { margin: 0; }
.delete-confirmation strong { color: #172033; }
.delete-warning { border-radius: 8px; background: #fff7ed; padding: 10px 12px; color: #9a3412; font-size: 12px; }
.delete-confirmation-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding-top: 6px; }
.delete-confirmation-actions button { display: inline-flex; min-height: 42px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 9px; padding: 0 16px; font-size: 13px; font-weight: 650; white-space: nowrap; }
.delete-cancel-button { min-width: 96px; border: 1px solid #d0d5dd; background: white; color: #475467; }
.delete-cancel-button:hover:not(:disabled) { background: #f8fafc; }
.delete-confirmation button:disabled { cursor: wait; opacity: .65; }
.delete-confirm-button { min-width: 142px; border: 1px solid #be123c; background: #be123c; color: white; }
.delete-confirm-button:hover:not(:disabled) { border-color: #9f1239; background: #9f1239; }
.create-panel { overflow: hidden; padding: 0; }.create-panel summary { display: flex; min-height: 70px; align-items: center; gap: 12px; padding: 10px 17px; color: #c2410c; cursor: pointer; list-style: none; }.create-panel summary::-webkit-details-marker { display: none; }
.create-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 11px; background: #fff1e9; }
.create-copy { display: grid; gap: 3px; }.create-copy strong { font-size: 12px; font-weight: 700; }.create-copy small { color: #818da0; font-size: 10px; }
.create-toggle { display: grid; width: 28px; height: 28px; place-items: center; margin-left: auto; border: 1px solid #f0d9ca; border-radius: 9px; color: #c2410c; font-size: 20px; line-height: 1; transition: transform .18s ease; }.create-panel[open] .create-toggle { transform: rotate(45deg); }
.request-panel { overflow: hidden; padding: 20px; }
.request-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.request-heading h3 { margin: 0 0 4px; color: #273449; font-size: 16px; font-weight: 700; }
.request-title p { margin: 0; color: #778397; font-size: 11px; }
.form-grid { display: grid; grid-template-columns: 1.2fr 1.4fr .65fr auto; align-items: end; gap: 12px; }.form-grid label { display: grid; gap: 6px; color: #667085; font-size: 10px; font-weight: 650; }.field { width: 100%; }.form-action .primary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; }
.form-grid { padding: 0 17px 17px; }
.error { display: flex; align-items: center; gap: 7px; margin: 0; color: #be123c; font-size: 12px; }
.request-heading { margin-bottom: 15px; }.request-controls { display: flex; align-items: center; gap: 8px; }.search-box { display: flex; width: min(100%, 285px); min-height: 40px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 11px; color: #98a2b3; }.search-box input { width: 100%; border: 0; outline: 0; color: #344054; font-size: 11px; }.sort-control { display: flex; min-height: 40px; align-items: center; gap: 7px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 10px; color: #667085; font-size: 11px; white-space: nowrap; }.sort-control select { max-width: 165px; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.filters { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 0; border-bottom: 1px solid #e9edf3; }.filter-button { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; border: 0; border-bottom: 2px solid transparent; background: none; padding: 11px 10px; color: #667085; font-size: 10px; transition: color .16s ease, border-color .16s ease; }.filter-button span { border-radius: 20px; background: #f1f5f9; padding: 3px 7px; color: #788397; font-size: 9px; }.filter-button.selected { border-bottom-color: #fd4d01; color: #bd3a00; font-weight: 700; }.filter-button.selected span { background: #fff1e9; color: #c2410c; }
.results-caption { display: flex; justify-content: space-between; gap: 12px; padding: 12px 2px 8px; color: #8792a4; font-size: 10px; }
:deep(.table-scroll) { border: 1px solid #e9edf3; border-radius: 12px; }
:deep(.table) { min-width: 720px; }
:deep(.table th) { border-bottom-color: #e9edf3; background: #f8fafc; padding: 13px 14px; color: #738096; font-size: 10px; font-weight: 700; letter-spacing: .055em; text-transform: uppercase; }
:deep(.table td) { padding: 14px; color: #334155; font-size: 12px; }
:deep(.table tbody tr:last-child td) { border-bottom: 0; }
:deep(.table tbody tr:not(:last-child):hover) { background: #fbfcfe; }
:deep(.table .empty) { padding: 36px 14px; color: #8490a2; }
@media (max-width: 900px) { .form-grid { grid-template-columns: 1fr 1fr; }.form-action { grid-column: 1 / -1; }.form-action .primary { width: 100%; } }
@media (max-width: 1000px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 800px) { .request-heading { align-items: stretch; flex-direction: column; }.request-controls { flex-wrap: wrap; }.request-controls .search-box { flex: 1 1 220px; width: 100%; }.sort-control { flex: 1 1 220px; justify-content: space-between; }.sort-control select { max-width: none; } }
@media (max-width: 600px) { .transactions-page { gap: 13px; }.transactions-intro { align-items: flex-start; flex-direction: column; }.total-requests { margin-bottom: 0; }.summary-grid { gap: 9px; }.summary-card { min-height: 82px; gap: 9px; padding: 12px; }.summary-icon { width: 34px; height: 34px; }.summary-copy span { font-size: 9px; }.summary-copy strong { font-size: 20px; }.request-panel { padding: 14px; }.form-grid { grid-template-columns: 1fr; }.form-action { grid-column: auto; }.request-controls { align-items: stretch; flex-direction: column; }.request-controls .search-box, .sort-control { width: 100%; flex: auto; }.results-caption { padding-top: 10px; } }
</style>
