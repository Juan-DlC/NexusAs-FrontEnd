<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Detalle de factura" 
    width="720px" 
    :z-index="1050"
  >
    <div v-if="invoice">
      <div class="detail-summary">
        <p><strong>Factura:</strong> {{ invoice.saleNumber }}</p>
        <p><strong>Fecha:</strong> {{ formatDate(invoice.date) }}</p>
        <p><strong>Total:</strong> ${{ formatNumber(invoice.total) }}</p>
        <p v-if="invoice.notes"><strong>Notas:</strong> {{ invoice.notes }}</p>
      </div>

      <div class="divider-label">Productos</div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in invoice.details" :key="i">
            <td>{{ d.productCode || d.code || '-' }}</td>
            <td>{{ d.productName }}</td>
            <td>{{ d.quantity }}</td>
            <td>${{ formatNumber(d.unitPrice) }}</td>
            <td>${{ formatNumber(d.subtotal) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="invoice.creditInfo" class="credit-box">
        <div class="divider-label">Estado del crédito</div>
        <p style="color: var(--color-danger)">
          <strong>Pendiente:</strong> ${{ formatNumber(invoice.creditInfo.pendingAmount) }}
        </p>
        <p style="color: var(--color-success)">
          <strong>Abonado:</strong> ${{ formatNumber(invoice.creditInfo.paidAmount) }}
        </p>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cerrar</button>
      <button class="btn btn-secondary" @click="downloadPdf">📄 Ver factura PDF</button>
      <button class="btn btn-secondary" @click="downloadPartnerInvoicePdf">📄 Factura para socia</button>
      <button class="btn btn-warning" @click="$emit('open-return')">↩ Registrar devolución</button>
      <button
        v-if="invoice?.creditInfo?.pendingAmount > 0"
        class="btn btn-primary"
        @click="$emit('open-payment')"
      >
        💳 Registrar abono
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import { formatNumber, formatDate } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  invoice: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'open-return', 'open-payment'])

const toast = useToastStore()

async function downloadPdf() {
  try {
    const res = await api.get(`/Sale/${props.invoice.id}/receipt`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al generar el PDF', 'error')
  }
}

async function downloadPartnerInvoicePdf() {
  if (!props.invoice?.id) return
  
  try {
    const res = await api.get(`/Sale/${props.invoice.id}/partner-receipt`, { 
      responseType: 'blob' 
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    toast.show('PDF generado correctamente', 'success')
  } catch {
    toast.show('Error al generar el PDF de socia', 'error')
  }
}
</script>

<style scoped>
.detail-summary {
  background: var(--color-bg);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.detail-summary p {
  font-size: 13px;
  margin-bottom: 6px;
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

.credit-box {
  background: var(--color-accent-light);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-top: 14px;
}

.credit-box p {
  font-size: 13px;
  margin-bottom: 6px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: var(--color-bg);
  padding: 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-border);
}

tbody td {
  padding: 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border);
}

.btn {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
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

.btn-warning {
  background: #FFF3E0;
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.btn-warning:hover {
  background: #FFE0B2;
}
</style>
