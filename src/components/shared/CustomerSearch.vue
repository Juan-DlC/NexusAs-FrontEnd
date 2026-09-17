<template>
  <div class="customer-search">
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
    <div class="results-dropdown" v-if="showResults && filteredCustomers.length > 0">
      <div
        class="result-item"
        v-for="c in filteredCustomers"
        :key="c.id"
        @mousedown.prevent="selectCustomer(c)"
      >
        <div class="result-main">
          <strong>{{ c.name }}</strong>
        </div>
        <div v-if="c.notes" class="result-notes">
          📝 {{ c.notes }}
        </div>
        <div class="result-meta" v-if="c.phone">
          <span>📞 {{ c.phone }}</span>
        </div>
      </div>
    </div>
    <div class="results-dropdown" v-else-if="showResults && query.length >= 2 && !loading">
      <div class="result-empty">No se encontraron clientes</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  customers: { type: Array, required: true },
  placeholder: { type: String, default: 'Buscar cliente por nombre, nota o teléfono...' },
  modelValue: { type: [Number, String, null], default: null }
})

const emit = defineEmits(['update:modelValue', 'select'])

const query = ref('')
const showResults = ref(false)
const loading = ref(false)

const filteredCustomers = computed(() => {
  if (query.value.length < 2) return []
  
  const searchTerm = query.value.toUpperCase()
  
  return props.customers.filter(customer => {
    const name = (customer.name || '').toUpperCase()
    const notes = (customer.notes || '').toUpperCase()
    const phone = (customer.phone || '').toString()
    
    return name.includes(searchTerm) || 
           notes.includes(searchTerm) || 
           phone.includes(searchTerm)
  }).slice(0, 10) // Limitar a 10 resultados
})

function handleInput(e) {
  // Convertir a mayúscula
  const cursorPos = e.target.selectionStart
  query.value = e.target.value.toUpperCase()
  
  // Restaurar posición del cursor
  setTimeout(() => {
    e.target.setSelectionRange(cursorPos, cursorPos)
  }, 0)
  
  showResults.value = true
  loading.value = false
}

function selectCustomer(customer) {
  emit('update:modelValue', customer.id)
  emit('select', customer)
  query.value = `${customer.name}${customer.notes ? ' - ' + customer.notes : ''}`
  showResults.value = false
}

function onBlur() {
  setTimeout(() => { showResults.value = false }, 150)
}

function clear() {
  query.value = ''
  emit('update:modelValue', null)
}

defineExpose({ clear })
</script>

<style scoped>
.customer-search { position: relative; width: 100%; }

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
  margin-top: 4px;
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

.result-notes {
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
