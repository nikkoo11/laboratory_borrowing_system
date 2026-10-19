<script setup>
import { computed } from 'vue'
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Tags,
  UsersRound,
  UserRound,
} from 'lucide-vue-next'

const props = defineProps({ currentTab: { type: String, required: true }, user: { type: Object, required: true } })
const emit = defineEmits(['navigate', 'logout'])
const isStaff = computed(() => ['ADMIN', 'STAFF'].includes(props.user.role))
const isAdmin = computed(() => props.user.role === 'ADMIN')
const items = computed(() => isStaff.value
  ? [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'categories', label: 'Categories', icon: Tags },
      { id: 'transactions', label: 'Transactions', icon: ClipboardList },
      ...(isAdmin.value ? [{ id: 'users', label: 'Users & Staff', icon: UsersRound }] : []),
    ]
  : [
      { id: 'catalog', label: 'Borrow equipment', icon: PackageSearch },
      { id: 'history', label: 'Borrow history', icon: ClipboardList },
      { id: 'profile', label: 'My profile', icon: UserRound },
    ])
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <img src="/logo.png" alt="" class="brand-seal">
      <div><strong>CSU COEA</strong><span>LAB BORROWING SYSTEM</span></div>
    </div>
    <p class="nav-caption">{{ isStaff ? 'WORKSPACE' : 'STUDENT PORTAL' }}</p>
    <nav class="nav-list" :aria-label="isStaff ? 'Admin navigation' : 'Student navigation'">
      <button
        v-for="item in items"
        :key="item.id"
        :class="['nav-item', { 'nav-item-active': currentTab === item.id }]"
        :aria-current="currentTab === item.id ? 'page' : undefined"
        @click="emit('navigate', item.id)"
      >
        <component :is="item.icon" :size="18" :stroke-width="1.8" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="sidebar-account">
      <div class="account-avatar">{{ (user.first_name || user.username || 'U').slice(0, 1).toUpperCase() }}</div>
      <div class="account-info"><strong>{{ user.first_name || user.username }}</strong><span>{{ user.role }}</span></div>
      <button class="logout-button" aria-label="Sign out" title="Sign out" @click="emit('logout')"><LogOut :size="17" /></button>
    </div>
  </aside>
</template>
