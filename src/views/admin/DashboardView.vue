<template>
  <div class="dashboard">
    <!-- Botones de Acción -->
    <div class="action-buttons-grid">
      <div class="action-card" @click="openSaleModal">
        <div class="action-icon">💰</div>
        <div class="action-info">
          <span class="action-title">Nueva venta</span>
          <span class="action-sub">Registrar venta al cliente</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
      
      <div class="action-card action-card-addi" @click="openAddiLink">
        <div class="action-icon">🏦</div>
        <div class="action-info">
          <span class="action-title">Venta con Addi</span>
          <span class="action-sub">Financiamiento externo</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-top">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <div class="stat-value" :style="{ color: stat.color }">
          {{ stat.value }}
        </div>
        <div class="stat-sub" :style="{ color: stat.subColor }">
          {{ stat.sub }}
        </div>
      </div>
    </div>

    <!-- Fila inferior -->
    <div class="bottom-grid">
      <!-- Últimas ventas -->
      <div class="card">
        <h3 class="card-title">Últimas ventas</h3>
        <div v-if="loading" class="loading-text">Cargando...</div>
        <div v-else-if="recentSales.length === 0" class="empty-text">
          No hay ventas registradas hoy.
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in recentSales" :key="sale.id">
              <td>{{ sale.saleNumber }}</td>
              <td>{{ sale.customerId ? (sale.customerName || 'Sin cliente') : 'Sin cliente' }}</td>
              <td>${{ formatNumber(sale.total) }}</td>
              <td>
                <span class="badge" :class="sale.paymentMethodName === 'Contado' || sale.paymentMethodName === 'CONTADO' ? 'badge-success' : 'badge-warning'">
                  {{ sale.paymentMethodName || 'N/A' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Stock bajo -->
      <div class="card">
        <h3 class="card-title">⚠️ Stock bajo</h3>
        <div v-if="loading" class="loading-text">Cargando...</div>
        <div v-else-if="lowStock.length === 0" class="empty-text success-text">
          ✓ Todos los productos tienen stock suficiente.
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in lowStock" :key="product.id">
              <td>{{ product.name }}</td>
              <td style="color: var(--color-danger); font-weight: 600;">
                {{ product.stock }}
              </td>
              <td>{{ product.minStock }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Nueva Venta -->
    <ModalBase v-model="showSaleModal" title="Nueva venta" width="640px">
      <form @submit.prevent="saveSale">
        <div class="form-group">
          <label class="form-label">Método de pago</label>
          <select v-model.number="form.paymentMethodId" class="form-input" required>
            <option :value="null" disabled>Selecciona método de pago</option>
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
        <button class="btn btn-secondary" @click="showSaleModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveSale" :disabled="saving || hasStockErrors">
          {{ saving ? 'Guardando...' : 'Registrar venta' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
import { useToastStore } from '@/stores/toast'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber } from '@/utils/format'

const router = useRouter()
const toast = useToastStore()
const loading = ref(true)
const summary = ref(null)
const recentSales = ref([])
const lowStock = ref([])
const showSaleModal = ref(false)
const saving = ref(false)
const paymentMethods = ref([])
const customers = ref([])

const form = ref({
  paymentMethodId: null,
  customerId: '',
  numberOfInstallments: 1,
  discountPercent: 0,
  notes: '',
  requestId: '',
  details: [{ productId: '', quantity: 1, unitPrice: 0, stock: 0 }]
})

function openAddiLink() {
  const addiUrl = 'https://addi.com' // TODO: configurar URL real
  window.open(addiUrl, '_blank')
}

// Generar RequestId único para evitar duplicados
const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Computed para verificar si es crédito
const isCredit = computed(() => {
  const method = paymentMethods.value.find(pm => pm.id === form.value.paymentMethodId)
  return method?.code === 'CREDIT'
})

// Computed para subtotal
const subtotalAmount = computed(() => 
  form.value.details.reduce((sum, d) => sum + ((d.unitPrice || 0) * (d.quantity || 1)), 0)
)

// Computed para descuento calculado
const calculatedDiscount = computed(() => 
  Math.round(subtotalAmount.value * (form.value.discountPercent || 0) / 100)
)

// Computed para total final
const calculatedTotal = computed(() => subtotalAmount.value - calculatedDiscount.value)

// Funciones de productos
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

function onProductSelect(detail, product) {
  detail.productId = product.id
  detail.productName = product.name
  detail.unitPrice = product.salePrice || 0
  detail.stock = product.stock || 0
}

async function openSaleModal() {
  // Cargar datos necesarios si no están cargados
  if (paymentMethods.value.length === 0) {
    try {
      const res = await api.get('/PaymentMethod')
      paymentMethods.value = res.data.data
    } catch (err) {
      toast.show('Error cargando métodos de pago', 'error')
      return
    }
  }

  if (customers.value.length === 0) {
    try {
      const res = await api.get('/Customer', { params: { pageSize: 100 } })
      customers.value = res.data.data.data
    } catch (err) {
      toast.show('Error cargando clientes', 'error')
      return
    }
  }

  // Resetear formulario
  form.value = {
    paymentMethodId: null,
    customerId: '',
    numberOfInstallments: 1,
    discountPercent: 0,
    notes: '',
    requestId: generateRequestId(),
    details: [{ productId: '', quantity: 1, unitPrice: 0, stock: 0 }]
  }

  showSaleModal.value = true
}

async function saveSale() {
  // Validaciones
  if (!form.value.paymentMethodId) {
    toast.show('Selecciona un método de pago', 'warning')
    return
  }

  if (isCredit.value && !form.value.customerId) {
    toast.show('El cliente es obligatorio para ventas a crédito', 'warning')
    return
  }

  if (form.value.details.some(d => !d.productId)) {
    toast.show('Completa todos los productos', 'warning')
    return
  }

  if (hasStockErrors.value) {
    toast.show('Corrige los problemas de stock antes de continuar', 'error')
    return
  }

  try {
    saving.value = true

    const payload = {
      requestId: form.value.requestId,
      paymentMethodId: form.value.paymentMethodId,
      customerId: form.value.customerId || null,
      numberOfInstallments: form.value.numberOfInstallments,
      discountPercent: form.value.discountPercent || 0,
      discountAmount: calculatedDiscount.value,
      notes: form.value.notes || null,
      details: form.value.details
        .filter(d => d.productId && d.unitPrice > 0)
        .map(d => ({
          productId: d.productId,
          quantity: Number(d.quantity) || 1,
          unitPrice: Number(d.unitPrice)
        }))
    }

    if (payload.details.length === 0) {
      toast.show('Agrega al menos un producto', 'warning')
      return
    }

    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    
    showSaleModal.value = false
    loadDashboard() // Recargar dashboard para mostrar la nueva venta
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar venta', 'error')
  } finally {
    saving.value = false
  }
}

const stats = computed(() => {
  if (!summary.value) return []
  return [
    {
      label: 'Ventas hoy',
      value: `$${formatNumber(summary.value.todaySalesAmount || 0)}`,
      sub: `${summary.value.todaySalesCount || 0} transacciones`,
      icon: '◆',
      color: 'var(--color-text)',
      subColor: 'var(--color-text-muted)'
    },
    {
      label: 'Créditos pendientes',
      value: `$${formatNumber(summary.value.pendingCreditsAmount || 0)}`,
      sub: `${summary.value.pendingCreditsCount || 0} deudores`,
      icon: '◇',
      color: summary.value.pendingCreditsCount > 0 ? 'var(--color-danger)' : 'var(--color-text)',
      subColor: 'var(--color-danger)'
    },
    {
      label: 'Stock bajo',
      value: summary.value.lowStockCount || 0,
      sub: summary.value.lowStockCount > 0 ? 'Requieren atención' : 'Todo en orden ✓',
      icon: '◰',
      color: summary.value.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
      subColor: summary.value.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'
    }
  ]
})

async function loadSummary() {
  try {
    const res = await api.get('/Dashboard/summary')
    summary.value = res.data.data
  } catch (err) {
    // Fallback a endpoint anterior si el nuevo no existe
    try {
      const dashRes = await api.get('/Dashboard')
      summary.value = {
        todaySalesAmount: dashRes.data.data.todaySales,
        todaySalesCount: dashRes.data.data.todayTransactions,
        activeProducts: 0,
        pendingCreditsAmount: dashRes.data.data.pendingCreditsAmount,
        pendingCreditsCount: dashRes.data.data.pendingCredits,
        lowStockCount: 0
      }
    } catch {
      // Silenciar error si tampoco existe el anterior
    }
  }
}

async function loadDashboard() {
  try {
    loading.value = true
    await loadSummary()
    
    // ✅ Cargar customers primero
    await loadCustomersMap()
    
    const [salesRes, stockRes] = await Promise.all([
      api.get('/Sale', { params: { pageSize: 5 } }),
      api.get('/Product/low-stock')
    ])
    
    // ✅ Enriquecer ventas con customerName
    const rawSales = (salesRes.data.data?.data || []).slice(0, 5)
    recentSales.value = rawSales.map(sale => ({
      ...sale,
      customerName: sale.customerName || (sale.customerId ? customersMap.value[sale.customerId] : null)
    }))
    
    lowStock.value = stockRes.data.data || []
    
    // Actualizar lowStockCount si no vino del summary
    if (summary.value) {
      summary.value.lowStockCount = lowStock.value.length
    }
  } catch (err) {
    toast.show('Error al cargar el dashboard', 'error')
  } finally {
    loading.value = false
  }
}

// ✅ Función para cargar customers
const customersMap = ref({})
async function loadCustomersMap() {
  try {
    const res = await api.get('/Customer', { params: { pageSize: 200 } })
    const customersList = res.data.data?.data || []
    const map = {}
    customersList.forEach(c => {
      map[c.id] = c.name
    })
    customersMap.value = map
  } catch {
    customersMap.value = {}
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

.action-buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-white);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: var(--transition);
}

.action-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-card-addi {
  border-color: #4CAF50;
}

.action-card-addi:hover {
  border-color: #388E3C;
  background: #E8F5E9;
}

.action-icon {
  font-size: 28px;
}

.action-info {
  flex: 1;
}

.action-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.action-sub {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.action-arrow {
  font-size: 18px;
  color: var(--color-text-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.stat-card {
  position: relative;
  background: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 16px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: var(--color-accent-light);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-icon {
  font-size: 24px;
  color: var(--color-accent);
  opacity: 0.25;
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  opacity: 0.6;
  transform: scale(1.1);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.stat-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 14px;
}

.loading-text {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 20px 0;
  text-align: center;
}

.empty-text {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 20px 0;
  text-align: center;
}

.success-text { color: var(--color-success); }

/* Estilos del modal de venta */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 13px; }
.hint-text { font-size: 12px; color: var(--color-accent); margin-top: 6px; }

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

.sale-product-row {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 10px;
  background: var(--color-bg);
}

.sale-product-search { margin-bottom: 8px; }

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

.subtotal-group { text-align: right; }

.subtotal-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  padding: 8px 0;
}

.stock-badge { margin-top: 6px; }

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

.input-error { border-color: var(--color-danger) !important; }

.stock-error-msg {
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
  margin-top: 10px;
}

.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  transition: var(--transition);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.btn-icon:hover { background: var(--color-accent-light); }

.btn-icon-danger:hover {
  background: #FFEBEE;
  color: var(--color-danger);
}
</style>
