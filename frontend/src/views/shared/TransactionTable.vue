<script setup>
import { computed } from 'vue'
import { Check, Trash2, X } from 'lucide-vue-next'
import StatusBadge from '../../components/StatusBadge.vue'
const props = defineProps({ items: { type: Array, default: () => [] }, staff: Boolean, admin: Boolean, owner: Boolean, highlightTransactionId: { type: [Number, String], default: null } })
const emit = defineEmits(['action'])
const showActions = computed(() => props.staff || (
  props.owner && props.items.some((transaction) =>
    ['pending', 'approved', 'return_requested'].includes(transaction.status))
))
function formatBorrowedOn(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
</script>
<template>
  <div class="table-scroll">
    <table class="table">
      <thead>
        <tr>
          <th>Equipment</th>
          <th>Borrower</th>
          <th>Quantity</th>
          <th>Borrowed on</th>
          <th>Status</th>
          <th v-if="showActions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="tx in items"
          :id="`transaction-${tx.transaction_id}`"
          :key="tx.transaction_id"
          :class="{ 'highlighted-transaction': Number(highlightTransactionId) === Number(tx.transaction_id) }"
        >
          <td>{{ tx.item_title || tx.item_name || tx.item?.item_name || 'Equipment' }}</td>
          <td>{{ tx.user_full_name || tx.user_username || tx.user_name || tx.user?.username || 'You' }}</td>
          <td>{{ tx.quantity ?? '—' }}</td>
          <td>{{ formatBorrowedOn(tx.borrow_datetime || tx.borrow_date) }}</td>
          <td><StatusBadge :status="tx.status" /></td>
          <td v-if="showActions" class="actions">
            <button
              v-if="staff && tx.status === 'pending'"
              class="icon-action approve-action"
              :aria-label="`Approve ${tx.item_title || 'borrow request'}`"
              title="Approve request"
              @click="emit('action', tx, 'approve')"
            ><Check :size="16" /></button>
            <button
              v-if="staff && tx.status === 'pending'"
              class="icon-action reject-action"
              :aria-label="`Reject ${tx.item_title || 'borrow request'}`"
              title="Reject request"
              @click="emit('action', tx, 'reject')"
            ><X :size="16" /></button>
            <button
              v-if="owner && tx.status === 'approved'"
              class="return-item-button"
              @click="emit('action', tx, 'request-return')"
            >Return item</button>
            <span v-if="owner && tx.status === 'return_requested'" class="action-note">
              Awaiting staff inspection
            </span>
            <button
              v-if="staff && tx.status === 'return_requested'"
              class="approve-return-button"
              :aria-label="`Approve return of ${tx.item_title || 'equipment'} after inspection`"
              title="Approve return after physical inspection"
              @click="emit('action', tx, 'return')"
            ><Check :size="15" /> Approve return</button>
            <button
              v-if="admin && tx.status !== 'approved' && tx.status !== 'return_requested'"
              class="icon-action delete-action"
              :aria-label="`Delete ${tx.item_title || 'borrow request'}`"
              title="Delete request"
              @click="emit('action', tx, 'delete')"
            ><Trash2 :size="15" /></button>
            <button
              v-if="owner && tx.status === 'pending'"
              class="link"
              @click="emit('action', tx, 'edit')"
            >Edit</button>
            <button
              v-if="owner && tx.status === 'pending'"
              class="danger"
              @click="emit('action', tx, 'cancel')"
            >Cancel</button>
          </td>
        </tr>
        <tr v-if="!items.length">
          <td :colspan="showActions ? 6 : 5" class="empty">No transactions found.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
@reference "../../index.css";
.table-scroll { @apply w-full overflow-x-auto; }.table { @apply w-full min-w-[640px] text-left text-sm; }.table th { @apply border-b border-slate-200 px-3 py-3 text-xs font-medium text-slate-500; }.table td { @apply border-b border-slate-100 px-3 py-3; }.highlighted-transaction { @apply bg-orange-50 ring-2 ring-inset ring-orange-300; }.actions { @apply flex items-center gap-2 whitespace-nowrap; }.action-note { @apply text-xs font-medium text-slate-500; }.link { @apply text-sm font-medium text-orange-700 hover:text-orange-900; }.danger { @apply text-sm font-medium text-rose-600 hover:text-rose-800; }.icon-action { @apply inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition; }.approve-action:hover { @apply border-emerald-200 bg-emerald-50 text-emerald-700; }.reject-action:hover, .delete-action:hover { @apply border-rose-200 bg-rose-50 text-rose-700; }.return-item-button { @apply inline-flex h-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100; }.approve-return-button { @apply inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100; }.empty { @apply py-8 text-center text-slate-500; }
</style>
