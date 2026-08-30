<template>
  <div class="partner-summary">
    <div v-if="loading" class="state-text">Cargando tu resumen...</div>

    <div v-else-if="summary">
      <div class="welcome-header">
        <h2>Hola, {{ auth.user?.fullName }} 👋</h2>
        <p class="welcome-sub">Aquí está el resumen de tu cuenta</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-icon">💰</span>
          <span class="summary-label">Mis ganancias estimadas</span>
          <strong class="summary-value">${{ formatNumber(summary.totalEarnings || 0) }}</strong>
        </div>

        <div class="summary-card" :class="{ danger: summary.totalDebt > 0 }">
          <span class="summary-icon">📋</span>
          <span class="summary-label">Deuda total con AS</span>
          <strong class="summary-value">${{ formatNumber(summary.totalDebt || 0) }}</strong>
        </div>

        <div class="summary-card success">
          <span class="summary-icon">✅</span>
          <span class="summary-label">Total abonado</span>
          <strong class="summary-value">${{ formatNumber(summary.totalPaid || 0) }}</strong>
        </div>

        <div class="summary-card" :class="{ danger: (summary.pendingDebt || 0) > 0 }">
          <span class="summary-icon">⏳</span>
          <span class="summary-label">Saldo pendiente</span>
          <strong class="summary-value">${{ formatNumber(summary.pendingDebt || 0) }}</strong>
        </div>
      </div>

      <div class="card" style="margin-top: 4px;">
        <div class="card-section-header">
          <h3>Mis facturas recientes</h3>
        </div>

        <div v-if="loadingInvoices" class="state-text">Cargando facturas...</div>

        <table v-else-if="myInvoices.length > 0">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in myInvoices" :key="inv.id">
              <td><strong>{{ inv.saleNumber }}</strong></td>
              <td>{{ formatDate(inv.date) }}</td>
              <td>${{ formatNumber(inv.total) }}</td>
              <td>
                <span :class="['badge', inv.paymentMethodName === 'Contado' ? 'badge-info' : 'badge-warning']">
                  {{ inv.paymentMethodName || 'Contado' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="state-text">No hay facturas registradas aún.</p>
      </div>

      <div class="actions-row">
        <button class="btn btn-primary" @click="downloadStatement">
          📄 Descargar estado de cuenta
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()

const summary = ref(null)
const myInvoices = ref([])
const loading = ref(true)
const loadingInvoices = ref(true)

async function loadData() {
  try {
    loading.value = true
    const res = await api.get('/Partner/my/summary')
    summary.value = res.data.data
  } catch {
    toast.show('Error al cargar el resumen', 'error')
  } finally {
    loading.value = false
  }
}

async function loadInvoices() {
  try {
    loadingInvoices.value = true
    const res = await api.get('/Sale', { params: { pageSize: 10 } })
    myInvoices.value = res.data.data?.data || []
  } catch {
    myInvoices.value = []
  } finally {
    loadingInvoices.value = false
  }
}

async function downloadStatement() {
  try {
    const now = new Date()
    const res = await api.get('/Partner/my/statement/pdf', {
      params: {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: now.toISOString()
      },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al descargar el estado de cuenta', 'error')
  }
}

onMounted(() => {
  loadData()
  loadInvoices()
})
</script>

<style scoped>
.partner-summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.welcome-header {
  margin-bottom: 4px;
}

.welcome-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.welcome-sub {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.summary-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.summary-card.danger {
  border-color: var(--color-danger);
  background: #FFF5F5;
}

.summary-card.success {
  border-color: var(--color-success);
  background: #F0FFF4;
}

.summary-icon {
  display: block;
  font-size: 28px;
  margin-bottom: 8px;
}

.summary-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.card-section-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
}

.card-section-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.state-text {
  text-align: center;
  padding: 30px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
