<template>
  <ModalBase 
    :model-value="props.modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    :title="`Nueva venta — ${props.partner?.partnerName || ''}`" 
    width="900px"
  >
    <form @submit.prevent="saveSale">
      <!-- Sección: Información básica -->
      <div class="form-section">
        <h3 class="section-title">📋 Información de la venta</h3>
        
        <div class="invoice-ref">
          Registrando venta a nombre de: <strong>{{ props.partner?.partnerName }}</strong>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Método de pago</label>
            <select v-model.number="form.paymentMethodId" class="form-input" required>
              <option :value="null" disabled>Selecciona método de pago</option>
              <option v-for="pm in props.paymentMethods" :key="pm.id" :value="pm.id">
                {{ pm.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div v-if="form.paymentMethodId" :class="['payment-info', isCredit ? 'payment-info-credit' : 'payment-info-cash']">
          {{ isCredit ? '⚠️ Esta venta generará deuda para mayorista' : '✅ Venta de contado, no genera deuda' }}
        </div>
      </div>

      <!-- Sección: Productos -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">🛍️ Productos</h3>
        </div>

        <div v-for="(detail, index) in form.details" :key="index" class="sale-product-row">
          <div v-if="!detail.productId" class="sale-product-search">
            <ProductSearch 
              @select="(p) => onProductSelect(detail, p)" 
              placeholder="🔍 Buscar producto..." 
              :excludeProducts="getExcludedProducts()"
            />
          </div>
          
          <div class="sale-product-line" v-if="detail.productId">
            <div class="product-info">
              <div class="product-name-display">
                <div class="product-text">
                  <span class="product-name">{{ detail.productName }}</span>
                  <span v-if="detail.productDescription" class="product-desc-inline"> - {{ detail.productDescription }}</span>
                </div>
                <button 
                  type="button" 
                  class="btn-edit-product" 
                  @click="clearProduct(detail)"
                  title="Cambiar producto"
                >
                  ✏️
                </button>
              </div>
            </div>
            
            <div class="control-group">
              <label class="control-label">Cantidad</label>
              <input 
                :value="detail.quantity"
                type="text" 
                inputmode="numeric"
                class="form-input qty-input"
                :class="{ 'input-error': detail.quantity > detail.stock }"
                @input="handleQuantityInput($event, detail)"
                @keypress="onlyNumbers"
              />
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
          
          <div v-if="detail.productId" class="stock-badge">
            <span :class="['badge', detail.quantity > detail.stock ? 'badge-danger' : 'badge-success']">
              {{ detail.quantity > detail.stock 
                ? `⚠️ Stock insuficiente (${detail.quantity}/${detail.stock})` 
                : `✓ Stock: ${detail.stock}` 
              }}
            </span>
          </div>
          
          <!-- DETALLES ESPECÍFICOS DE MAYORISTA -->
          <div v-if="detail.productId" class="partner-sale-detail">
            <div class="price-row">
              <span>💰 Lo que paga mayorista ({{ detail.commissionPercent }}% ganancia):</span>
              <strong style="color: var(--color-accent); font-size: 13px;">${{ formatNumber(detail.partnerPrice) }}</strong>
            </div>
            <div class="price-row">
              <span>🏷️ Precio sugerido de venta al público:</span>
              <span style="color: var(--color-text-muted); font-size: 11px;">${{ formatNumber(detail.suggestedPrice) }}</span>
            </div>
            <div class="price-row">
              <span>📦 Subtotal ({{ detail.quantity }} × ${{ formatNumber(detail.partnerPrice) }}):</span>
              <strong style="font-size: 12px;">${{ formatNumber(detail.partnerPrice * (detail.quantity || 1)) }}</strong>
            </div>
            <div class="price-row" style="color: var(--color-text-muted); font-size: 10px;">
              <span>{{ detail.isPartnership ? '🤝 Producto de alianza' : '🏪 Producto tienda' }} — Ganancia mayorista: ${{ formatNumber(detail.partnerEarning) }} por unidad</span>
            </div>
          </div>
          
          <!-- Botón agregar producto DESPUÉS de cada producto -->
          <div v-if="detail.productId" class="add-product-row">
            <button type="button" class="btn btn-secondary btn-sm" @click="addDetail">
              + Agregar otro producto
            </button>
          </div>
        </div>
      </div>

      <!-- Sección: Detalles adicionales -->
      <div class="form-section">
        <h3 class="section-title">📝 Notas adicionales</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Notas (opcional)</label>
            <input v-model="form.notes" type="text" class="form-input" @input="form.notes = toUpperCase(form.notes)" placeholder="Agregar notas..." />
          </div>
        </div>
      </div>

      <!-- Caja de total -->
      <div class="sale-total-box">
        <div class="total-line total-final">
          <span><strong>Total a cobrar a mayorista</strong></span>
          <strong class="total-amount">${{ formatNumber(calculatedTotal) }}</strong>
        </div>
        <div class="total-line" style="font-size: 11px; color: var(--color-text-muted); padding-top: 2px;">
          <span>Precio sugerido total de venta al público:</span>
          <span>${{ formatNumber(form.details.reduce((s, d) => s + ((d.suggestedPrice || 0) * (d.quantity || 0)), 0)) }}</span>
        </div>
      </div>
      
      <p class="stock-error-msg" v-if="hasStockErrors">
        ⚠️ Corrige las cantidades en rojo antes de continuar.
      </p>
    </form>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primary" @click="saveSale" :disabled="saving || hasStockErrors">
        {{ saving ? 'Registrando...' : 'Registrar venta' }}
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  partner: { type: Object, required: true },
  paymentMethods: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'sale-created'])

