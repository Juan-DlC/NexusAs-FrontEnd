<template>
  <ModalBase 
    :model-value="props.modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    title="Nueva venta" 
    width="900px"
  >
    <form @submit.prevent="saveSale">
      <!-- Sección: Información básica -->
      <div class="form-section">
        <h3 class="section-title">📋 Información de la venta</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Método de pago</label>
            <select v-model.number="form.paymentMethodId" class="form-input" required>
              <option :value="null" disabled>Selecciona método de pago</option>
              <option v-if="props.paymentMethods.length === 0" value="Cash">Contado</option>
              <option v-if="props.paymentMethods.length === 0" value="Credit">Crédito</option>
              <option v-for="pm in props.paymentMethods" :key="pm.id" :value="pm.id">
                {{ pm.name }}
              </option>
            </select>
          </div>

          <div class="form-group" v-if="isCredit">
            <label class="form-label">Cliente (obligatorio para crédito)</label>
            <select v-model="form.customerId" class="form-input" required>
              <option value="" disabled>Selecciona un cliente</option>
              <option v-for="c in props.customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="form-group" v-if="!isCredit">
            <label class="form-label">Cliente (opcional)</label>
            <select v-model="form.customerId" class="form-input">
              <option value="">Sin cliente</option>
              <option v-for="c in props.customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isCredit && form.details.some(d => d.productId)">
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
        </div>
      </div>

      <!-- Sección: Productos -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">🛍️ Productos</h3>
          <button type="button" class="btn btn-secondary btn-sm" @click="addDetail">
            + Agregar producto
          </button>
        </div>

        <div v-for="(detail, index) in form.details" :key="index" class="sale-product-row">
          <div class="sale-product-search">
            <ProductSearch @select="(p) => onProductSelect(detail, p)" placeholder="🔍 Buscar producto..." />
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
              title="Quitar producto"
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
      </div>

      <!-- Sección: Detalles adicionales -->
      <div class="form-section">
        <h3 class="section-title">💰 Descuento y notas</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Descuento % (opcional)</label>
            <div class="discount-input-wrapper">
              <input v-model.number="form.discountPercent" type="number" min="0" max="100" class="form-input discount-input" placeholder="0" />
              <span class="discount-symbol">%</span>
              <span v-if="form.discountPercent > 0" class="discount-amount">
                = -${{ formatNumber(discountAmount) }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notas (opcional)</label>
            <input v-model="form.notes" type="text" class="form-input" @input="form.notes = toUpperCase(form.notes)" placeholder="Agregar notas..." />
          </div>
        </div>
      </div>

      <!-- Caja de total -->
      <div class="sale-total-box">
        <div class="total-line" v-if="form.discountPercent > 0">
          <span>Subtotal</span>
          <span>${{ formatNumber(subtotalAmount) }}</span>
        </div>
        <div class="total-line discount" v-if="form.discountPercent > 0">
          <span>Descuento ({{ form.discountPercent }}%)</span>
          <span class="discount-text">-${{ formatNumber(discountAmount) }}</span>
        </div>
        <div class="total-line total-final">
          <span><strong>Total</strong></span>
          <strong class="total-amount">${{ formatNumber(calculatedTotal) }}</strong>
        </div>
      </div>
      
      <p class="stock-error-msg" v-if="hasStockErrors">
        ⚠️ Corrige las cantidades en rojo antes de continuar.
      </p>
    </form>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primary" @click="saveSale" :disabled="saving || hasStockErrors">
        {{ saving ? 'Guardando...' : 'Registrar venta' }}
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  customers: { type: Array, default: () => [] },
  paymentMethods: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'sale-created'])

const toast = useToastStore()

const saving = ref(false)

const form = ref({
  paymentMethodId: null,
  customerId: '',
  numberOfInstallments: 1,
  discountPercent: 0,
  notes: '',
  requestId: '',
  details: [{ productId: '', quantity: 1, unitPrice: 0, stock: 0 }]
})

const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Inicializar requestId
form.value.requestId = generateRequestId()

const subtotalAmount = computed(() => {
  return form.value.details.reduce(
    (sum, d) => sum + (d.quantity * d.unitPrice || 0), 0
  )
})

const discountAmount = computed(() => {
  const subtotal = form.value.details.reduce(
    (sum, d) => sum + (d.quantity * d.unitPrice || 0), 0
  )
  return Math.round(subtotal * (form.value.discountPercent || 0) / 100)
})

