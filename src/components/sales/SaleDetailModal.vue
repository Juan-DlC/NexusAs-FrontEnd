<template>
  <ModalBase 
    v-model="props.modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    title="Detalle de venta" 
    width="560px"
  >
    <div v-if="props.sale">
      <div class="detail-summary">
        <p><strong>Factura:</strong> {{ props.sale.saleNumber }}</p>
        <p><strong>Cliente/Socia:</strong> {{ props.sale.customerName || props.sale.sellerName || 'Sin cliente' }}</p>
        <p><strong>Fecha:</strong> {{ formatDate(props.sale.date) }}</p>
        <p><strong>Vendedor:</strong> {{ props.sale.processedByName || props.sale.sellerName }}</p>
        <p><strong>Método:</strong>
          <span :class="['badge', props.sale.paymentMethodName === 'Contado' ? 'badge-success' : 'badge-warning']">
            {{ props.sale.paymentMethodName || 'Contado' }}
          </span>
        </p>
        <p v-if="props.sale.discountPercent > 0">
          <strong>Descuento:</strong> {{ props.sale.discountPercent }}%
          (-${{ formatNumber(props.sale.discount) }})
        </p>
        <p v-if="props.sale.notes"><strong>Notas:</strong> {{ props.sale.notes }}</p>
      </div>

      <div class="divider-label">Productos</div>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in props.sale.details" :key="i">
            <td>{{ d.productName }}</td>
            <td>{{ d.quantity }}</td>
            <td>${{ formatNumber(d.unitPrice) }}</td>
            <td>${{ formatNumber(d.subtotal) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-preview" style="margin-top: 14px;">
        <span>Total:</span>
        <strong>${{ formatNumber(props.sale.total) }}</strong>
      </div>

      <div v-if="props.sale.status === 'FullReturn'" class="return-notice">
        ↩ Esta venta fue completamente devuelta
      </div>
      <div v-else-if="props.sale.status === 'PartialReturn'" class="return-notice warning">
        ↩ Esta venta tiene devolución parcial
      </div>

      <div v-if="props.sale.creditInfo" class="credit-box" style="margin-top: 14px;">
        <div class="divider-label">Estado del crédito</div>
        <p><strong>Total:</strong> ${{ formatNumber(props.sale.creditInfo.totalAmount) }}</p>
        <p style="color: var(--color-success)">
          <strong>Abonado:</strong> ${{ formatNumber(props.sale.creditInfo.paidAmount) }}
        </p>
        <p style="color: var(--color-danger)">
          <strong>Pendiente:</strong> ${{ formatNumber(props.sale.creditInfo.pendingAmount) }}
        </p>

        <div v-if="props.sale.creditInfo.numberOfInstallments > 1" style="margin-top: 10px;">
          <p class="installments-title">Cuotas ({{ props.sale.creditInfo.numberOfInstallments }})</p>
          <div class="installment-item" v-for="inst in props.sale.creditInfo.installments" :key="inst.number">
            <span>Cuota {{ inst.number }}</span>
            <span>${{ formatNumber(inst.amount) }}</span>
            <span :class="['badge', inst.isPaid ? 'badge-success' : 'badge-warning']">
              {{ inst.isPaid ? 'Pagada' : 'Pendiente' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="props.sale.returns?.length > 0" style="margin-top: 14px;">
        <div class="divider-label">Devoluciones ({{ props.sale.returns.length }})</div>
        <div class="return-item-detail" v-for="ret in props.sale.returns" :key="ret.id">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span><strong>{{ formatDate(ret.date) }}</strong></span>
            <span style="color: var(--color-warning)">-${{ formatNumber(ret.totalReturned) }}</span>
          </div>
          <ul style="font-size:12px; margin-top:4px; padding-left:16px;">
            <li v-for="d in ret.details" :key="d.productId">
              {{ d.productName }} — {{ d.quantity }} unidad(es)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('update:modelValue', false)">
        Cerrar
      </button>
      <button 
        class="btn btn-secondary" 
        @click="showReturnModal = true"
        v-if="props.sale?.status !== 'FullReturn'"
      >
        ↩ Devolver productos
      </button>
      <button class="btn btn-primary" @click="downloadReceipt">
        📄 Ver recibo PDF
      </button>
    </template>

    <SaleReturnModal
      v-model="showReturnModal"
      :sale="props.sale"
      @return-saved="onReturnSaved"
    />
  </ModalBase>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import SaleReturnModal from './SaleReturnModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  sale: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'return-opened'])

const toast = useToastStore()

const showReturnModal = ref(false)

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  })
}

async function downloadReceipt() {
  if (!props.sale?.id) return
  try {
    const res = await api.get(`/Sale/${props.sale.id}/receipt`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al generar el recibo', 'error')
  }
}

function onReturnSaved() {
  showReturnModal.value = false
  emit('return-opened') // Para que el padre recargue la lista
  emit('update:modelValue', false) // Cerrar el detalle también
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

.detail-summary p:last-child { 
  margin-bottom: 0; 
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

.total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--color-accent-light);
  border-radius: var(--radius-sm);
  font-size: 15px;
}

.return-notice { 
  background: #FFF3E0; 
  border-left: 3px solid var(--color-warning); 
  padding: 8px 12px; 
  border-radius: var(--radius-sm); 
  font-size: 13px; 
  margin-top: 10px; 
}

.return-notice.warning { 
  background: #FFF8E1; 
}

.return-item-detail { 
  background: #FFF3E0; 
  padding: 10px 14px; 
  border-radius: 8px; 
  margin-bottom: 8px; 
  font-size: 13px; 
  border-left: 3px solid var(--color-warning); 
}

.credit-box { 
  background: var(--color-accent-light); 
  padding: 12px 16px; 
  border-radius: var(--radius-sm); 
}

.credit-box p {
  font-size: 13px;
  margin-bottom: 6px;
}

.installments-title { 
  font-size: 12px; 
  font-weight: 600; 
  margin-bottom: 6px; 
}

.installment-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 4px 0; 
  font-size: 12px; 
  border-bottom: 1px solid var(--color-border); 
}
</style>
