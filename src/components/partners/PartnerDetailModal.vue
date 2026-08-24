<template>
  <ModalBase 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    :title="`Detalle: ${partner?.partnerName || ''}`" 
    width="680px"
  >
    <div v-if="partnerDetail">
      <PartnerSummaryCards :summary="partnerDetail" />

      <div class="tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'invoices' }]" 
          @click="activeTab = 'invoices'"
        >
          Facturas ({{ invoices.length }})
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'liquidations' }]" 
          @click="activeTab = 'liquidations'"
        >
          Abonos
        </button>
      </div>

      <div v-if="activeTab === 'invoices'">
        <PartnerInvoicesTab
          :invoices="invoices"
          :current-page="invoicesPage"
          :total-pages="invoicesTotalPages"
          @invoice-clicked="$emit('invoice-clicked', $event)"
          @payment-clicked="$emit('payment-clicked', $event)"
          @page-changed="$emit('invoices-page-changed', $event)"
        />
      </div>

      <div v-if="activeTab === 'liquidations'">
        <PartnerLiquidationsTab
          :liquidations="liquidations"
          :current-page="liquidationsPage"
          :total-pages="liquidationsTotalPages"
          @add-payment="$emit('add-payment')"
          @page-changed="$emit('liquidations-page-changed', $event)"
        />
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cerrar</button>
      <button class="btn btn-primary" @click="$emit('open-sale')">🧾 Nueva venta</button>
      <button class="btn btn-primary" @click="$emit('download-statement')">Descargar estado de cuenta</button>
    </template>
  </ModalBase>
</template>

<script setup>
import { ref } from 'vue'
import ModalBase from '@/components/shared/ModalBase.vue'
import PartnerSummaryCards from './PartnerSummaryCards.vue'
import PartnerInvoicesTab from './PartnerInvoicesTab.vue'
import PartnerLiquidationsTab from './PartnerLiquidationsTab.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  partner: { type: Object, default: null },
  partnerDetail: { type: Object, default: null },
  invoices: { type: Array, default: () => [] },
  invoicesPage: { type: Number, default: 1 },
  invoicesTotalPages: { type: Number, default: 1 },
  liquidations: { type: Array, default: () => [] },
  liquidationsPage: { type: Number, default: 1 },
  liquidationsTotalPages: { type: Number, default: 1 }
})

const emit = defineEmits([
  'update:modelValue',
  'invoice-clicked',
  'payment-clicked',
  'add-payment',
  'open-sale',
  'download-statement',
  'invoices-page-changed',
  'liquidations-page-changed'
])

const activeTab = ref('invoices')

// Reset tab when modal opens
import { watch } from 'vue'
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    activeTab.value = 'invoices'
  }
})
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 14px;
}

.tab-btn {
  background: none;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-text-muted);
  border: none;
  border-bottom: 2px solid transparent;
  transition: var(--transition);
  cursor: pointer;
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.tab-btn:hover {
  color: var(--color-accent);
}

.btn {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
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
