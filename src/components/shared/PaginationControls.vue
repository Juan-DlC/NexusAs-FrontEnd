<template>
  <div class="pagination-controls">
    <!-- Botón Primera página -->
    <button 
      class="btn btn-secondary btn-sm pagination-btn"
      :disabled="currentPage === 1"
      @click="$emit('change-page', 1)"
      title="Primera página"
    >
      ⏮️
    </button>
    
    <!-- Botón Anterior -->
    <button 
      class="btn btn-secondary btn-sm pagination-btn"
      :disabled="!hasPreviousPage"
      @click="$emit('change-page', currentPage - 1)"
      title="Página anterior"
    >
      ← Anterior
    </button>
    
    <!-- Números de página -->
    <div class="page-numbers">
      <button 
        v-for="page in visiblePages" 
        :key="page"
        :class="['page-number-btn', { active: page === currentPage, dots: page === '...' }]"
        :disabled="page === '...'"
        @click="page !== '...' && $emit('change-page', page)"
      >
        {{ page }}
      </button>
    </div>
    
    <!-- Botón Siguiente -->
    <button 
      class="btn btn-secondary btn-sm pagination-btn"
      :disabled="!hasNextPage"
      @click="$emit('change-page', currentPage + 1)"
      title="Página siguiente"
    >
      Siguiente →
    </button>
    
    <!-- Botón Última página -->
    <button 
      class="btn btn-secondary btn-sm pagination-btn"
      :disabled="currentPage === totalPages"
      @click="$emit('change-page', totalPages)"
      title="Última página"
    >
      ⏭️
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  hasNextPage: { type: Boolean, default: false },
  hasPreviousPage: { type: Boolean, default: false }
})

defineEmits(['change-page'])

const visiblePages = computed(() => {
  const pages = []
  const current = props.currentPage
  const total = props.totalPages
  
  if (total <= 7) {
    // Si hay 7 o menos páginas, mostrar todas
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Siempre mostrar primera página
    pages.push(1)
    
    if (current > 3) {
      pages.push('...')
    }
    
    // Mostrar páginas alrededor de la actual
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (current < total - 2) {
      pages.push('...')
    }
    
    // Siempre mostrar última página
    pages.push(total)
  }
  
  return pages
})
</script>

<style scoped>
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.pagination-btn {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  min-width: auto;
}

.page-numbers {
  display: flex;
  gap: 4px;
  align-items: center;
}

.page-number-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  background: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number-btn:hover:not(.active):not(.dots):not(:disabled) {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-number-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
  font-weight: 600;
  cursor: default;
}

.page-number-btn.dots {
  border: none;
  background: transparent;
  cursor: default;
  font-weight: bold;
  color: var(--color-text-muted);
}

.page-number-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
