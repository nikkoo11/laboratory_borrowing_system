<script setup>
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  closeOnEscape: { type: Boolean, default: true },
  closeOnAnyClick: { type: Boolean, default: false },
  dialogClass: { type: String, default: '' },
})
const emit = defineEmits(['close'])
function handleClick(event) {
  if (props.closeOnAnyClick || event.target === event.currentTarget) emit('close')
}
const closeOnEscape = (event) => {
  if (props.open && props.closeOnEscape && event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', closeOnEscape))
onUnmounted(() => window.removeEventListener('keydown', closeOnEscape))
</script>
<template>
  <Transition name="modal">
    <div v-if="open" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" @click="handleClick">
      <section :class="['modal-card w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl', dialogClass]"><header class="flex min-h-[68px] items-center justify-between border-b border-slate-200 px-5 py-3"><h3 class="font-semibold text-slate-900">{{ title }}</h3><button type="button" aria-label="Close dialog" title="Close" class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2" @click.stop="emit('close')"><X :size="21" :stroke-width="2" /></button></header><div class="modal-content p-6"><slot /></div></section>
    </div>
  </Transition>
</template>
<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity .18s ease;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: opacity .18s ease, transform .18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: translateY(10px) scale(.98);
  opacity: 0;
}
</style>
