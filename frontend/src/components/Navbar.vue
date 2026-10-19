<script setup>
import { ChevronRight } from 'lucide-vue-next'
import NotificationBell from './NotificationBell.vue'
defineProps({ title: { type: String, default: '' } })
const emit = defineEmits(['open-notification'])
</script>
<template>
  <header class="topbar">
    <div class="page-heading">
      <p class="breadcrumb">Laboratory <ChevronRight :size="13" /> <span>{{ title }}</span></p>
      <h1>{{ title }}</h1>
    </div>
    <div class="topbar-actions">
      <div class="today-label"><span class="online-dot"></span> Laboratory portal</div>
      <div class="notification-wrap"><NotificationBell @open-notification="emit('open-notification', $event)" /></div>
    </div>
  </header>
</template>
