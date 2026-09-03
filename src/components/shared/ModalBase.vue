<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" :style="{ zIndex: zIndex }" @click.self="close">
        <transition name="modal-slide">
          <div v-if="modelValue" class="modal-box" :style="{ maxWidth: width }">
            <div class="modal-header">
              <h3>{{ title }}</h3>
              <button class="modal-close" @click="close">✕</button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
            <div class="modal-footer" v-if="$slots.footer">
              <slot name="footer" />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '480px' },
  zIndex: { type: Number, default: 1000 }
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(44, 32, 24, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-box {
  background: var(--color-white);
  border-radius: var(--radius-xl);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(to bottom, rgba(200, 149, 108, 0.03), transparent);
}

.modal-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.modal-close {
  background: var(--color-bg);
  color: var(--color-text-muted);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  cursor: pointer;
  border: 1px solid transparent;
}

.modal-close:hover {
  background: #FFEBEE;
  color: var(--color-danger);
  border-color: rgba(220, 53, 69, 0.2);
  transform: scale(1.05);
}

.modal-close:active {
  transform: scale(0.95);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: var(--color-bg);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

.modal-footer {
  padding: 18px 24px;
  border-top: 1px solid var(--color-border);
  background: linear-gradient(to top, rgba(200, 149, 108, 0.02), transparent);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-slide-leave-active {
  transition: all 0.2s ease;
}
.modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.94) translateY(20px);
}
.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(10px);
}
</style>
