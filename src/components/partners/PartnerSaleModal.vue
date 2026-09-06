<template>
  <ModalBase :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :title="`Nueva venta — ${partner?.partnerName || ''}`" width="640px">
    <div class="invoice-ref">
      Registrando venta a nombre de: <strong>{{ partner?.partnerName }}</strong>
    </div>

    <div class="form-group">
      <label class="form-label">Método de pago <span style="color: var(--color-danger)">*</span></label>
      <select v-model.number="form.paymentMethodId" class="form-input" required>
        <option :value="null" disabled>Selecciona método de pago</option>
        <option v-for="pm in paymentMethods" :key="pm.id" :value="pm.id">
          {{ pm.name }}
        </option>
      </select>
    </div>

    <div v-if="form.paymentMethodId" :class="['payment-info', isCredit ? 'payment-info-credit' : 'payment-info-cash']">
      {{ isCredit ? '⚠️ Esta venta generará deuda para la socia' : '✅ Venta de contado, no genera deuda' }}
    </div>

    <div class="divider-label">Productos</div>

    <div v-for="(detail, index) in form.details" :key="index">
      <div class="detail-row-partner">
        <ProductSearch @select="(p) => onProductSelect(detail, p)" />
        <input
          v-model.number="detail.quantity"
          type="number"
          min="1"
          class="form-input qty-input"
          :class="{ 'input-error': detail.productId && detail.quantity > detail.stock }"
        />
        <div class="price-info" v-if="detail.productId">
          <span class="partner-price">A socia: ${{ formatNumber(detail.partnerPrice) }}</span>
          <span class="suggested-price">Sugerido: ${{ formatNumber(detail.suggestedPrice) }}</span>
        </div>
        <button
          type="button"
          class="btn-icon btn-icon-danger"
          @click="removeDetail(index)"
          v-if="form.details.length > 1"
        >
          ✕
        </button>
      </div>

      <div class="partner-sale-detail" v-if="detail.productId && detail.partnerPrice > 0">
        <div class="price-row">
          <span>💰 Lo que paga la socia ({{ detail.commissionPercent }}% ganancia):</span>
          <strong style="color: var(--color-accent); font-size: 15px;">${{ formatNumber(detail.partnerPrice) }}</strong>
        </div>
        <div class="price-row">
          <span>🏷️ Precio sugerido de venta al público:</span>
          <span style="color: var(--color-text-muted)">${{ formatNumber(detail.suggestedPrice) }}</span>
        </div>
        <div class="price-row">
          <span>📦 Subtotal ({{ detail.quantity }} × ${{ formatNumber(detail.partnerPrice) }}):</span>
          <strong>${{ formatNumber(detail.partnerPrice * (detail.quantity || 1)) }}</strong>
        </div>
        <div class="price-row" style="color: var(--color-text-muted); font-size: 11px;">
          <span>{{ detail.isPartnership ? '🤝 Producto de alianza' : '🏪 Producto tienda' }} — Ganancia socia: ${{ formatNumber(detail.partnerEarning) }} por unidad</span>
        </div>
      </div>

      <p class="stock-warning" v-if="detail.productId && detail.quantity > detail.stock">
        ⚠️ Stock insuficiente — disponible: {{ detail.stock }}
      </p>
    </div>

    <button type="button" class="btn btn-secondary btn-sm" @click="addDetail" style="margin-bottom: 16px;">
      + Agregar producto
    </button>

    <div class="form-group">
      <label class="form-label">Notas (opcional)</label>
      <input
        v-model="form.notes"
        type="text"
        class="form-input"
        @input="form.notes = toUpperCase(form.notes)"
      />
    </div>

    <div class="total-preview">
      <span>Total a cobrar a la socia:</span>
      <strong>${{ formatNumber(calculatedTotal) }}</strong>
    </div>
    <p style="font-size: 11px; color: var(--color-text-muted); text-align: right; margin-top: 4px;">
      Precio sugerido total de venta: ${{ formatNumber(form.details.reduce((s, d) => s + ((d.suggestedPrice || 0) * (d.quantity || 0)), 0)) }}
    </p>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primary" @click="saveSale" :disabled="saving">
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
  modelValue: Boolean,
  partner: Object,
  paymentMethods: Array
})

const emit = defineEmits(['update:modelValue', 'sale-created'])

const toast = useToastStore()
const saving = ref(false)

const form = ref({
  paymentMethodId: null,
  notes: '',
  requestId: '',
  details: [{ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 }]
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

function addDetail() {
  form.value.details.push({ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 })
}

function removeDetail(index) {
  if (form.value.details.length > 1) {
    form.value.details.splice(index, 1)
  }
}

function onProductSelect(detail, product) {
  detail.productId = product.id
  detail.productName = product.name
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

async function saveSale() {
  if (!form.value.paymentMethodId) {
    toast.show('Selecciona un método de pago', 'warning')
    return
  }

  if (form.value.details.some(d => !d.productId)) {
    toast.show('Selecciona un producto en cada fila', 'warning')
    return
  }

  if (form.value.details.some(d => !d.partnerPrice || d.partnerPrice <= 0)) {
    toast.show('Hay productos sin precio calculado', 'error')
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
      details: form.value.details
        .filter(d => d.productId && d.partnerPrice > 0)
        .map(d => ({
          productId: d.productId,
          quantity: Number(d.quantity) || 1,
          unitPrice: Number(d.partnerPrice)
        }))
    }

    if (payload.details.length === 0) {
      toast.show('Agrega al menos un producto válido', 'warning')
      return
    }

    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    emit('sale-created')
    emit('update:modelValue', false)
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar venta', 'error')
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
      details: [{ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 }]
    }
  }
})
</script>

<style scoped>
.invoice-ref {
  background: var(--color-accent-light);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 13px;
  border-left: 3px solid var(--color-accent);
}

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }

.payment-info {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  margin-top: 6px;
}

.payment-info-credit {
  background: #FFF3E0;
  color: var(--color-warning);
}

.payment-info-cash {
  background: #E8F5E9;
  color: var(--color-success);
}

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

.detail-row-partner {
  display: grid;
  grid-template-columns: 2fr 70px 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: start;
}

.qty-input { max-width: 80px; }
.input-error { border-color: var(--color-danger) !important; }

.price-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.partner-price {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
}

.suggested-price {
  font-size: 11px;
  color: var(--color-text-muted);
}

.partner-sale-detail {
  background: var(--color-accent-light);
  border: 1px solid var(--color-border);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin: -4px 0 12px 0;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.price-row:last-child {
  border-bottom: none;
}

.stock-warning {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: -4px;
  margin-bottom: 8px;
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

.btn-icon-danger:hover {
  background: #FFEBEE;
  color: var(--color-danger);
}

.total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-accent-light);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text);
  margin-top: 8px;
}

.total-preview strong { color: var(--color-accent); font-size: 17px; }
</style>
