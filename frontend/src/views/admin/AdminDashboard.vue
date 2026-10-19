<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../api/client'
import TransactionTable from '../shared/TransactionTable.vue'
import { Boxes, ClipboardCheck, Clock3, Search } from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'
import Modal from '../../components/Modal.vue'
import SuccessModal from '../../components/SuccessModal.vue'
const inventory = ref([]), transactions = ref([]), error = ref('')
const approvalError = ref('')
const returnSuccessMessage = ref('')
const returnTarget = ref(null), approvingReturn = ref(false)
const deleteTarget = ref(null), deleting = ref(false)
const search = ref('')
const { isAdmin } = useAuth()
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
const matchingTransactions = computed(() => {
  const query = search.value.trim().toLowerCase()
  return transactions.value.filter((transaction) => {
    if (!query) return true
    return [
      transaction.item_title,
      transaction.item_name,
      transaction.item?.item_name,
      transaction.user_full_name,
      transaction.user_username,
      transaction.user_name,
      transaction.user?.username,
    ].some((value) => value?.toLowerCase().includes(query))
      || matchesBorrowDate(transaction, query)
  })
})
const returnRequests = computed(() => matchingTransactions.value.filter((transaction) => transaction.status === 'return_requested'))
const recentRequests = computed(() => search.value.trim()
  ? matchingTransactions.value
  : matchingTransactions.value.slice(0, 8))
