<template>
  <div class="stock-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Control de Stock</h2>
        <p class="page-sub">Kardex de movimientos por producto</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="openEntryModal">
          + Entrada
        </button>
        <button class="btn btn-secondary" @click="openAdjustmentModal">
          Ajuste
        </button>
      </div>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">Buscar producto</label>
        <ProductSearch @select="onStockProductSelect" :filter-in-stock="false" placeholder="Buscar por nombre, código..." />
        <div v-if="selectedProductInfo" class="selected-product-info">
          <span>{{ selectedProductInfo.name }}</span>
          <span :class="['badge', selectedProductInfo.stock <= 0 ? 'badge-danger' : 'badge-success']">
            Stock: {{ selectedProductInfo.stock }}
          </span>
        </div>
      </div>
    </div>

    <div class="card" v-if="selectedProductId">
      <div v-if="loading" class="state-text">Cargando movimientos...</div>
      <div v-else-if="movements.length === 0" class="state-text">
        Este producto no tiene movimientos registrados.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Stock antes</th>
            <th>Stock después</th>
            <th>Motivo</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movements" :key="m.id">
            <td>{{ formatDate(m.date) }}</td>
            <td>
              <span :class="['badge', typeBadge(m.type)]">{{ typeLabel(m.type) }}</span>
            </td>
            <td :style="{ color: m.quantity < 0 ? 'var(--color-danger)' : 'var(--color-success)' }">
              {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
            </td>
            <td>{{ m.stockBefore }}</td>
            <td>{{ m.stockAfter }}</td>
            <td>{{ m.reason || '-' }}</td>
            <td>{{ m.userName }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Entrada -->
    <ModalBase v-model="showEntryModal" title="Registrar entrada de stock">
      <form @submit.prevent="saveEntry">
        <div class="form-group">
          <label class="form-label">Producto</label>
          <ProductSearch @select="(p) => entryForm.productId = p.id" :filter-in-stock="false" placeholder="Buscar producto..." />
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad a ingresar</label>
          <input v-model.number="entryForm.quantity" type="number" min="1" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">Motivo (opcional)</label>
          <input
            v-model="entryForm.reason"
            type="text"
            class="form-input"
            placeholder="Ej: Compra a proveedor"
            @input="entryForm.reason = toUpperCase(entryForm.reason)"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showEntryModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveEntry" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Registrar entrada' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Ajuste -->
    <ModalBase v-model="showAdjustmentModal" title="Ajustar stock">
      <form @submit.prevent="saveAdjustment">
        <div class="form-group">
          <label class="form-label">Producto</label>
          <ProductSearch @select="(p) => { adjustmentForm.productId = p.id; adjustmentForm.newStock = p.stock }" :filter-in-stock="false" placeholder="Buscar producto..." />
        </div>
        <div class="form-group">
          <label class="form-label">Nuevo stock real</label>
          <input v-model.number="adjustmentForm.newStock" type="number" min="0" class="form-input" required />
          <p class="hint-text" v-if="adjustmentForm.productId">
            Stock actual en sistema: {{ getCurrentStock(adjustmentForm.productId) }}
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">Motivo (obligatorio)</label>
          <input
            v-model="adjustmentForm.reason"
            type="text"
            class="form-input"
            placeholder="Ej: Conteo físico, producto dañado"
            required
            @input="adjustmentForm.reason = toUpperCase(adjustmentForm.reason)"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showAdjustmentModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveAdjustment" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Registrar ajuste' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber, formatDate } from '@/utils/format'

const toast = useToastStore()

const products = ref([])
const movements = ref([])
const selectedProductId = ref('')
const selectedProductInfo = ref(null)
const loading = ref(false)
const saving = ref(false)

const showEntryModal = ref(false)
const showAdjustmentModal = ref(false)

const entryForm = ref({ productId: '', quantity: 1, reason: '' })
const adjustmentForm = ref({ productId: '', newStock: 0, reason: '' })

function typeLabel(type) {
  const map = { Entry: 'Entrada', Exit: 'Salida', Adjustment: 'Ajuste' }
  return map[type] || type
}

function typeBadge(type) {
  const map = { Entry: 'badge-success', Exit: 'badge-warning', Adjustment: 'badge-info' }
  return map[type] || ''
}

function getCurrentStock(productId) {
  const product = products.value.find(p => p.id === productId)
  return product ? product.stock : 0
}

function onStockProductSelect(product) {
  selectedProductId.value = product.id
  selectedProductInfo.value = product
  loadMovements()
}

function onAdjustProductSelect() {
  adjustmentForm.value.newStock = getCurrentStock(adjustmentForm.value.productId)
}

async function loadProducts() {
  const res = await api.get('/Product', { params: { pageSize: 100 } })
  products.value = res.data.data.data
}

async function loadMovements() {
  if (!selectedProductId.value) return
  try {
    loading.value = true
    const res = await api.get(`/Stock/${selectedProductId.value}/movements`)
    movements.value = res.data.data
  } catch (err) {
    toast.show('Error al cargar los movimientos', 'error')
  } finally {
    loading.value = false
  }
}

function openEntryModal() {
  entryForm.value = { productId: selectedProductId.value || '', quantity: 1, reason: '' }
  showEntryModal.value = true
}

function openAdjustmentModal() {
  adjustmentForm.value = {
    productId: selectedProductId.value || '',
    newStock: selectedProductId.value ? getCurrentStock(selectedProductId.value) : 0,
    reason: ''
  }
  showAdjustmentModal.value = true
}

async function saveEntry() {
  try {
    saving.value = true
    const res = await api.post('/Stock/entry', entryForm.value)
    toast.show('Entrada de stock registrada correctamente', 'success')
    showEntryModal.value = false
    await loadProducts()
    if (entryForm.value.productId === selectedProductId.value) {
      loadMovements()
      // Actualizar stock en selectedProductInfo
      if (selectedProductInfo.value && res.data?.data?.newStock !== undefined) {
        selectedProductInfo.value.stock = res.data.data.newStock
      }
    }
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar la entrada', 'error')
  } finally {
    saving.value = false
  }
}

async function saveAdjustment() {
  try {
    saving.value = true
    await api.post('/Stock/adjustment', adjustmentForm.value)
    toast.show('Ajuste de stock registrado correctamente', 'success')
    showAdjustmentModal.value = false
    await loadProducts()
    if (adjustmentForm.value.productId === selectedProductId.value) {
      loadMovements()
      // Actualizar stock en selectedProductInfo
      if (selectedProductInfo.value) {
        selectedProductInfo.value.stock = adjustmentForm.value.newStock
      }
    }
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar el ajuste', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(loadProducts)
</script>

<style scoped>
.stock-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.header-actions { display: flex; gap: 10px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
.hint-text { font-size: 12px; color: var(--color-accent); margin-top: 6px; }
.selected-product-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  padding: 6px 10px;
  background: var(--color-accent-light);
  border-radius: var(--radius-sm);
}
</style>
