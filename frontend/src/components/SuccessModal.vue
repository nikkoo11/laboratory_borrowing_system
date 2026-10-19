<script setup>
import Modal from './Modal.vue'

defineProps({
  open: Boolean,
  title: { type: String, default: 'Changes saved' },
  message: { type: String, required: true },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Modal :open="open" :title="title" close-on-any-click @close="emit('close')">
    <div class="success-content">
      <p role="status">{{ message }}</p>
      <div class="success-actions">
        <button type="button" class="primary" autofocus @click="emit('close')">Okay</button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.success-content p {
  margin: 0;
  border: 1px solid #d1fae5;
  border-radius: 9px;
  background: #ecfdf5;
  padding: 13px;
  color: #047857;
  font-size: 14px;
  line-height: 1.6;
}

.success-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