const toast = useToastStore()

const saving = ref(false)

const form = ref({
  paymentMethodId: null,
  notes: '',
  requestId: '',
  details: [{ 
    productId: '', 
    productName: '',
    productDescription: '',
    quantity: 1, 
    unitPrice: 0, 
    partnerPrice: 0, 
    suggestedPrice: 0, 
    stock: 0,
    commissionPercent: 0,
    partnerEarning: 0,
    isPartnership: false
  }]
})

const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const isCredit = computed(() => {
  const method = props.paymentMethods.find(pm => pm.id === form.value.paymentMethodId)
  return method?.code === 'CREDIT'
})

const calculatedTotal = computed(() => {
  return form.value.details.reduce((sum, d) => {
    const price = Number(d.partnerPrice) || 0
    const qty = Number(d.quantity) || 1
    return sum + (price * qty)
  }, 0)
})

const hasStockErrors = computed(() =>
  form.value.details.some(d => d.productId && d.quantity > d.stock)
)

function onProductSelect(detail, product) {
  detail.productId = product.id
  detail.productName = product.name
  detail.productDescription = product.description || ''
  detail.stock = product.stock
  detail.suggestedPrice = product.salePrice || 0
  detail.isPartnership = product.isPartnership || false

  const commissionPercent = product.isPartnership
    ? (props.partner.allianceCommissionPercent || 20)
    : (props.partner.commissionPercent || 50)

  const gainAS = (product.salePrice || 0) - (product.cost || 0)
  const partnerEarning = gainAS * commissionPercent / 100
  const calculatedPartnerPrice = (product.salePrice || 0) - partnerEarning

  detail.partnerPrice = Math.round(calculatedPartnerPrice)
  detail.partnerEarning = Math.round(partnerEarning)
  detail.commissionPercent = commissionPercent
  detail.unitPrice = detail.partnerPrice
}

function clearProduct(detail) {
  detail.productId = ''
  detail.productName = ''
  detail.productDescription = ''
  detail.unitPrice = 0
  detail.partnerPrice = 0
  detail.suggestedPrice = 0
  detail.stock = 0
  detail.commissionPercent = 0
  detail.partnerEarning = 0
  detail.isPartnership = false
}

function handleNumericInput(event, callback) {
  const value = event.target.value.replace(/[^0-9]/g, '')
  callback(value === '' ? 0 : parseInt(value))
}

function handleQuantityInput(event, detail) {
  const value = event.target.value.replace(/[^0-9]/g, '')
  detail.quantity = value === '' ? 1 : parseInt(value)
}

function onlyNumbers(event) {
  const charCode = event.which ? event.which : event.keyCode
  if (charCode < 48 || charCode > 57) {
    event.preventDefault()
  }
}

function addDetail() {
  form.value.details.push({ 
    productId: '', 
    productName: '',
    productDescription: '',
    quantity: 1, 
    unitPrice: 0, 
    partnerPrice: 0, 
    suggestedPrice: 0, 
    stock: 0,
    commissionPercent: 0,
    partnerEarning: 0,
    isPartnership: false
  })
}

function removeDetail(index) {
  if (form.value.details.length > 1) {
    form.value.details.splice(index, 1)
  }
}

function getExcludedProducts() {
  // Generar array con productos ya agregados y su cantidad total usada
  const productMap = {}
  
  form.value.details.forEach(detail => {
    if (detail.productId) {
      if (!productMap[detail.productId]) {
        productMap[detail.productId] = {
          productId: detail.productId,
          quantityUsed: 0,
          stock: detail.stock
        }
      }
      productMap[detail.productId].quantityUsed += detail.quantity || 0
    }
  })
  
  return Object.values(productMap)
}

