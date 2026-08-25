<template>
  <div class="product-search">
    <input
      v-model="query"
      type="text"
      class="form-input"
      :placeholder="placeholder"
      @input="onInput"
      @focus="showResults = true"
      @blur="onBlur"
      autocomplete="off"
    />
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

const props = defineProps({
  placeholder: { type: String, default: 'Buscar por nombre, código o marca...' },
  filterInStock: { type: Boolean, default: true }
})

const emit = defineEmits(['select'])

const query = ref('')
const results = ref([])
const showResults = ref(false)
const loading = ref(false)
let searchTimeout = null

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function onInput() {
  if (query.value.length < 2) {
    results.value = []
    return
  }
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
      results.value = res.data.data.data
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
