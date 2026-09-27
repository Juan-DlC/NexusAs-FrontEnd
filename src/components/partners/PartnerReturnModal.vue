<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Registrar devolución" 
    width="620px" 
    :z-index="1100"
  >
    <div class="invoice-ref">
      Devolución de: <strong>{{ invoice?.saleNumber }}</strong>
    </div>
    
    <div v-for="(d, i) in returnPartnerForm.details" :key="i" class="return-item">
      <input type="checkbox" v-model="d.selected" class="return-checkbox" />
      <div class="product-info">
        <div class="product-name">{{ d.productName }}</div>
        <div class="product-meta">
          <span v-if="d.productCode" class="meta-item">Código: <strong>{{ d.productCode }}</strong></span>
          <span v-if="d.productDescription" class="meta-item">{{ d.productDescription }}</span>
          <span class="meta-item">Llevó: <strong>{{ d.originalQuantity }}</strong></span>
        </div>
      </div>
      <input
        v-if="d.selected"
        :value="d.returnQuantity"
        type="text"
        inputmode="numeric"
        class="form-input return-qty"
        placeholder="0"
        @input="handleReturnQuantityInput($event, d)"
        @keypress="onlyNumbers"
      />
    </div>
    
    <div class="form-group" style="margin-top: 10px;">
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
        productCode: d.productCode || d.code || '',
        productDescription: d.productDescription || d.description || '',
        originalQuantity: d.quantity,
        returnQuantity: 0,
        selected: false
      }))
    }
  }
})

function handleReturnQuantityInput(event, detail) {
  const value = event.target.value.replace(/[^0-9]/g, '')
  let num = value === '' ? 0 : parseInt(value)
  // Limitar a la cantidad original
  if (num > detail.originalQuantity) {
    num = detail.originalQuantity
  }
  detail.returnQuantity = num
}

function onlyNumbers(event) {
  const charCode = event.which ? event.which : event.keyCode
  if (charCode < 48 || charCode > 57) {
    event.preventDefault()
  }
}

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
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
  font-size: 12px;
  border-left: 3px solid var(--color-accent);
}

.return-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.return-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  color: var(--color-text-muted);
  line-height: 1.2;
}

.meta-item {
  display: inline;
}

.meta-item strong {
  font-weight: 600;
  color: var(--color-accent);
}

.return-qty {
  width: 60px;
  padding: 5px 6px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
}

.form-group { 
  margin-bottom: 10px; 
}

.form-label { 
  display: block; 
  font-size: 11px; 
  font-weight: 600; 
  color: var(--color-text); 
  margin-bottom: 4px; 
}

.form-input { 
  width: 100%; 
  padding: 7px 9px; 
  border: 1px solid var(--color-border); 
  border-radius: var(--radius-sm); 
  font-size: 12px;
}
</style>
