<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Registrar devolución" 
    width="560px" 
    :z-index="1100"
  >
    <div class="invoice-ref">
      Devolución de: <strong>{{ invoice?.saleNumber }}</strong>
    </div>
    
    <div v-for="(d, i) in returnPartnerForm.details" :key="i" class="return-item">
      <input type="checkbox" v-model="d.selected" />
      <span>{{ d.productName }} (llevó {{ d.originalQuantity }})</span>
      <input
        v-if="d.selected"
        v-model.number="d.returnQuantity"
        type="number"
        :max="d.originalQuantity"
        min="1"
        class="form-input return-qty"
      />
    </div>
    
    <div class="form-group" style="margin-top: 16px;">
      <label class="form-label">Notas (opcional)</label>
      <input
        v-model="returnPartnerForm.notes"
        type="text"
        class="form-input"
        @input="returnPartnerForm.notes = toUpperCase(returnPartnerForm.notes)"
      />
    </div>
    
    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primary" @click="saveReturn" :disabled="saving">
        {{ saving ? 'Procesando...' : 'Confirmar devolución' }}
      </button>
    </template>
  </ModalBase>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import { toUpperCase } from '@/utils/textFormat'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  invoice: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'return-saved'])

const toast = useToastStore()
const returnPartnerForm = ref({ notes: '', details: [] })
const saving = ref(false)

watch(() => props.modelValue, (val) => {
  if (val && props.invoice?.details) {
    returnPartnerForm.value = {
      notes: '',
      details: props.invoice.details.map(d => ({
        productId: d.productId,
        productName: d.productName,
        originalQuantity: d.quantity,
        returnQuantity: 0,
        selected: false
      }))
    }
  }
})

async function saveReturn() {
  const details = returnPartnerForm.value.details
    .filter(d => d.selected && d.returnQuantity > 0)
    .map(d => ({ productId: d.productId, quantity: d.returnQuantity }))

  if (details.length === 0) {
    toast.show('Selecciona al menos un producto', 'warning')
    return
  }

  try {
    saving.value = true
    await api.post('/Return', {
      saleId: props.invoice.id,
      notes: returnPartnerForm.value.notes || null,
      details
    })
    emit('return-saved')
    emit('update:modelValue', false)
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar devolución', 'error')
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

.return-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.return-qty {
  width: 70px;
  padding: 6px 8px;
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
