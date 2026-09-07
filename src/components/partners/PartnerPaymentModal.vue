<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Registrar abono de la socia" 
    :z-index="1100"
  >
    <form @submit.prevent="showConfirmationDialog">
      <div v-if="invoice" class="invoice-ref">
        Abonando a factura: <strong>{{ invoice.saleNumber }}</strong>
        (Pendiente: <span style="color: var(--color-danger); font-weight: 600;">${{ formatNumber(invoice.pendingAmount) }}</span>)
      </div>
      
      <div class="credit-summary" v-if="pendingDebt > 0">
        <p><strong>Deuda pendiente:</strong> <span style="color: var(--color-danger); font-weight: 700;">${{ formatNumber(pendingDebt) }}</span></p>
        <p style="font-size: 11px; color: var(--color-text-muted);">El abono no puede superar la deuda pendiente</p>
      </div>
      
      <div class="form-group" v-if="invoice">
        <label class="form-label">Factura</label>
        <input
          type="text"
          class="form-input"
          :value="invoice.saleNumber"
          disabled
          style="background: var(--color-bg); cursor: not-allowed;"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">Monto abonado</label>
        <CurrencyInput v-model="liquidationForm.amount" />
      </div>
      
      <div class="form-group">
        <label class="form-label">Notas (opcional)</label>
        <input
          v-model="liquidationForm.notes"
          type="text"
          class="form-input"
          @input="liquidationForm.notes = toUpperCase(liquidationForm.notes)"
        />
      </div>
    </form>
    
    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primary" @click="showConfirmationDialog" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Registrar' }}
      </button>
    </template>
  </ModalBase>

  <!-- Modal de confirmación personalizado -->
  <Teleport to="body">
    <div v-if="showConfirmDialog" class="confirm-overlay" @click.self="showConfirmDialog = false">
      <div class="confirm-dialog-custom">
        <div class="confirm-icon-custom">💰</div>
        <h3 class="confirm-title-custom">¿Confirmar registro de abono?</h3>
        
        <div class="confirm-details">
          <div class="detail-row">
            <span class="detail-label">Socia:</span>
            <span class="detail-value">{{ partner?.partnerName || 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Tipo de abono:</span>
            <span class="detail-value">{{ invoice ? `Factura ${invoice.saleNumber}` : 'Abono general' }}</span>
          </div>
          <div class="detail-row highlight">
            <span class="detail-label">Monto a abonar:</span>
            <span class="detail-value-highlight">${{ formatNumber(liquidationForm.amount) }}</span>
          </div>
          <div class="detail-row" v-if="invoice">
            <span class="detail-label">Pendiente de factura:</span>
            <span class="detail-value">${{ formatNumber(invoice.pendingAmount) }}</span>
          </div>
          <div class="detail-row" v-else-if="pendingDebt > 0">
            <span class="detail-label">Deuda pendiente total:</span>
            <span class="detail-value">${{ formatNumber(pendingDebt) }}</span>
          </div>
          <div class="detail-row" v-if="liquidationForm.notes">
            <span class="detail-label">Notas:</span>
            <span class="detail-value">{{ liquidationForm.notes }}</span>
          </div>
        </div>

        <p class="confirm-message-custom">
          {{ invoice 
            ? 'Se registrará el abono a la factura seleccionada.' 
            : 'Se registrará un abono general que se aplicará a la deuda total de la socia.' 
          }}
        </p>
        
        <div class="confirm-actions-custom">
          <button class="btn btn-secondary" @click="showConfirmDialog = false">
            Cancelar
          </button>
          <button class="btn btn-success-custom" @click="confirmAndSave">
            ✓ Confirmar abono
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  partner: { type: Object, default: null },
  invoice: { type: Object, default: null },
  pendingDebt: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'payment-saved'])

const toast = useToastStore()
const liquidationForm = ref({ amount: 0, notes: '' })
const saving = ref(false)
const showConfirmDialog = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    liquidationForm.value = { amount: 0, notes: '' }
    showConfirmDialog.value = false
  }
})

function showConfirmationDialog() {
  // Validaciones antes de mostrar el diálogo
  if (liquidationForm.value.amount <= 0) {
    toast.show('El monto debe ser mayor a 0', 'warning')
    return
  }
  
  if (props.pendingDebt > 0 && liquidationForm.value.amount > props.pendingDebt) {
    toast.show(`El abono supera la deuda pendiente ($${formatNumber(props.pendingDebt)})`, 'error')
    return
  }
  
  // Mostrar diálogo de confirmación
  showConfirmDialog.value = true
}

async function confirmAndSave() {
  try {
    saving.value = true
    showConfirmDialog.value = false
    
    const now = new Date()
    const payload = {
      amount: liquidationForm.value.amount,
      type: 'Payment',
      notes: liquidationForm.value.notes || null,
      saleId: props.invoice?.saleId || null,
      periodFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      periodTo: now.toISOString()
    }
    
    await api.post(`/Partner/${props.partner.id}/liquidations`, payload)
    emit('payment-saved')
    emit('update:modelValue', false)
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar abono', 'error')
  } finally {
    saving.value = false
  }
}
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

.credit-summary {
  background: var(--color-accent-light);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  border-left: 3px solid var(--color-danger);
}

.credit-summary p {
  margin-bottom: 6px;
  font-size: 13px;
}

.credit-summary p:last-child {
  margin-bottom: 0;
}

.form-group { 
  margin-bottom: 16px; 
}

.form-label { 
  display: block; 
  font-size: 12px; 
  font-weight: 600; 
  color: var(--color-text); 
  margin-bottom: 6px; 
}

.form-input { 
  width: 100%; 
  padding: 10px 12px; 
  border: 1px solid var(--color-border); 
  border-radius: var(--radius-sm); 
}

/* Estilos del modal de confirmación personalizado */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.confirm-dialog-custom {
  background: var(--color-bg);
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: dialogSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--color-border);
}

@keyframes dialogSlideIn {
  from { 
    transform: translateY(-30px) scale(0.9); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0) scale(1); 
    opacity: 1; 
  }
}

.confirm-icon-custom { 
  font-size: 56px; 
  margin-bottom: 16px;
  animation: iconPulse 0.5s ease-in-out;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.confirm-title-custom { 
  font-size: 20px; 
  font-weight: 700; 
  color: var(--color-text); 
  margin-bottom: 20px;
  letter-spacing: -0.3px;
}

.confirm-details {
  background: var(--color-white);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-row.highlight {
  background: var(--color-accent-light);
  padding: 12px 16px;
  margin: 0 -16px;
  border-radius: 8px;
  border: none;
}

.detail-label {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.detail-value {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 600;
}

.detail-value-highlight {
  font-size: 18px;
  color: var(--color-success);
  font-weight: 700;
}

.confirm-message-custom { 
  font-size: 13px; 
  color: var(--color-text-muted); 
  margin-bottom: 24px; 
  line-height: 1.6;
  padding: 0 10px;
}

.confirm-actions-custom { 
  display: flex; 
  gap: 12px; 
  justify-content: center; 
}

.btn {
  padding: 11px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 140px;
}

.btn-secondary {
  background: var(--color-white);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.btn-success-custom {
  background: var(--color-success);
  color: white;
  box-shadow: 0 4px 12px rgba(92, 138, 107, 0.3);
}

.btn-success-custom:hover {
  background: #4a7257;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(92, 138, 107, 0.4);
}

.btn-success-custom:active {
  transform: translateY(0);
}
</style>
