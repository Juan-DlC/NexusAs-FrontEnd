<template>
  <div class="sales-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Ventas</h2>
        <p class="page-sub">{{ totalRecords }} ventas registradas</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="openCreateModal">
        + Nueva venta
      </button>
    </div>

    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        class="form-input search-input"
        placeholder="Buscar por factura o cliente..."
        @input="onSearchInput"
      />
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="sales.length === 0" class="state-text">
        No hay ventas registradas.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Método</th>
            <th>Total</th>
            <th>Recibo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sales" :key="s.id" class="clickable-row" @click="openDetailModal(s)">
            <td>
              <strong>{{ s.saleNumber }}</strong>
              <span v-if="s.status === 'FullReturn'" class="badge badge-danger" style="margin-left: 4px;">Devuelta</span>
              <span v-else-if="s.status === 'PartialReturn'" class="badge badge-warning" style="margin-left: 4px;">Devolución parcial</span>
            </td>
            <td>{{ s.customerName || s.sellerName || 'Sin cliente' }}</td>
            <td>{{ formatDate(s.date) }}</td>
            <td>
              <span :class="['badge', s.paymentMethodName === 'CONTADO' || s.paymentMethod === 'Cash' ? 'badge-success' : 'badge-warning']">
                {{ s.paymentMethodName || s.paymentMethod || 'N/A' }}
              </span>
            </td>
            <td>${{ formatNumber(s.total) }}</td>
            <td>
              <button class="btn-icon" @click.stop="downloadReceipt(s.id)" :title="`📄 Descargar recibo de ${s.saleNumber}`">
                📄
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages > 1">
        <button class="btn btn-secondary btn-sm" :disabled="!hasPreviousPage" @click="changePage(pageNumber - 1)">
          ← Anterior
        </button>
        <span class="page-info">Página {{ pageNumber }} de {{ totalPages }}</span>
        <button class="btn btn-secondary btn-sm" :disabled="!hasNextPage" @click="changePage(pageNumber + 1)">
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modal Nueva Venta -->
    <ModalBase v-model="showModal" title="Nueva venta" width="640px">
      <form @submit.prevent="saveSale">
        <div class="form-group">
          <label class="form-label">Método de pago</label>
          <select v-model.number="form.paymentMethodId" class="form-input" required>
            <option :value="null" disabled>Selecciona método de pago</option>
            <option v-if="paymentMethods.length === 0" value="Cash">Contado</option>
            <option v-if="paymentMethods.length === 0" value="Credit">Crédito</option>
            <option v-for="pm in paymentMethods" :key="pm.id" :value="pm.id">
              {{ pm.name }}
            </option>
          </select>
        </div>

        <div class="form-group" v-if="isCredit">
          <label class="form-label">Cliente (obligatorio para crédito)</label>
          <select v-model="form.customerId" class="form-input" required>
            <option value="" disabled>Selecciona un cliente</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="form-group" v-if="isCredit">
          <label class="form-label">Número de cuotas</label>
          <select v-model.number="form.numberOfInstallments" class="form-input">
            <option :value="1">1 cuota (pago único)</option>
            <option :value="2">2 cuotas</option>
            <option :value="3">3 cuotas</option>
            <option :value="4">4 cuotas</option>
            <option :value="6">6 cuotas</option>
          </select>
          <p class="hint-text" v-if="form.numberOfInstallments > 1">
            Cada cuota: ${{ formatNumber(calculatedTotal / form.numberOfInstallments) }}
          </p>
        </div>

        <div class="form-group" v-if="!isCredit">
          <label class="form-label">Cliente (opcional)</label>
          <select v-model="form.customerId" class="form-input">
            <option value="">Sin cliente</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="divider-label">Productos</div>

        <div v-for="(detail, index) in form.details" :key="index" class="sale-product-row">
          <div class="sale-product-search">
            <ProductSearch @select="(p) => onProductSelect(detail, p)" placeholder="Buscar producto..." />
          </div>
          
          <div class="sale-product-controls" v-if="detail.productId">
            <div class="control-group">
              <label class="control-label">Cantidad</label>
              <input 
                v-model.number="detail.quantity" 
                type="number" 
                min="1"
                class="form-input qty-input"
                :class="{ 'input-error': isStockExceeded(detail) }" 
              />
            </div>
            <div class="control-group">
              <label class="control-label">Precio unit.</label>
              <CurrencyInput v-model="detail.unitPrice" class="price-input" />
            </div>
            <div class="control-group subtotal-group">
              <label class="control-label">Subtotal</label>
              <span class="subtotal-value">${{ formatNumber(detail.quantity * detail.unitPrice) }}</span>
            </div>
            <button 
              type="button" 
              class="btn-icon btn-icon-danger"
              @click="removeDetail(index)"
              v-if="form.details.length > 1"
              title="🗑️ Quitar producto"
            >
              ✕
            </button>
          </div>
          
          <div class="stock-badge" v-if="detail.productId">
            <span :class="['badge', isStockExceeded(detail) ? 'badge-danger' : 'badge-success']">
              {{ isStockExceeded(detail) 
                ? `⚠️ Stock insuficiente (${getProductStock(detail)} disp.)` 
                : `✓ Stock: ${getProductStock(detail)}` 
              }}
            </span>
          </div>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" @click="addDetail" style="margin-bottom: 16px;">
          + Agregar producto
        </button>

        <div class="form-group">
          <label class="form-label">Descuento % (opcional)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input v-model.number="form.discountPercent" type="number" min="0" max="100" class="form-input" style="max-width: 100px;" placeholder="0" />
            <span style="font-size: 13px; color: var(--color-text-muted);">%</span>
            <span v-if="form.discountPercent > 0" style="font-size: 13px; color: var(--color-accent);">
              = -${{ formatNumber(calculatedDiscount) }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <input v-model="form.notes" type="text" class="form-input" @input="form.notes = toUpperCase(form.notes)" />
        </div>

        <div class="sale-total-box">
          <div class="total-line" v-if="form.discountPercent > 0">
            <span>Subtotal</span>
            <span>${{ formatNumber(subtotalAmount) }}</span>
          </div>
          <div class="total-line discount" v-if="form.discountPercent > 0">
            <span>Descuento ({{ form.discountPercent }}%)</span>
            <span style="color: var(--color-success)">-${{ formatNumber(calculatedDiscount) }}</span>
          </div>
          <div class="total-line total-final">
            <span><strong>Total</strong></span>
            <strong style="font-size: 18px; color: var(--color-accent)">${{ formatNumber(calculatedTotal) }}</strong>
          </div>
        </div>
        <p class="stock-error-msg" v-if="hasStockErrors">
          ⚠️ Corrige las cantidades en rojo antes de continuar.
        </p>
      </form>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveSale" :disabled="saving || hasStockErrors">
          {{ saving ? 'Guardando...' : 'Registrar venta' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Detalle de Venta -->
    <!-- Modal Detalle de Venta -->
    <ModalBase v-model="showDetailModal" title="Detalle de venta" width="560px">
      <div v-if="selectedSale">
        <div class="detail-summary">
          <p><strong>Factura:</strong> {{ selectedSale.saleNumber }}</p>
          <p><strong>Cliente/Socia:</strong> {{ selectedSale.customerName || selectedSale.sellerName || 'Sin cliente' }}</p>
          <p><strong>Fecha:</strong> {{ formatDate(selectedSale.date) }}</p>
          <p><strong>Vendedor:</strong> {{ selectedSale.processedByName || selectedSale.sellerName }}</p>
          <p v-if="selectedSale.processedByName && selectedSale.sellerName && selectedSale.processedByName !== selectedSale.sellerName">
            <strong>Socia:</strong> {{ selectedSale.sellerName }}
          </p>
          <p><strong>Método:</strong>
            <span :class="['badge', selectedSale.paymentMethodName === 'CONTADO' || selectedSale.paymentMethod === 'Cash' ? 'badge-success' : 'badge-warning']">
              {{ selectedSale.paymentMethodName || selectedSale.paymentMethod || 'N/A' }}
            </span>
          </p>
          <p v-if="selectedSale.notes"><strong>Notas:</strong> {{ selectedSale.notes }}</p>
        </div>

        <div class="divider-label">Productos</div>
        <table>
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in selectedSale.details" :key="i">
              <td>{{ d.productName }}</td>
              <td>{{ d.quantity }}</td>
              <td>${{ formatNumber(d.unitPrice) }}</td>
              <td>${{ formatNumber(d.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-preview" style="margin-top: 14px;">
          <span>Total:</span>
          <strong>${{ formatNumber(selectedSale.total) }}</strong>
        </div>

        <div class="total-preview" style="margin-top: 14px; background: #FFF3E0;" v-if="selectedSale.returns && selectedSale.returns.length > 0">
          <span>Total después de devoluciones:</span>
          <strong style="color: var(--color-warning)">${{ formatNumber(selectedSale.total) }}</strong>
        </div>

        <div v-if="selectedSale.returns && selectedSale.returns.length > 0" style="margin-top: 14px;">
          <div class="divider-label">Devoluciones ({{ selectedSale.returns.length }})</div>
          <div class="return-item-detail" v-for="ret in selectedSale.returns" :key="ret.id">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span><strong>{{ formatDate(ret.date) }}</strong></span>
              <span style="color: var(--color-warning)">-${{ formatNumber(ret.totalReturned) }}</span>
            </div>
            <p v-if="ret.notes" style="font-size:12px; color: var(--color-text-muted)">{{ ret.notes }}</p>
            <ul style="font-size:12px; margin-top:4px; padding-left:16px;">
              <li v-for="d in ret.details" :key="d.productId">
                {{ d.productName }} — {{ d.quantity }} unidad(es) — ${{ formatNumber(d.unitPrice) }} c/u
              </li>
            </ul>
          </div>
        </div>

        <div v-if="selectedSale.creditInfo" class="credit-box">
          <div class="divider-label">Estado del crédito</div>
          <p><strong>Total:</strong> ${{ formatNumber(selectedSale.creditInfo.totalAmount) }}</p>
          <p style="color: var(--color-success)">
            <strong>Abonado:</strong> ${{ formatNumber(selectedSale.creditInfo.paidAmount) }}
          </p>
          <p style="color: var(--color-danger)">
            <strong>Pendiente:</strong> ${{ formatNumber(selectedSale.creditInfo.pendingAmount) }}
          </p>

          <div v-if="selectedSale.creditInfo.numberOfInstallments > 1" style="margin-top: 10px;">
            <p class="installments-title">Cuotas ({{ selectedSale.creditInfo.numberOfInstallments }})</p>
            <div class="installment-item" v-for="i in selectedSale.creditInfo.installments" :key="i.number">
              <span>Cuota {{ i.number }}</span>
              <span>${{ formatNumber(i.amount) }}</span>
              <span :class="['badge', i.isPaid ? 'badge-success' : 'badge-warning']">
                {{ i.isPaid ? 'Pagada' : 'Pendiente' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Cerrar</button>
        <button class="btn btn-secondary" @click="openReturnModal">↩ Devolver productos</button>
        <button class="btn btn-primary" @click="downloadReceipt(selectedSale.id)">
          Ver recibo PDF
        </button>
      </template>
    </ModalBase>

    <!-- Modal Devolución -->
    <ModalBase v-model="showReturnModal" :title="`Registrar devolución — ${selectedSale?.saleNumber || ''}`" width="600px">
      <div v-if="returnForm.details.length > 0">
        <p class="hint-text" style="margin-bottom: 16px;">
          Selecciona los productos y la cantidad a devolver
        </p>
        <div v-for="(item, index) in returnForm.details" :key="index" class="return-item">
          <input type="checkbox" v-model="item.selected" />
          <div>
            <strong>{{ item.productName }}</strong>
            <p class="hint-text" style="margin: 0;">Cantidad original: {{ item.originalQuantity }}</p>
          </div>
          <input
            v-model.number="item.returnQuantity"
            type="number"
            min="0"
            :max="item.originalQuantity"
            class="form-input return-qty"
            :disabled="!item.selected"
          />
        </div>

        <div class="form-group" style="margin-top: 20px;">
          <label class="form-label">Notas (opcional)</label>
          <textarea
            v-model="returnForm.notes"
            class="form-input"
            rows="3"
            @input="returnForm.notes = toUpperCase(returnForm.notes)"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showReturnModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveReturn" :disabled="saving">
          {{ saving ? 'Procesando...' : 'Confirmar devolución' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
import { toUpperCase } from '@/utils/textFormat'

const toast = useToastStore()

const sales = ref([])
const customers = ref([])
const paymentMethods = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const showDetailModal = ref(false)
const showReturnModal = ref(false)
const selectedSale = ref(null)
const search = ref('')
const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({
  paymentMethodId: null,
  customerId: '',
  numberOfInstallments: 1,
  discountPercent: 0,
  notes: '',
  requestId: '',
  details: [{ productId: '', quantity: 1, unitPrice: 0 }]
})

// Función para generar RequestId único
const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const returnForm = ref({ notes: '', details: [] })

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const calculatedDiscount = computed(() => {
  const subtotal = form.value.details.reduce(
    (sum, d) => sum + (d.quantity * d.unitPrice || 0), 0
  )
  return Math.round(subtotal * (form.value.discountPercent || 0) / 100)
})

const calculatedTotal = computed(() => {
  const subtotal = form.value.details.reduce(
    (sum, d) => sum + (d.quantity * d.unitPrice || 0), 0
  )
  return subtotal - calculatedDiscount.value
})

const selectedPaymentMethod = computed(() => {
  return paymentMethods.value.find(pm => pm.id === form.value.paymentMethodId)
})

const isCredit = computed(() => {
  return selectedPaymentMethod.value?.code === 'CREDIT'
})

function onProductSelect(detail, product) {
  detail.productId = product.id
  detail.unitPrice = product.salePrice
  detail.stock = product.stock
}

function getProductStock(detail) {
  return detail.stock || 0
}

function isStockExceeded(detail) {
  if (!detail.productId) return false
  return detail.quantity > getProductStock(detail)
}

const hasStockErrors = computed(() =>
  form.value.details.some(d => isStockExceeded(d))
)

function addDetail() {
  form.value.details.push({ productId: '', quantity: 1, unitPrice: 0, stock: 0 })
}

function removeDetail(index) {
  if (form.value.details.length > 1) {
    form.value.details.splice(index, 1)
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadSales()
  }, 400)
}

function changePage(page) {
  pageNumber.value = page
  loadSales()
}

async function loadSales() {
  try {
    loading.value = true
    const res = await api.get('/Sale', {
      params: { pageNumber: pageNumber.value, pageSize: pageSize.value, search: search.value }
    })
    const data = res.data.data
    sales.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch (err) {
    console.error('Error cargando ventas:', err)
  } finally {
    loading.value = false
  }
}

async function loadCustomers() {
  const res = await api.get('/Customer', { params: { pageSize: 100 } })
  customers.value = res.data.data.data
}

async function loadPaymentMethods() {
  try {
    const res = await api.get('/PaymentMethod')
    paymentMethods.value = res.data.data
  } catch (err) {
    console.error('Error cargando métodos de pago:', err)
  }
}

function openCreateModal() {
  form.value = {
    paymentMethodId: null, customerId: '', numberOfInstallments: 1, discountPercent: 0, notes: '',
    requestId: generateRequestId(), // Generar RequestId único
    details: [{ productId: '', quantity: 1, unitPrice: 0, stock: 0 }]
  }
  showModal.value = true
}

async function saveSale() {
  try {
    saving.value = true
    const payload = {
      requestId: form.value.requestId, // Incluir requestId
      paymentMethodId: form.value.paymentMethodId,
      customerId: form.value.customerId || null,
      numberOfInstallments: form.value.numberOfInstallments || 1,
      discountPercent: form.value.discountPercent || 0,
      discountAmount: calculatedDiscount.value,
      notes: form.value.notes || null,
      details: form.value.details.map(d => ({
        productId: d.productId,
        quantity: Number(d.quantity) || 1,
        unitPrice: Number(d.unitPrice) || 0
      }))
    }
    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    
    // Regenerar requestId para próxima venta
    form.value.requestId = generateRequestId()
    
    showModal.value = false
    loadSales()
  } catch (err) {
    const errorMsg = err.response?.data?.message || 
      (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Error al registrar la venta')
    toast.show(errorMsg, 'error')
  } finally {
    saving.value = false
  }
}

async function openDetailModal(sale) {
  try {
    const res = await api.get(`/Sale/${sale.id}`)
    selectedSale.value = res.data.data
    
    // Cargar devoluciones de esta venta usando endpoint correcto
    try {
      const returnsRes = await api.get(`/Return/by-sale/${res.data.data.id}`)
      selectedSale.value.returns = returnsRes.data.data || []
    } catch {
      selectedSale.value.returns = []
    }
    
    showDetailModal.value = true
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al cargar el detalle de la venta', 'error')
  }
}

async function downloadReceipt(saleId) {
  try {
    const res = await api.get(`/Sale/${saleId}/receipt`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al ver el recibo', 'error')
  }
}

function openReturnModal() {
  returnForm.value = {
    notes: '',
    details: selectedSale.value.details.map(d => ({
      productId: d.productId,
      productName: d.productName,
      originalQuantity: d.quantity,
      returnQuantity: 0,
      selected: false
    }))
  }
  showReturnModal.value = true
}

async function saveReturn() {
  const details = returnForm.value.details
    .filter(d => d.selected && d.returnQuantity > 0)
    .map(d => ({ productId: d.productId, quantity: d.returnQuantity }))

  if (details.length === 0) {
    toast.show('Selecciona al menos un producto para devolver', 'warning')
    return
  }

  try {
    saving.value = true
    await api.post('/Return', {
      saleId: selectedSale.value.id,
      notes: returnForm.value.notes || null,
      details
    })
    toast.show('Devolución registrada correctamente', 'success')
    showReturnModal.value = false
    showDetailModal.value = false
    loadSales()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar la devolución', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSales()
  loadCustomers()
  loadPaymentMethods()
})
</script>

<style scoped>
.stock-error-msg {
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
  margin-top: 10px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.input-error { border-color: var(--color-danger) !important; }
.stock-warning {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: -4px;
  margin-bottom: 8px;
}
.sales-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.search-bar { display: flex; }
.search-input { max-width: 320px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
.btn-icon { background: var(--color-bg); width: 30px; height: 30px; border-radius: 8px; transition: var(--transition); }
.btn-icon:hover { background: var(--color-accent-light); }
.btn-icon-danger:hover { background: #FFEBEE; color: var(--color-danger); }

.clickable-row { cursor: pointer; }
.clickable-row:hover { background: var(--color-accent-light) !important; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
}
.page-info { font-size: 12px; color: var(--color-text-muted); }

.credit-box {
  margin-top: 14px;
  background: var(--color-accent-light);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
}
.credit-box p { font-size: 13px; margin-bottom: 6px; }

.installments-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.installment-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.detail-summary {
  background: var(--color-bg);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}
.detail-summary p { font-size: 13px; margin-bottom: 6px; }
.detail-summary p:last-child { margin-bottom: 0; }

.divider-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 16px 0 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.detail-row {
  display: grid;
  grid-template-columns: 2fr 70px 100px 32px;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.sale-product-row {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 10px;
  background: var(--color-bg);
}

.sale-product-search {
  margin-bottom: 8px;
}

.sale-product-controls {
  display: grid;
  grid-template-columns: 80px 1fr 1fr auto;
  gap: 8px;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.subtotal-group {
  text-align: right;
}

.subtotal-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  padding: 8px 0;
}

.stock-badge {
  margin-top: 6px;
}

.sale-total-box {
  background: var(--color-accent-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  margin-top: 16px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
}

.total-line.total-final {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
  margin-top: 6px;
}

.qty-input, .price-input { padding: 10px 8px; }

.hint-text {
  font-size: 12px;
  color: var(--color-accent);
  margin: -8px 0 14px;
}

.return-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.return-qty {
  width: 70px;
}

.return-item-detail {
  background: #FFF3E0;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  border-left: 3px solid var(--color-warning);
}

.return-item-detail p {
  margin-bottom: 4px;
}

.return-item-detail ul {
  margin: 0;
  padding-left: 20px;
}
</style>
