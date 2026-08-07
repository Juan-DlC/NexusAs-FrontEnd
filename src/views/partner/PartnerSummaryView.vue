<template>
  <div class="partner-summary-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Mi Resumen</h2>
        <p class="page-sub">Tu estado de cuenta con AS Accesorios</p>
      </div>
      <button class="btn btn-primary" @click="downloadStatement">
        📄 Descargar estado de cuenta
      </button>
    </div>

    <div v-if="loading" class="state-text">Cargando...</div>

    <div v-else class="summary-grid">
      <div class="summary-card">
        <span class="summary-icon">◇</span>
        <span class="summary-label">Deuda total</span>
        <strong>${{ formatNumber(summary.totalDebt) }}</strong>
      </div>
      <div class="summary-card success">
        <span class="summary-icon">◉</span>
        <span class="summary-label">Abonado</span>
        <strong>${{ formatNumber(summary.totalPaid) }}</strong>
      </div>
      <div class="summary-card danger">
        <span class="summary-icon">◰</span>
        <span class="summary-label">Saldo pendiente</span>
        <strong>${{ formatNumber(summary.pendingDebt) }}</strong>
      </div>
    </div>

    <div class="info-box" v-if="!loading">
      <p>
        <strong>¿Cómo funciona?</strong> La "Deuda total" es lo que le debes a AS por los
        productos que has tomado. A medida que vayas abonando, el "Saldo pendiente" irá disminuyendo.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const summary = ref({
  totalSales: 0, totalEarnings: 0, totalDebt: 0, totalPaid: 0, pendingDebt: 0
})
const loading = ref(true)

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

async function loadSummary() {
  try {
    loading.value = true
    const res = await api.get('/Partner/my/summary')
    summary.value = res.data.data
  } catch (err) {
    console.error('Error cargando resumen:', err)
  } finally {
    loading.value = false
  }
}

async function downloadStatement() {
  try {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to = now.toISOString()
    const res = await api.get('/Partner/my/statement/pdf', {
      params: { from, to },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch (err) {
    console.error('Error al descargar tu estado de cuenta.', err)
  }
}

onMounted(loadSummary)
</script>

<style scoped>
.partner-summary-view { display: flex; flex-direction: column; gap: 20px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card.success { border-top: 3px solid var(--color-success); }
.summary-card.danger { border-top: 3px solid var(--color-danger); }

.summary-icon { font-size: 20px; color: var(--color-accent); opacity: 0.6; }
.summary-label { font-size: 12px; color: var(--color-text-muted); }
.summary-card strong { font-size: 22px; color: var(--color-text); }

.info-box {
  background: var(--color-accent-light);
  border-radius: var(--radius-md);
  padding: 16px 20px;
}
.info-box p { font-size: 13px; color: var(--color-text); line-height: 1.6; }
</style>
