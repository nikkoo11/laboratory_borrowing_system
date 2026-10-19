<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bell, Trash2 } from 'lucide-vue-next'
import api from '../api/client'

const notifications = ref([]), open = ref(false), error = ref(''), soundError = ref('')
const notificationContainer = ref(null)
const emit = defineEmits(['open-notification'])
const unread = computed(() => notifications.value.filter((item) => !item.is_read).length)
const readCount = computed(() => notifications.value.length - unread.value)
const notificationSound = new Audio('/notification.mp3')
notificationSound.preload = 'auto'
let hasLoadedNotifications = false
async function load() {
  try {
    const loadedNotifications = (await api.get('/notifications/')).data || []
    const existingIds = new Set(notifications.value.map((item) => item.notification_id))
    const hasNewUnreadNotification = hasLoadedNotifications
      && loadedNotifications.some((item) => !item.is_read && !existingIds.has(item.notification_id))
    notifications.value = loadedNotifications
    hasLoadedNotifications = true
    error.value = ''
    if (hasNewUnreadNotification) {
      notificationSound.currentTime = 0
      notificationSound.play().then(() => {
        soundError.value = ''
      }).catch(() => {
        soundError.value = 'Notification sound could not be played. Check your browser audio settings.'
      })
    }
  } catch {
    error.value = 'Unable to load notifications.'
  }
}
async function markRead(item) {
  await api.patch(`/notifications/${item.notification_id}/read/`)
  await load()
}
async function markAllRead() {
  try {
    await api.patch('/notifications/read/')
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || e.response?.data?.detail || 'Unable to mark all notifications as read.'
  }
}
async function deleteNotification(item) {
  try {
    await api.delete(`/notifications/${item.notification_id}/`)
    notifications.value = notifications.value.filter(
      (notification) => notification.notification_id !== item.notification_id,
    )
    error.value = ''
  } catch (e) {
    error.value = e.response?.data?.message || e.response?.data?.detail || 'Unable to delete this notification.'
  }
}
async function deleteAllRead() {
  try {
    await api.delete('/notifications/read/')
    notifications.value = notifications.value.filter((item) => !item.is_read)
    error.value = ''
  } catch (e) {
    error.value = e.response?.data?.message || e.response?.data?.detail || 'Unable to delete read notifications.'
  }
}
async function openNotification(item) {
  try {
    if (!item.is_read) await markRead(item)
    open.value = false
    emit('open-notification', item)
  } catch {
    error.value = 'Could not mark this notification as read. Opening its transaction anyway.'
    open.value = false
    emit('open-notification', item)
  }
}
let interval
function closeOnOutsideClick(event) {
  if (open.value && !notificationContainer.value?.contains(event.target)) {
    open.value = false
  }
}
onMounted(() => {
  load()
  interval = window.setInterval(load, 30000)
  document.addEventListener('pointerdown', closeOnOutsideClick)
})
onUnmounted(() => {
  window.clearInterval(interval)
  document.removeEventListener('pointerdown', closeOnOutsideClick)
})
</script>
<template>
  <div ref="notificationContainer" class="notification-container" @keydown.esc="open = false">
    <button
      type="button"
      class="notification-button"
      aria-label="Notifications"
      aria-controls="notification-panel"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Bell :size="19" aria-hidden="true" />
      <span v-if="unread" class="count" :aria-label="`${unread} unread notifications`">
        {{ unread }}
      </span>
    </button>

    <Transition name="notification">
      <section
        v-if="open"
        id="notification-panel"
        class="notification-panel"
        aria-label="Notifications"
      >
        <header class="notification-header">
          <h2 class="notification-title">Notifications</h2>
          <div class="notification-actions">
            <button v-if="unread" type="button" class="mark-all-read" @click="markAllRead">
              Mark all read
            </button>
            <button v-if="readCount" type="button" class="delete-all-read" @click="deleteAllRead">
              Delete all read
            </button>
          </div>
        </header>

        <p v-if="error" class="notification-message notification-error" role="alert">
          {{ error }}
        </p>
        <p v-if="soundError" class="notification-message notification-error" role="status">
          {{ soundError }}
        </p>

        <div v-if="notifications.length" class="notification-list">
          <article
            v-for="item in notifications"
            :key="item.notification_id"
            :class="['notification-row', { unread: !item.is_read }]"
          >
            <button type="button" class="notification-item" @click="openNotification(item)">
              {{ item.message }}
            </button>
            <button
              type="button"
              class="delete-notification"
              :aria-label="`Delete notification: ${item.title}`"
              title="Delete notification"
              @click="deleteNotification(item)"
            >
              <Trash2 :size="15" aria-hidden="true" />
            </button>
          </article>
        </div>
        <p v-else-if="!error" class="notification-empty">No notifications.</p>
      </section>
    </Transition>
  </div>
</template>
<style scoped>
@reference "../index.css";

.notification-enter-active,
.notification-leave-active {
  transition: opacity .16s ease, transform .16s ease;
  transform-origin: top right;
}

.notification-enter-from,
.notification-leave-to {
  transform: translateY(-6px) scale(.98);
  opacity: 0;
}

.notification-container {
  position: relative;
}

.notification-button {
  @apply relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700;
}

.notification-button:focus-visible,
.notification-actions button:focus-visible,
.notification-item:focus-visible,
.delete-notification:focus-visible {
  @apply outline-2 outline-offset-2 outline-orange-600;
}

.count {
  @apply absolute -right-1 -top-1 min-w-5 rounded-full bg-orange-600 px-1 text-center text-[10px] font-semibold text-white;
}

.notification-panel {
  @apply absolute right-0 z-30 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl;
  box-sizing: border-box;
  width: min(24rem, calc(100vw - 2rem));
  max-height: calc(100vh - 6rem);
}

.notification-header {
  @apply grid gap-3 border-b border-slate-100 px-4 py-3;
}

.notification-title {
  @apply m-0 text-sm font-semibold text-slate-900;
}

.notification-actions {
  @apply flex flex-wrap items-center justify-between gap-x-3 gap-y-2;
}

.mark-all-read,
.delete-all-read {
  @apply text-xs font-semibold text-orange-700 hover:text-orange-900;
}

.delete-all-read {
  @apply text-rose-600 hover:text-rose-800;
}

.notification-list {
  @apply overflow-y-auto px-4;
  max-height: calc(100vh - 12rem);
}

.notification-row {
  @apply flex items-start gap-2 border-b border-slate-100 py-1 last:border-b-0;
}

.notification-item {
  @apply block min-w-0 flex-1 py-2 text-left text-sm leading-5 text-slate-600 hover:text-orange-700;
  overflow-wrap: break-word;
}

.notification-row.unread .notification-item {
  @apply font-bold text-slate-900;
}

.delete-notification {
  @apply mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700;
}

.notification-message {
  @apply m-3 rounded-md p-2 text-xs;
}

.notification-error {
  @apply bg-amber-50 text-amber-800;
}

.notification-empty {
  @apply m-0 px-4 py-6 text-center text-sm text-slate-500;
}
</style>
