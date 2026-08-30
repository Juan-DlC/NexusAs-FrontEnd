<template>
  <div>
    <button class="btn btn-secondary btn-sm" @click="$emit('add-payment')" style="margin-bottom: 12px;">
      + Registrar abono
    </button>
    
    <table v-if="liquidations.length > 0">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Factura</th>
          <th>Tipo</th>
          <th>Monto</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in liquidations" :key="l.id">
          <td>{{ formatDate(l.date) }}</td>
          <td>{{ l.saleNumber || 'Deuda general' }}</td>
          <td>{{ l.type === 'Payment' ? 'Abono' : 'Pago AS' }}</td>
          <td style="color: var(--color-success); font-weight: 600;">${{ formatNumber(l.amount) }}</td>
          <td>{{ l.notes || '-' }}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="pagination" v-if="totalPages > 1">
      <button 
        class="btn btn-secondary btn-sm"
        :disabled="currentPage <= 1"
        @click="$emit('page-changed', currentPage - 1)"
      >
        ← Anterior
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        class="btn btn-secondary btn-sm"
        :disabled="currentPage >= totalPages"
        @click="$emit('page-changed', currentPage + 1)"
      >
        Siguiente →
      </button>
    </div>
    
    <p v-else-if="liquidations.length === 0" class="state-text">Sin abonos registrados.</p>
  </div>
</template>

<script setup>
import { formatNumber, formatDate } from '@/utils/format'

const props = defineProps({
  liquidations: { type: Array, required: true, default: () => [] },
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 }
})

const emit = defineEmits(['add-payment', 'page-changed'])
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: var(--color-bg);
  padding: 10px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  border-bottom: 2px solid var(--color-border);
}

tbody td {
  padding: 10px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.page-info {
  font-size: 13px;
  color: var(--color-text-muted);
}

.state-text {
  text-align: center;
  padding: 30px 0;
  color: var(--color-text-muted);
  font-size: 13px;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