async function saveSale() {
  // Validaciones
  if (!form.value.paymentMethodId) {
    toast.show('Selecciona un método de pago', 'warning')
    return
  }

  const validDetails = form.value.details.filter(d => d.productId && d.partnerPrice > 0)
  
  if (validDetails.length === 0) {
    toast.show('Debe agregar al menos un producto a la venta', 'warning')
    return
  }

  if (validDetails.some(d => d.quantity > d.stock)) {
    toast.show('Hay productos con cantidad superior al stock disponible', 'warning')
    return
  }

  try {
    saving.value = true

    const payload = {
      requestId: form.value.requestId,
      partnerUserId: props.partner.userId,
      paymentMethodId: form.value.paymentMethodId,
      numberOfInstallments: 1,
      discount: 0,
      notes: form.value.notes || null,
      details: validDetails.map(d => ({
        productId: d.productId,
        quantity: Number(d.quantity) || 1,
        unitPrice: Number(d.partnerPrice)
      }))
    }

    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    
    // Regenerar requestId y resetear formulario
    const defaultMethod = props.paymentMethods.find(pm => pm.code === 'CASH')
    form.value = {
      paymentMethodId: defaultMethod?.id || null,
      notes: '',
      requestId: generateRequestId(),
      details: [{ 
        productId: '', 
        productName: '',
        productDescription: '',
        quantity: 1, 
        unitPrice: 0, 
        partnerPrice: 0, 
        suggestedPrice: 0, 
        stock: 0,
        commissionPercent: 0,
        partnerEarning: 0,
        isPartnership: false
      }]
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

// Reset form when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const defaultMethod = props.paymentMethods.find(pm => pm.code === 'CASH')
    form.value = {
      paymentMethodId: defaultMethod?.id || null,
      notes: '',
      requestId: generateRequestId(),
      details: [{ 
        productId: '', 
        productName: '',
        productDescription: '',
        quantity: 1, 
        unitPrice: 0, 
        partnerPrice: 0, 
        suggestedPrice: 0, 
        stock: 0,
        commissionPercent: 0,
        partnerEarning: 0,
        isPartnership: false
      }]
    }
  }
})
</script>

<style scoped>
/* === ESTRUCTURA COPIADA DE SaleFormModal (COMPACTADA) === */

.form-section {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 4px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 5px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.form-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.sale-product-row {
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 5px;
  margin-bottom: 4px;
  background: #fefefe;
}

.sale-product-search {
  width: 100%;
}

.sale-product-line {
  display: grid;
  grid-template-columns: 1fr 90px auto;
  gap: 6px;
  align-items: end;
}

.product-info {
  min-width: 0;
}

.product-name-display {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  padding: 6px 8px;
  background: var(--color-bg);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.product-text {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.product-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-desc-inline {
  font-size: 11px;
  font-style: italic;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-edit-product {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 3px 5px;
  border-radius: 4px;
  transition: var(--transition);
  opacity: 0.6;
  flex-shrink: 0;
}

.btn-edit-product:hover {
  opacity: 1;
  background: #e0e0e0;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-label {
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.stock-badge {
  margin-top: 2px;
}

.sale-total-box {
  background: transparent;
  border: 1px solid #c0c0c0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 6px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 2px 0;
  color: var(--color-text);
}

.total-line.total-final {
  padding-top: 4px;
  margin-top: 3px;
  font-size: 14px;
}

.total-amount {
  font-size: 17px;
  color: var(--color-accent);
}

.qty-input { 
  padding: 6px 5px; 
}

.stock-error-msg {
  font-size: 11px;
  color: var(--color-danger);
  text-align: center;
  margin-top: 5px;
  font-weight: 600;
  padding: 4px;
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
  width: 30px;
  height: 30px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid #d0d0d0;
  font-size: 14px;
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
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

/* === ESTILOS ESPECÍFICOS DE MAYORISTA === */

.invoice-ref {
  background: var(--color-accent-light);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  font-size: 12px;
  border-left: 3px solid var(--color-accent);
}

.payment-info {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  margin-top: 5px;
  margin-bottom: 8px;
}

.payment-info-credit {
  background: #FFF3E0;
  color: var(--color-warning);
}

.payment-info-cash {
  background: #E8F5E9;
  color: var(--color-success);
}

.partner-sale-detail {
  background: var(--color-accent-light);
  border: 1px solid var(--color-border);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  margin-top: 4px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.price-row:last-child {
  border-bottom: none;
}

.add-product-row {
  margin-top: 6px;
  text-align: center;
}

.add-product-row .btn {
  width: 100%;
}
</style>