const calculatedTotal = computed(() => {
  const subtotal = form.value.details.reduce(
    (sum, d) => sum + (d.quantity * d.unitPrice || 0), 0
  )
  return subtotal - discountAmount.value
})

const selectedPaymentMethod = computed(() => {
  return props.paymentMethods.find(pm => pm.id === form.value.paymentMethodId)
})

const isCredit = computed(() => {
  return selectedPaymentMethod.value?.code === 'CREDIT'
})

const hasStockErrors = computed(() =>
  form.value.details.some(d => isStockExceeded(d))
)

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

function addDetail() {
  form.value.details.push({ productId: '', quantity: 1, unitPrice: 0, stock: 0 })
}

function removeDetail(index) {
  if (form.value.details.length > 1) {
    form.value.details.splice(index, 1)
  }
}

async function saveSale() {
  // ✅ VALIDACIÓN: Método de pago es obligatorio
  if (!form.value.paymentMethodId || form.value.paymentMethodId <= 0) {
    toast.show('Debe seleccionar un método de pago', 'warning')
    return
  }
  
  // ✅ VALIDACIÓN: Cliente obligatorio para crédito
  if (isCredit.value && !form.value.customerId) {
    toast.show('Debe seleccionar un cliente para ventas a crédito', 'warning')
    return
  }
  
  // ✅ VALIDACIÓN: Al menos un producto válido
  const validDetails = form.value.details.filter(d => d.productId && d.productId > 0)
  if (validDetails.length === 0) {
    toast.show('Debe agregar al menos un producto a la venta', 'warning')
    return
  }
  
  try {
    saving.value = true
    const payload = {
      requestId: form.value.requestId,
      paymentMethodId: form.value.paymentMethodId,
      customerId: form.value.customerId || null,
      numberOfInstallments: form.value.numberOfInstallments || 1,
      discountPercent: form.value.discountPercent || 0,
      discountAmount: discountAmount.value,
      notes: form.value.notes || null,
      // ✅ Solo enviar detalles válidos (backend también filtra, pero mejor UX)
      details: validDetails.map(d => ({
        productId: d.productId,
        quantity: Number(d.quantity) || 1,
        unitPrice: Number(d.unitPrice) || 0
      }))
    }
    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    
    // Regenerar requestId y resetear formulario
    form.value = {
      paymentMethodId: null,
      customerId: '',
      numberOfInstallments: 1,
      discountPercent: 0,
      notes: '',
      requestId: generateRequestId(),
      details: [{ productId: '', quantity: 1, unitPrice: 0, stock: 0 }]
    }
    
    emit('sale-created')
    emit('update:modelValue', false)
  } catch (err) {
    const errorMsg = err.response?.data?.message || 
      (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Error al registrar la venta')
    toast.show(errorMsg, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 10px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.sale-product-row {
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  background: #fefefe;
}

.sale-product-search {
  margin-bottom: 8px;
}

.sale-product-controls {
  display: grid;
  grid-template-columns: 90px 1fr 1fr auto;
  gap: 10px;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.subtotal-group {
  text-align: right;
}

.subtotal-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  padding: 8px 0;
}

.stock-badge {
  margin-top: 6px;
}

.discount-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discount-input {
  max-width: 100px;
}

.discount-symbol {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.discount-amount {
  font-size: 13px;
  color: var(--color-success);
  font-weight: 600;
}

.sale-total-box {
  background: transparent;
  border: 1px solid #c0c0c0;
  border-radius: 8px;
  padding: 14px 16px;
  margin-top: 12px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 3px 0;
  color: var(--color-text);
}

.total-line.discount .discount-text {
  color: var(--color-success);
}

.total-line.total-final {
  padding-top: 8px;
  margin-top: 6px;
  font-size: 15px;
}

.total-amount {
  font-size: 18px;
  color: var(--color-accent);
}

.qty-input, .price-input { 
  padding: 9px 8px; 
}

.hint-text {
  font-size: 11px;
  color: var(--color-accent);
  margin-top: 3px;
  font-weight: 500;
}

.stock-error-msg {
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
  margin-top: 10px;
  font-weight: 600;
  padding: 6px;
  background: #ffebee;
  border-radius: 4px;
}

.input-error { 
  border-color: var(--color-danger) !important; 
  background: #fff5f5;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon-danger {
  background: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid #d0d0d0;
  font-size: 15px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-danger:hover { 
  background: #FFEBEE; 
  color: var(--color-danger); 
  border-color: var(--color-danger);
}

.btn-sm {
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
}
</style>
