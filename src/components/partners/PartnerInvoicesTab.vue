<template>
  <div>
    <table v-if="invoices.length > 0">
      <thead>
        <tr>
          <th>Factura</th>
          <th>Fecha</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Pendiente</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="inv in invoices"
          :key="inv.saleId"
          class="clickable-row"
          @click="$emit('invoice-clicked', inv)"
          :title="'Ver detalle de ' + inv.saleNumber"
        >
          <td><strong>{{ inv.saleNumber }}</strong></td>
          <td>{{ formatDate(inv.date) }}</td>
          <td>${{ formatNumber(inv.total) }}</td>
          <td>
            <span :class="['badge',
              inv.creditStatus === 'NoCredit' ? 'badge-info' :
              inv.creditStatus === 'Paid' ? 'badge-success' :
              inv.creditStatus === 'Partial' ? 'badge-warning' : 'badge-danger']">
              {{ inv.creditStatus === 'NoCredit' ? 'Contado' :
                 inv.creditStatus === 'Paid' ? 'Pagado' :
                 inv.creditStatus === 'Partial' ? 'Pago parcial' : 'Crédito pendiente' }}
            </span>
          </td>
          <td>
            <span v-if="inv.creditStatus === 'NoCredit'" style="color: var(--color-text-muted)">—</span>
            <span v-else :style="{ color: inv.pendingAmount > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: '600' }">
              ${{ formatNumber(inv.pendingAmount) }}
            </span>
          </td>
          <td>
            <button
              v-if="inv.creditStatus !== 'NoCredit' && inv.pendingAmount > 0"
              class="btn btn-secondary btn-sm"
              @click.stop="$emit('payment-clicked', inv)"
            >
              💳 Abonar
            </button>
            <span v-else-if="inv.isFullyReturned" class="badge badge-danger">Devuelta</span>
          </td>
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
      <span class="page-info">Página {{ currentPage }} de {{ totalPages }}</span>
      <button 
        class="btn btn-secondary btn-sm" 
        :disabled="currentPage >= totalPages" 
        @click="$emit('page-changed', currentPage + 1)"
      >
        Siguiente →
      </button>
    </div>
    
    <p v-if="invoices.length === 0" class="state-text">Sin facturas registradas.</p>
  </div>
</template>

<script setup>
const props = defineProps({
  invoices: { type: Array, required: true, default: () => [] },
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 }
})

const emit = defineEmits(['invoice-clicked', 'payment-clicked', 'page-changed'])

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
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

.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: var(--color-accent-light) !important;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-info {
  background: #E3F2FD;
  color: #1976D2;
}

.badge-success {
  background: #E8F5E9;
  color: #388E3C;
}

.badge-warning {
  background: #FFF3E0;
  color: #F57C00;
}

.badge-danger {
  background: #FFEBEE;
  color: #D32F2F;
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
