<template>
  <div class="summary-grid">
    <div class="summary-card">
      <span class="summary-label">Deuda total</span>
      <strong>${{ formatNumber(summary.totalDebt) }}</strong>
    </div>
    <div class="summary-card success">
      <span class="summary-label">Abonado</span>
      <strong>${{ formatNumber(summary.totalPaid) }}</strong>
    </div>
    <div class="summary-card danger">
      <span class="summary-label">Saldo pendiente</span>
      <strong style="color: var(--color-danger);">${{ formatNumber(summary.pendingDebt) }}</strong>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  summary: {
    type: Object,
    required: true,
    default: () => ({ totalDebt: 0, totalPaid: 0, pendingDebt: 0 })
  }
})

</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.summary-card {
  background: var(--color-bg);
  padding: 12px;
  border-radius: var(--radius-sm);
  text-align: center;
}

.summary-card.success { 
  background: #EAF3DE; 
}

.summary-card.danger { 
  background: #FFEBEE; 
}

.summary-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.summary-card strong { 
  font-size: 15px; 
  color: var(--color-text); 
}
</style>
