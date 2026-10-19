<script setup>
import { computed } from 'vue'
const props = defineProps({ status: { type: String, required: true } })
const labels = { approved: 'Using', return_requested: 'Return requested' }
const label = computed(() => labels[props.status] || props.status)
</script>
<template><span :class="['badge', status]">{{ label }}</span></template>
<style scoped>
@reference "../index.css";
.badge { @apply inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 capitalize; }.pending { @apply bg-sky-50 text-sky-700; }.active, .approved { @apply bg-orange-50 text-orange-700; }.return_requested { @apply bg-violet-50 text-violet-700; }.returned { @apply bg-emerald-50 text-emerald-700; }.rejected { @apply bg-rose-50 text-rose-700; }
</style>
