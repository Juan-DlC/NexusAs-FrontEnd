<template>
  <div class="product-search">
    <div class="search-input-wrapper">
      <input
        v-model="query"
        type="text"
        class="form-input"
        :placeholder="placeholder"
        @input="handleInput"
        @focus="showResults = true"
        @blur="onBlur"
        autocomplete="off"
      />
      <span v-if="loading" class="search-spinner">🔍</span>
    </div>
    <div class="results-dropdown" v-if="showResults && results.length > 0">
      <div
        class="result-item"
        v-for="p in results"
        :key="p.id"
        @mousedown.prevent="selectProduct(p)"
      >
        <div class="result-main">
          <strong>{{ p.name }}</strong>
          <span class="result-code">{{ p.code }}</span>
          <span v-if="p.isPartnership" class="badge badge-pink" style="margin-left: 4px;">Alianza</span>
        </div>
        <div v-if="p.description" class="result-description">
          {{ p.description }}
        </div>
        <div class="result-meta">
          <span>Stock: {{ p.stock }}</span>
          <span>${{ formatNumber(p.salePrice) }}</span>
        </div>
      </div>
    </div>
    <div class="results-dropdown" v-else-if="showResults && query.length >= 2 && !loading">
      <div class="result-empty">No se encontraron productos</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/axios'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  placeholder: { type: String, default: 'Buscar por nombre, código o marca...' },
  filterInStock: { type: Boolean, default: true },
  excludeProducts: { type: Array, default: () => [] } // Array de { productId, quantityUsed }
})

const emit = defineEmits(['select'])

const query = ref('')
const results = ref([])
const showResults = ref(false)
const loading = ref(false)
let searchTimeout = null

function handleInput(e) {
  // Convertir a mayúscula
  const cursorPos = e.target.selectionStart
  query.value = e.target.value.toUpperCase()
  
  // Restaurar posición del cursor
  setTimeout(() => {
    e.target.setSelectionRange(cursorPos, cursorPos)
  }, 0)
  
  onInput()
}

function onInput() {
  if (query.value.length < 2) {
    results.value = []
    showResults.value = false
    clearTimeout(searchTimeout)
    return
  }
  showResults.value = true
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    try {
      loading.value = true
      const res = await api.get('/Product', {
        params: { 
          search: query.value, 
          inStock: props.filterInStock ? true : undefined, 
          pageSize: 8 
        }
      })
      
      // Filtrar productos que ya no tienen stock disponible en el carrito
      const availableProducts = res.data.data.data.filter(product => {
        const excluded = props.excludeProducts.find(ex => ex.productId === product.id)
        if (!excluded) return true // No está en el carrito, mostrar
        
        // Calcular stock disponible = stock total - cantidad ya usada en carrito
        const availableStock = product.stock - excluded.quantityUsed
        return availableStock > 0 // Solo mostrar si queda stock disponible
      })
      
      results.value = availableProducts
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

function selectProduct(product) {
  emit('select', product)
  query.value = product.name
  showResults.value = false
  results.value = []
}

function onBlur() {
  setTimeout(() => { showResults.value = false }, 150)
}

function clear() {
  query.value = ''
  results.value = []
}

defineExpose({ clear })
</script>

<style scoped>
.product-search { position: relative; }

.search-input-wrapper {
  position: relative;
}

.search-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  animation: spin 1s linear infinite;
  pointer-events: none;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

.results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 200;
  max-height: 280px;
  overflow-y: auto;
}

.result-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: var(--transition);
}

.result-item:last-child { border-bottom: none; }
.result-item:hover { background: var(--color-accent-light); }

.result-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.result-code {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 1px 6px;
  border-radius: 4px;
}

.result-description {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 3px;
  line-height: 1.3;
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 3px;
}

.result-empty {
  padding: 14px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
