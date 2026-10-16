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

      <!-- Tabs de Facturas / Abonos -->
      <div class="card tabs-container" style="margin-top: 14px;">
        <div class="tabs-header">
          <button 
            :class="['tab-btn', { active: activeTab === 'invoices' }]" 
            @click="activeTab = 'invoices'"
          >
            📋 Mis facturas
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'liquidations' }]" 
            @click="activeTab = 'liquidations'"
          >
            💰 Mis abonos (liquidaciones)
          </button>
        </div>

        <!-- Tab: Facturas -->
        <div v-if="activeTab === 'invoices'" class="tab-content">
          <div v-if="loadingInvoices" class="state-text">Cargando facturas...</div>

          <table v-else-if="myInvoices.length > 0" class="invoices-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Abonado</th>
                <th>Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in myInvoices" :key="inv.id">
                <td><strong>{{ inv.saleNumber }}</strong></td>
                <td>{{ formatDate(inv.date) }}</td>
                <td>${{ formatNumber(inv.total) }}</td>
                <td>
                  <span style="color: var(--color-success); font-weight: 600;">
                    ${{ formatNumber(inv.totalPaid || 0) }}
                  </span>
                </td>
                <td>
                  <span :style="{ color: (inv.remainingBalance || 0) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: '600' }">
                    ${{ formatNumber(inv.remainingBalance || 0) }}
                  </span>
                </td>
                <td>
                  <span :class="getBadgeClass(inv)">
                    {{ getStatusLabel(inv) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      class="btn btn-sm btn-secondary" 
                      @click="viewInvoiceDetail(inv)"
                      title="Ver detalle"
                    >
                      👁️ Ver
                    </button>
                    <button 
                      class="btn btn-sm btn-primary" 
                      @click="downloadInvoicePDF(inv.id)"
                      title="Descargar PDF mayorista"
                    >
                      📄 PDF
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-else class="state-text">No hay facturas registradas aún.</p>
        </div>

        <!-- Tab: Liquidaciones (Abonos) -->
        <div v-if="activeTab === 'liquidations'" class="tab-content">
          <div v-if="loadingLiquidations" class="state-text">Cargando abonos...</div>

          <table v-else-if="myLiquidations.length > 0">
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
              <tr v-for="l in myLiquidations" :key="l.id">
                <td>{{ formatDate(l.date) }}</td>
                <td>{{ l.saleNumber || 'Deuda general' }}</td>
                <td>{{ l.type === 'Payment' ? 'Abono' : 'Pago AS' }}</td>
                <td style="color: var(--color-success); font-weight: 600;">${{ formatNumber(l.amount) }}</td>
                <td>{{ l.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="state-text">No hay abonos registrados aún.</p>
        </div>
      </div>

      <div class="actions-row">
        <button class="btn btn-primary" @click="downloadStatement">
          📄 Descargar estado de cuenta
        </button>
      </div>
    </div>

    <!-- Modal de detalle de factura -->
    <PartnerInvoiceViewModal
      v-model="showInvoiceDetail"
      :sale-id="selectedInvoiceId"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatNumber as utilFormatNumber, formatDate as utilFormatDate } from '@/utils/format'
import PartnerInvoiceViewModal from '@/components/partners/PartnerInvoiceViewModal.vue'

// ✅ Re-exportar las funciones para asegurar que estén disponibles en el template
const formatNumber = utilFormatNumber
const formatDate = utilFormatDate

const auth = useAuthStore()
const toast = useToastStore()

const summary = ref(null)
const myInvoices = ref([])
const myLiquidations = ref([])
const loading = ref(true)
const loadingInvoices = ref(true)
const loadingLiquidations = ref(true)
const activeTab = ref('invoices')
const showInvoiceDetail = ref(false)
const selectedInvoiceId = ref(null)

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
    const res = await api.get('/Sale', { params: { pageSize: 100 } })
    myInvoices.value = res.data.data?.data || []
  } catch {
    myInvoices.value = []
  } finally {
    loadingInvoices.value = false
  }
}

async function loadLiquidations() {
  try {
    loadingLiquidations.value = true
    
    // ✅ Obtener partnerId del usuario autenticado
    const partnerId = auth.user?.id
    
    if (!partnerId) {
      console.warn('⚠️ No se encontró partner ID')
      myLiquidations.value = []
      return
    }

    // ✅ Usar el mismo endpoint que PartnersView: /Partner/{id}/liquidations/paged
    const res = await api.get(`/Partner/${partnerId}/liquidations/paged`, {
      params: { pageNumber: 1, pageSize: 100 }
    })

    // ✅ Los abonos vienen directamente, no necesitan transformación compleja
    myLiquidations.value = res.data.data?.data || []
  } catch (err) {
    console.error('❌ Error cargando abonos:', err)
    myLiquidations.value = []
  } finally {
    loadingLiquidations.value = false
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

function getBadgeClass(invoice) {
  if (invoice.paymentMethodName === 'Contado') {
    return 'badge badge-success'
  }
  if ((invoice.remainingBalance || 0) === 0) {
    return 'badge badge-success'
  }
  if ((invoice.totalPaid || 0) > 0) {
    return 'badge badge-warning'
  }
  return 'badge badge-danger'
}

function getStatusLabel(invoice) {
  if (invoice.paymentMethodName === 'Contado') {
    return 'Pagado'
  }
  if ((invoice.remainingBalance || 0) === 0) {
    return 'Pagado'
  }
  if ((invoice.totalPaid || 0) > 0) {
    return 'Abonado'
  }
  return 'Pendiente'
}

function viewInvoiceDetail(invoice) {
  selectedInvoiceId.value = invoice.id
  showInvoiceDetail.value = true
}

async function downloadInvoicePDF(saleId) {
  if (!saleId) {
    toast.show('Error: ID de factura no válido', 'error')
    return
  }
  
  try {
    const res = await api.get(`/Sale/${saleId}/partner-receipt`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    toast.show('PDF descargado correctamente', 'success')
  } catch (error) {
    console.error('Error al descargar PDF:', error)
    toast.show('Error al descargar el PDF', 'error')
  }
}

onMounted(() => {
  loadData()
  loadInvoices()
  loadLiquidations()
})
</script>

<style scoped>
.partner-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.welcome-header {
  margin-bottom: 2px;
}

.welcome-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.welcome-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.summary-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
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
  font-size: 14px;
  margin-bottom: 3px;
}

.summary-label {
  display: block;
  font-size: 9px;
  color: var(--color-text-muted);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  line-height: 1.2;
}

.summary-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.tabs-container {
  background: var(--color-white);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-bg);
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  transition: var(--transition);
  border-bottom: 3px solid transparent;
}

.tab-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom: 3px solid var(--color-accent);
  background: var(--color-white);
}

.tab-content {
  padding: 12px;
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

.invoices-table {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.action-buttons .btn-sm {
  padding: 5px 10px;
  font-size: 11px;
  min-width: auto;
}
</style>
