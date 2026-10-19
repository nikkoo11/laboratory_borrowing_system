<script setup>
defineProps({ type: { type: String, default: 'error' }, message: { type: String, default: '' } })
</script>
<template><p v-if="message" :class="['alert', type === 'success' ? 'success' : 'error']">{{ message }}</p></template>
<style scoped>
@reference "../index.css";
.alert { @apply rounded-lg border p-3 text-sm; }.success { @apply border-emerald-100 bg-emerald-50 text-emerald-700; }.error { @apply border-rose-100 bg-rose-50 text-rose-700; }
</style>
