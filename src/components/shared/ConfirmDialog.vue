<template>
  <Teleport to="body">
    <div v-if="modelValue" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-dialog">
        <div class="confirm-icon">{{ icon }}</div>
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancel">{{ cancelText }}</button>
          <button :class="['btn', confirmClass]" @click="onConfirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const { 
  modelValue, 
  title = '¿Confirmar acción?', 
  message = '¿Estás seguro de que deseas continuar?', 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  confirmClass = 'btn-danger', 
  icon = '⚠️' 
} = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: '¿Confirmar acción?' },
  message: { type: String, default: '¿Estás seguro de que deseas continuar?' },
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  confirmClass: { type: String, default: 'btn-danger' },
  icon: { type: String, default: '⚠️' }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function onConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  background: var(--color-white);
  border-radius: var(--radius-md);
  padding: 28px 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: var(--shadow-md);
  animation: dialogIn 0.15s ease;
}

@keyframes dialogIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.confirm-icon { 
  font-size: 36px; 
  margin-bottom: 12px; 
}

.confirm-title { 
  font-size: 17px; 
  font-weight: 700; 
  color: var(--color-text); 
  margin-bottom: 8px; 
}

.confirm-message { 
  font-size: 13px; 
  color: var(--color-text-muted); 
  margin-bottom: 20px; 
  line-height: 1.5; 
}

.confirm-actions { 
  display: flex; 
  gap: 10px; 
  justify-content: center; 
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
}

.btn-secondary {
  background: var(--color-white);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-bg);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.btn-danger:hover {
  background: #c62828;
}
</style>
