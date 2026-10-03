<template>
  <ModalBase
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Vista previa de la factura"
    width="800px"
    :z-index="1100"
  >
    <div class="preview-container">
      <!-- Header simplificado sin logo -->
      <div class="preview-header">
        <div class="company-info">
          <h2 class="company-name">AS ACCESORIOS</h2>
          <p class="invoice-type">{{ isPartnerSale ? 'FACTURA MAYORISTA' : 'FACTURA' }}</p>
        </div>
      </div>

      <!-- Info de la factura -->
      <div class="invoice-info">
        <div class="info-row">
          <span class="info-label">Fecha:</span>
          <span>{{ currentDate }}</span>
        </div>
        <div class="info-row" v-if="customerName">
          <span class="info-label">{{ isPartnerSale ? 'Mayorista:' : 'Cliente:' }}</span>
          <span>{{ customerName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Método de pago:</span>
          <span>{{ paymentMethodName }}</span>
        </div>
        <div class="info-row" v-if="numberOfInstallments > 1">
          <span class="info-label">Cuotas:</span>
          <span>{{ numberOfInstallments }} cuotas de ${{ formatNumber(totalAmount / numberOfInstallments) }}</span>
        </div>
      </div>

      <!-- Detalle de productos -->
      <div class="products-section">
        <h3 class="section-title">DETALLE DE PRODUCTOS</h3>
        <table class="products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(detail, i) in validDetails" :key="i">
              <td>
                <div class="product-cell">
                  <span class="product-name">{{ detail.productName }}</span>
                  <span v-if="detail.productDescription" class="product-desc">{{ detail.productDescription }}</span>
                </div>
              </td>
              <td class="text-center">{{ detail.quantity }}</td>
              <td class="text-right">${{ formatNumber(detail.unitPrice) }}</td>
              <td class="text-right"><strong>${{ formatNumber(detail.quantity * detail.unitPrice) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Notas -->
      <div v-if="notes" class="notes-section">
        <div class="note-box">
          <span class="note-icon">📝</span>
          <span class="note-text">{{ notes }}</span>
        </div>
      </div>

      <!-- Totales -->
      <div class="totals-section">
        <div class="total-row" v-if="discountPercent > 0">
          <span>Subtotal</span>
          <span>${{ formatNumber(subtotalAmount) }}</span>
        </div>
        <div class="total-row discount-row" v-if="discountPercent > 0">
          <span>Descuento ({{ discountPercent }}%)</span>
          <span class="discount-text">-${{ formatNumber(discountAmount) }}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAL A PAGAR</span>
          <span class="total-amount">${{ formatNumber(totalAmount) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">
        ← Volver a editar
      </button>
      <button class="btn btn-success" @click="$emit('confirm')" :disabled="confirming">
        {{ confirming ? 'Procesando...' : '✓ Confirmar y generar venta' }}
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import { computed } from 'vue'
import ModalBase from '@/components/shared/ModalBase.vue'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  details: { type: Array, required: true },
  customerName: { type: String, default: '' },
  paymentMethodName: { type: String, required: true },
  numberOfInstallments: { type: Number, default: 1 },
  discountPercent: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  confirming: { type: Boolean, default: false },
  isPartnerSale: { type: Boolean, default: false }
})

defineEmits(['update:modelValue', 'confirm'])

const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const validDetails = computed(() => {
  return props.details.filter(d => d.productId && d.productId > 0)
})

const subtotalAmount = computed(() => {
  return validDetails.value.reduce((sum, d) => sum + (d.quantity * d.unitPrice || 0), 0)
})

const discountAmount = computed(() => {
  return Math.round(subtotalAmount.value * (props.discountPercent || 0) / 100)
})

const totalAmount = computed(() => {
  return subtotalAmount.value - discountAmount.value
})
</script>

<style scoped>
.preview-container {
  background: white;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.preview-header {
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-accent);
  margin-bottom: 12px;
}

.company-info {
  flex: 1;
}

.company-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 2px 0;
  letter-spacing: 1px;
}

.invoice-type {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invoice-info {
  background: var(--color-bg);
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--color-text);
}

.info-label {
  font-weight: 600;
  color: var(--color-text-muted);
}

.products-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.products-table {
  width: 100%;
  border-collapse: collapse;
}

.products-table thead th {
  background: #f5f5f5;
  padding: 8px 6px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid var(--color-border);
}

.products-table tbody td {
  padding: 8px 6px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-name {
  font-weight: 600;
  color: var(--color-text);
}

.product-desc {
  font-size: 11px;
  font-style: italic;
  color: var(--color-text-muted);
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.notes-section {
  margin-bottom: 12px;
}

.note-box {
  background: #fffbf0;
  border-left: 3px solid #ffc107;
  padding: 10px 12px;
  border-radius: 4px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.note-icon {
  font-size: 16px;
}

.note-text {
  font-size: 12px;
  color: var(--color-text);
  line-height: 1.4;
}

.totals-section {
  background: #f9f9f9;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 4px 0;
  color: var(--color-text);
}

.discount-row {
  color: var(--color-success);
}

.discount-text {
  font-weight: 600;
}

.total-final {
  padding-top: 8px;
  margin-top: 6px;
  border-top: 2px solid var(--color-border);
  font-size: 16px;
  font-weight: 700;
}

.total-amount {
  font-size: 20px;
  color: var(--color-accent);
  font-weight: 700;
}

.btn {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
}

.btn-secondary {
  background: white;
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-bg);
}

.btn-success {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.btn-success:hover {
  background: #2e7d32;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
