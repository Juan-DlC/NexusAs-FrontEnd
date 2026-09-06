<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Registrar abono de la socia" 
    :z-index="1100"
  >
    <form @submit.prevent="saveLiquidation">
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
      <button class="btn btn-primary" @click="saveLiquidation" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Registrar' }}
      </button>
    </template>
  </ModalBase>
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

watch(() => props.modelValue, (val) => {
  if (val) {
    liquidationForm.value = { amount: 0, notes: '' }
  }
})

async function saveLiquidation() {
  if (liquidationForm.value.amount <= 0) {
    toast.show('El monto debe ser mayor a 0', 'warning')
    return
  }
  
  if (props.pendingDebt > 0 && liquidationForm.value.amount > props.pendingDebt) {
    toast.show(`El abono supera la deuda pendiente ($${formatNumber(props.pendingDebt)})`, 'error')
    return
  }
  
  try {
    saving.value = true
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
</style>
