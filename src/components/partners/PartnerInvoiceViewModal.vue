<template>
  <ModalBase
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Detalle de factura"
    width="920px"
    :z-index="1050"
  >
    <div v-if="loading" class="state-text">Cargando detalle...</div>
    
    <div v-else-if="invoiceDetail">
      <div class="detail-summary">
        <div class="summary-row">
          <div class="summary-item">
            <span class="summary-label">Factura:</span>
            <strong>{{ invoiceDetail.saleNumber }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">Fecha:</span>
            <strong>{{ formatDate(invoiceDetail.date) }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total:</span>
            <strong class="summary-total">${{ formatNumber(invoiceDetail.total) }}</strong>
          </div>
        </div>
        <p v-if="invoiceDetail.notes" class="summary-notes">
          <strong>Notas:</strong> {{ invoiceDetail.notes }}
        </p>
      </div>

      <div class="divider-label">Productos</div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in invoiceDetail.details" :key="i">
            <td class="td-code">{{ d.productCode || '-' }}</td>
            <td class="td-name">{{ d.productName }}</td>
            <td class="td-desc">{{ d.productDescription || '-' }}</td>
            <td class="td-qty">{{ d.quantity }}</td>
            <td class="td-price">${{ formatNumber(d.unitPrice) }}</td>
            <td class="td-subtotal">${{ formatNumber(d.subtotal) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="td-total-label">Total</td>
            <td class="td-total-value">${{ formatNumber(invoiceDetail.total) }}</td>
          </tr>
        </tfoot>
      </table>

      <div v-if="invoiceDetail.creditInfo" class="credit-box">
        <div class="divider-label">Estado del crédito</div>
        <div class="credit-row">
          <div class="credit-item">
            <span class="credit-label">Total:</span>
            <strong class="credit-total">${{ formatNumber(invoiceDetail.total) }}</strong>
          </div>
          <div class="credit-item success">
            <span class="credit-label">Abonado:</span>
            <strong class="credit-value">${{ formatNumber(invoiceDetail.creditInfo.paidAmount || 0) }}</strong>
          </div>
          <div class="credit-item danger">
            <span class="credit-label">Pendiente:</span>
            <strong class="credit-value">${{ formatNumber(invoiceDetail.creditInfo.pendingAmount || 0) }}</strong>
          </div>
        </div>

        <!-- Mostrar historial de abonos si existen -->
        <div v-if="invoiceDetail.creditInfo.payments && invoiceDetail.creditInfo.payments.length > 0" class="payments-section">
          <div class="divider-label" style="margin-top: 12px; padding-top: 12px;">Historial de abonos</div>
          <table class="payments-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in invoiceDetail.creditInfo.payments" :key="payment.id">
                <td>{{ formatDate(payment.paymentDate || payment.date) }}</td>
                <td class="payment-amount">${{ formatNumber(payment.amount) }}</td>
                <td class="payment-notes">{{ payment.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cerrar</button>
      <button class="btn btn-primary" @click="downloadPartnerInvoicePdf">
        📄 Descargar PDF mayorista
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import { formatNumber, formatDate } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  saleId: { type: Number, default: null }
})

defineEmits(['update:modelValue'])

const toast = useToastStore()
const loading = ref(false)
const invoiceDetail = ref(null)

watch(() => props.saleId, (newId) => {
  if (newId && props.modelValue) {
    loadInvoiceDetail(newId)
  }
}, { immediate: true })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.saleId) {
    loadInvoiceDetail(props.saleId)
  }
})

async function loadInvoiceDetail(saleId) {
  try {
    loading.value = true
    const res = await api.get(`/Sale/${saleId}`)
    invoiceDetail.value = res.data.data
  } catch (error) {
    console.error('Error cargando detalle de factura:', error)
    toast.show('Error al cargar el detalle de la factura', 'error')
  } finally {
    loading.value = false
  }
}

async function downloadPartnerInvoicePdf() {
  if (!props.saleId) return

  try {
    const res = await api.get(`/Sale/${props.saleId}/partner-invoice-pdf`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    toast.show('PDF descargado correctamente', 'success')
  } catch (error) {
    console.error('Error al descargar PDF:', error)
    toast.show('Error al descargar el PDF', 'error')
  }
}
</script>

<style scoped>
.state-text {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.detail-summary {
  background: var(--color-bg);
  padding: 16px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 18px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 8px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.summary-item strong {
  font-size: 15px;
  color: var(--color-text);
}

.summary-total {
  color: var(--color-accent) !important;
  font-size: 17px !important;
}

.summary-notes {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.divider-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 18px 0 12px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.divider-label:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

thead th {
  background: var(--color-bg);
  padding: 10px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--color-border);
}

tbody td {
  padding: 12px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

tfoot tr {
  border-top: 2px solid var(--color-border);
}

tfoot td {
  padding: 12px 8px;
  font-weight: 600;
}

.td-code {
  width: 100px;
  font-weight: 500;
  color: var(--color-accent);
  font-family: 'Courier New', monospace;
}

.td-name {
  min-width: 160px;
  font-weight: 600;
}

.td-desc {
  min-width: 200px;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.td-qty {
  width: 70px;
  text-align: center;
  font-weight: 500;
}

.td-price, .td-subtotal {
  width: 100px;
  text-align: right;
  font-weight: 500;
}

.td-total-label {
  text-align: right;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.td-total-value {
  text-align: right;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-accent);
}

.credit-box {
  background: linear-gradient(135deg, #FFF9F5 0%, #FFF5EF 100%);
  padding: 16px 18px;
  border-radius: var(--radius-md);
  margin-top: 18px;
  border: 1px solid rgba(200, 149, 108, 0.2);
}

.credit-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.credit-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.credit-item.success {
  background: #F0FFF4;
  border-color: var(--color-success);
}

.credit-item.danger {
  background: #FFF5F5;
  border-color: var(--color-danger);
}

.credit-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.credit-value {
  font-size: 18px;
  font-weight: 700;
}

.credit-item.success .credit-value {
  color: var(--color-success);
}

.credit-item.danger .credit-value {
  color: var(--color-danger);
}

.credit-total {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.payments-section {
  margin-top: 16px;
}

.payments-table {
  margin-top: 8px;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.payments-table thead th {
  background: var(--color-bg);
  font-size: 11px;
}

.payments-table tbody td {
  padding: 10px 8px;
  font-size: 12px;
}

.payment-amount {
  font-weight: 600;
  color: var(--color-success);
  text-align: right;
}

.payment-notes {
  color: var(--color-text-muted);
  font-style: italic;
}

.btn {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.btn-secondary {
  background: var(--color-white);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-bg);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}
</style>
