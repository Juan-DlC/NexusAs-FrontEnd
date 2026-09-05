<template>
  <ModalBase 
    :model-value="props.modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    title="Registrar devolución" 
    width="560px"
  >
    <div v-if="props.sale">
      <p class="hint-text" style="margin-bottom: 12px;">
        Factura: <strong>{{ props.sale.saleNumber }}</strong>
      </p>
      <div v-for="(d, i) in returnForm.details" :key="i" class="return-item">
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
          v-model="returnForm.notes" 
          type="text" 
          class="form-input"
          @input="returnForm.notes = toUpperCase(returnForm.notes)" 
        />
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('update:modelValue', false)">
        Cancelar
      </button>
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
  sale: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'return-saved'])

const toast = useToastStore()

const returnForm = ref({ notes: '', details: [] })
const saving = ref(false)

watch(() => props.modelValue, (val) => {
  if (val && props.sale?.details) {
    returnForm.value = {
      notes: '',
      details: props.sale.details.map(d => ({
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
  const details = returnForm.value.details
    .filter(d => d.selected && d.returnQuantity > 0)
    .map(d => ({ productId: d.productId, quantity: d.returnQuantity }))

  if (details.length === 0) {
    toast.show('Selecciona al menos un producto para devolver', 'warning')
    return
  }

  try {
    saving.value = true
    await api.post('/Return', {
      saleId: props.sale.id,
      notes: returnForm.value.notes || null,
      details
    })
    toast.show('Devolución registrada correctamente', 'success')
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

.hint-text {
  font-size: 12px;
  color: var(--color-accent);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}
</style>