async function load() {
  try {
    [inventory.value, transactions.value] = (await Promise.all([api.get('/inventory/'), api.get('/transactions/')])).map(r => r.data)
    error.value = ''
  } catch {
    error.value = 'Unable to load dashboard data.'
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
    const data = e.response?.data
    error.value = data?.message || data?.detail || 'Unable to delete this borrowing request.'
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
    const data = e.response?.data
    let message
    if (data?.message || data?.detail) {
      message = data.message || data.detail
    } else if (e.response?.status) {
      message = `Unable to ${name} this request (HTTP ${e.response.status}).`
    } else if (e.request) {
      message = 'Cannot reach the API. Check that the backend server is running and try again.'
    } else {
      message = e.message || 'Unable to update this request.'
    }
    if (name === 'approve') {
      approvalError.value = /unavailable|under maintenance/i.test(message)
        ? `${message} The request has not been approved. Update the equipment availability or ask the borrower to choose another item.`
        : message
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
    const data = e.response?.data
    error.value = data?.message || data?.detail || (e.response?.status
      ? `Return failed (HTTP ${e.response.status}).`
      : e.request
        ? 'Cannot reach the API. Check that the backend server is running and try again.'
        : e.message || 'Return failed.')
    returnTarget.value = null
  } finally {
    approvingReturn.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="dashboard">
    <header class="dashboard-intro">
      <span class="dashboard-eyebrow">LABORATORY OVERVIEW</span>
      <h2>Laboratory at a glance</h2>
      <p>Here is what is happening with laboratory equipment and borrowing requests.</p>
    </header>
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-icon inventory-icon"><Boxes :size="19" /></div><span class="stat-label">Equipment items</span><strong>{{ inventory.length }}</strong><span class="stat-note">Registered in inventory</span></article>
      <article class="stat-card"><div class="stat-icon pending-icon"><Clock3 :size="19" /></div><span class="stat-label">Pending requests</span><strong>{{ transactions.filter(x => x.status === 'pending').length }}</strong><span class="stat-note">Waiting for review</span></article>
      <article class="stat-card"><div class="stat-icon active-icon"><ClipboardCheck :size="19" /></div><span class="stat-label">Using equipment</span><strong>{{ transactions.filter(x => x.status === 'approved').length }}</strong><span class="stat-note">Currently on loan</span></article>
    </div>
    <p v-if="error" class="dashboard-error">{{ error }}</p>
    <div v-if="returnRequests.length" class="panel recent-panel return-queue">
      <div class="section-heading"><h2>Return requests awaiting inspection</h2><span class="record-count">{{ returnRequests.length }} matching</span></div>
      <TransactionTable :items="returnRequests" staff :admin="isAdmin" @action="action" />
    </div>
    <div class="panel recent-panel">
      <div class="section-heading">
        <h2>Recent requests</h2>
        <div class="request-tools">
          <label class="dashboard-search"><Search :size="16" aria-hidden="true" /><input v-model="search" aria-label="Search dashboard requests" placeholder="Search equipment, borrower, or date"></label>
          <span class="record-count">{{ search.trim() ? `${recentRequests.length} matching` : `${transactions.length} total` }}</span>
        </div>
      </div>
      <TransactionTable :items="recentRequests" staff :admin="isAdmin" @action="action" />
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
        <span class="return-approval-icon"><ClipboardCheck :size="19" /></span>
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
.dashboard { display: grid; gap: 18px; }
.dashboard-intro { position: relative; overflow: hidden; border: 1px solid #f2d8c8; border-radius: 17px; background: radial-gradient(ellipse at 95% 15%, rgb(255 255 255 / 85%), transparent 34%), linear-gradient(115deg, #fff4ec, #fffaf6 72%, #f8e8da); padding: 22px 25px; }
.dashboard-intro::after { position: absolute; right: 55px; bottom: -75px; width: 160px; height: 160px; border: 1px solid rgb(194 65 12 / 10%); border-radius: 50%; content: ''; }
.dashboard-eyebrow { color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.dashboard-intro h2 { position: relative; z-index: 1; margin: 7px 0 5px; color: #34261f; font-size: clamp(21px, 2.6vw, 28px); font-weight: 760; letter-spacing: -.04em; }
.dashboard-intro p { position: relative; z-index: 1; margin: 0; color: #806b5c; font-size: 12px; }
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
.intro { margin: 0; color: #667085; font-size: 13px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-card { display: grid; grid-template-columns: 42px 1fr; align-items: center; column-gap: 12px; border: 1px solid #e8edf4; border-radius: 15px; background: white; padding: 17px; box-shadow: 0 4px 15px rgb(16 24 40 / 3%); transition: transform .18s ease, box-shadow .18s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgb(16 24 40 / 7%); }
.stat-icon { display: grid; width: 39px; height: 39px; grid-row: span 3; place-items: center; border-radius: 12px; }
.inventory-icon { background: #fff1e9; color: #c2410c; }.pending-icon { background: #eff6ff; color: #2563eb; }.active-icon { background: #ecfdf5; color: #059669; }
.stat-label { color: #667085; font-size: 11px; }.stat-card strong { margin-top: 2px; color: #172033; font-size: 23px; font-weight: 750; letter-spacing: -.04em; }.stat-note { color: #98a2b3; font-size: 10px; }
.recent-panel { overflow: hidden; padding: 19px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.section-heading h2 { margin: 0; color: #273449; font-size: 14px; font-weight: 700; }
.request-tools { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 9px; }
.dashboard-search { display: flex; width: min(100%, 270px); min-height: 36px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 9px; padding: 0 10px; color: #98a2b3; transition: border-color .15s ease, box-shadow .15s ease; }
.dashboard-search:focus-within { border-color: #fb923c; box-shadow: 0 0 0 3px rgb(251 146 60 / 14%); }
.dashboard-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.record-count { border-radius: 20px; background: #f1f5f9; padding: 6px 10px; color: #667085; font-size: 10px; }
.dashboard-error { margin: 0; color: #be123c; font-size: 12px; }
:deep(.table-scroll) { border: 1px solid #e9edf3; border-radius: 12px; }
:deep(.table th) { background: #f8fafc; padding-top: 12px; padding-bottom: 12px; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
:deep(.table td) { padding-top: 13px; padding-bottom: 13px; font-size: 12px; }
@media (max-width: 700px) { .stats-grid { grid-template-columns: 1fr; gap: 8px; }.stat-card { padding: 11px; }.section-heading { align-items: stretch; flex-direction: column; }.request-tools { justify-content: space-between; }.dashboard-search { flex: 1; width: auto; } }
@media (max-width: 440px) { .request-tools { align-items: stretch; flex-direction: column; }.dashboard-search { width: 100%; }.record-count { align-self: flex-start; } }
</style>
