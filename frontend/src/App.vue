<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import AuthView from './views/AuthView.vue'
import AdminDashboard from './views/admin/AdminDashboard.vue'
import CategoryCrudView from './views/admin/CategoryCrudView.vue'
import InventoryCrudView from './views/admin/InventoryCrudView.vue'
import TransactionsView from './views/admin/TransactionsView.vue'
import UsersCrudView from './views/admin/UsersCrudView.vue'
import BorrowCatalogView from './views/user/BorrowCatalogView.vue'
import MyBorrowHistoryView from './views/user/MyBorrowHistoryView.vue'
import UserProfileView from './views/user/UserProfileView.vue'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import Modal from './components/Modal.vue'
import SuccessModal from './components/SuccessModal.vue'

const { user, loading, isStaff, logout, refreshUser } = useAuth()
const tab = ref('dashboard')
const logoutConfirmationOpen = ref(false)
const loginWelcomeMessage = ref('')
const titles = { dashboard: 'Dashboard', inventory: 'Inventory', categories: 'Categories', transactions: 'Transactions', users: 'Users & Staff', catalog: 'Borrow Equipment', history: 'My Borrow History', profile: 'My Profile' }
const activeView = computed(() => ({ dashboard: AdminDashboard, inventory: InventoryCrudView, categories: CategoryCrudView, transactions: TransactionsView, users: UsersCrudView, catalog: BorrowCatalogView, history: MyBorrowHistoryView, profile: UserProfileView })[tab.value])
const title = computed(() => titles[tab.value] || 'Dashboard')
function navigate(next) { tab.value = next }
function openNotification(notification) {
  if (!notification.transaction_id) return
  tab.value = isStaff.value ? 'transactions' : 'history'
  if (isStaff.value) {
    nextTick(() => {
      window.dispatchEvent(new CustomEvent('transactions:notification-open', {
        detail: notification,
      }))
    })
  }
}
function handleLogout() {
  logoutConfirmationOpen.value = false
  loginWelcomeMessage.value = ''
  logout()
  tab.value = 'dashboard'
}
function confirmLogout() { logoutConfirmationOpen.value = true }
function handleLoginSuccess(event) {
  const name = event.detail?.first_name || event.detail?.username
  loginWelcomeMessage.value = `You have successfully logged in${name ? `, welcome ${name}` : ''}.`
}
watch(() => Boolean(user.value), (isLoggedIn) => {
  if (isLoggedIn) tab.value = isStaff.value ? 'dashboard' : 'catalog'
})
onMounted(() => {
  refreshUser()
  window.addEventListener('auth:unauthorized', handleLogout)
  window.addEventListener('auth:login-success', handleLoginSuccess)
})
onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleLogout)
  window.removeEventListener('auth:login-success', handleLoginSuccess)
})
</script>

<template>
  <div v-if="loading" class="loading-screen"><div class="loading-mark">CSU</div><p>Connecting to CSU COEA Lab Borrowing System…</p></div>
  <AuthView v-else-if="!user" />
  <div v-else class="app-shell">
    <Sidebar :current-tab="tab" :user="user" @navigate="navigate" @logout="confirmLogout" />
    <main class="workspace">
      <Navbar :title="title" @open-notification="openNotification" />
      <Transition name="page" mode="out-in">
        <div :key="tab" class="page-content"><component :is="activeView" /></div>
      </Transition>
      <footer class="workspace-footer">CSU COEA <span>·</span> LAB BORROWING SYSTEM</footer>
    </main>
    <Modal :open="logoutConfirmationOpen" title="Sign out" @close="logoutConfirmationOpen = false">
      <div class="logout-confirmation">
        <p>Are you sure you want to sign out?</p>
        <div class="logout-confirmation-actions">
          <button type="button" class="logout-cancel" @click="logoutConfirmationOpen = false">Cancel</button>
          <button type="button" class="logout-confirm" @click="handleLogout">Sign out</button>
        </div>
      </div>
    </Modal>
    <SuccessModal
      :open="Boolean(loginWelcomeMessage)"
      title="Login successful"
      :message="loginWelcomeMessage"
      @close="loginWelcomeMessage = ''"
    />
  </div>
</template>

<style scoped>
.logout-confirmation p {
  margin: 0;
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
}

.logout-confirmation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.logout-cancel,
.logout-confirm {
  min-height: 40px;
  border-radius: 9px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
}

.logout-cancel {
  border: 1px solid #e4e9f0;
  background: white;
  color: #475467;
}

.logout-confirm {
  border: 1px solid #be123c;
  background: #be123c;
  color: white;
}

.logout-cancel:hover {
  background: #f8fafc;
}

.logout-confirm:hover {
  border-color: #9f1239;
  background: #9f1239;
}
</style>
