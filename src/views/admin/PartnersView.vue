<template>
  <div class="partners-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Socias Vendedoras</h2>
        <p class="page-sub">{{ partners.length }} socias registradas</p>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="partners.length === 0" class="state-text">
        No hay socias registradas. Crea un usuario con rol "Partner" en Usuarios y aparecerá aquí automáticamente.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Socia</th>
            <th>Usuario</th>
            <th>% Normal</th>
            <th>% Alianza</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in partners" :key="p.id" class="clickable-row" @click="openDetailModal(p)">
            <td><strong>{{ p.partnerName }}</strong></td>
            <td>{{ p.username }}</td>
            <td>{{ p.commissionPercent }}%</td>
            <td>{{ p.allianceCommissionPercent || 20 }}%</td>
            <td>
              <span :class="['badge', p.isActive ? 'badge-success' : 'badge-danger']">
                {{ p.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td>
              <button class="btn-icon" @click.stop="openCommissionModal(p)" :title="`✏️ Editar comisión de ${p.name}`">✏️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Editar comisión -->
    <ModalBase v-model="showCommissionModal" title="Editar comisión">
      <div v-if="selectedPartner">
        <div class="form-group">
          <label class="form-label">% comisión productos normales</label>
          <input v-model.number="commissionForm.commissionPercent" type="number" min="1" max="100" class="form-input" />
          <p class="hint-text">% de la ganancia de AS en productos normales</p>
        </div>
        <div class="form-group">
          <label class="form-label">% comisión productos de alianza</label>
          <input v-model.number="commissionForm.allianceCommissionPercent" type="number" min="1" max="100" class="form-input" />
          <p class="hint-text">% de la ganancia de AS en productos de alianza</p>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showCommissionModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveCommission" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Actualizar' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Detalle de socia -->
    <ModalBase v-model="showDetailModal" :title="`Detalle: ${selectedPartner?.partnerName || ''}`" width="680px">
      <div v-if="partnerDetail">
        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">Deuda total</span>
            <strong>${{ formatNumber(partnerDetail.totalDebt) }}</strong>
          </div>
          <div class="summary-card success">
            <span class="summary-label">Abonado</span>
            <strong>${{ formatNumber(partnerDetail.totalPaid) }}</strong>
          </div>
          <div class="summary-card danger">
            <span class="summary-label">Saldo pendiente</span>
            <strong style="color: var(--color-danger);">${{ formatNumber(partnerDetail.pendingDebt) }}</strong>
          </div>
        </div>

        <div class="tabs">
          <button :class="['tab-btn', { active: activeTab === 'invoices' }]" @click="activeTab = 'invoices'">
            Facturas ({{ partnerInvoices.length }})
          </button>
          <button :class="['tab-btn', { active: activeTab === 'liquidations' }]" @click="activeTab = 'liquidations'">
            Abonos
          </button>
        </div>

        <div v-if="activeTab === 'invoices'">
          <table v-if="partnerInvoices.length > 0">
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
              <tr v-for="inv in partnerInvoices" :key="inv.saleId">
                <td><strong>{{ inv.saleNumber }}</strong></td>
                <td>{{ formatDate(inv.date) }}</td>
                <td>${{ formatNumber(inv.total) }}</td>
                <td>
                  <span :class="['badge', inv.creditStatus === 'Paid' ? 'badge-success' : inv.creditStatus === 'NoCredit' ? 'badge-info' : 'badge-warning']">
                    {{ inv.creditStatus === 'NoCredit' ? 'Contado' : inv.creditStatus === 'Paid' ? 'Pagado' : inv.creditStatus === 'Partial' ? 'Parcial' : 'Pendiente' }}
                  </span>
                </td>
                <td :style="{ color: inv.pendingAmount > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: inv.pendingAmount > 0 ? '600' : 'normal' }">
                  ${{ formatNumber(inv.pendingAmount) }}
                </td>
                <td>
                  <button 
                    v-if="inv.pendingAmount > 0" 
                    class="btn btn-secondary btn-sm" 
                    @click.stop="openLiquidationModalForInvoice(inv)"
                  >
                    Abonar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="state-text">Sin facturas registradas.</p>
        </div>

        <div v-if="activeTab === 'liquidations'">
          <button class="btn btn-secondary btn-sm" @click="openLiquidationModal" style="margin-bottom: 12px;">
            + Registrar abono
          </button>
          <table v-if="liquidations.length > 0">
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Notas</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in liquidations" :key="l.id">
                <td>{{ formatDate(l.date) }}</td>
                <td>{{ l.type === 'Payment' ? 'Abono socia' : 'Pago AS' }}</td>
                <td>${{ formatNumber(l.amount) }}</td>
                <td>{{ l.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="state-text">Sin abonos registrados.</p>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Cerrar</button>
        <button class="btn btn-primary" @click="downloadStatement">Descargar estado de cuenta</button>
      </template>
    </ModalBase>

    <!-- Modal Registrar liquidación -->
    <ModalBase v-model="showLiquidationModal" title="Registrar abono de la socia">
      <form @submit.prevent="saveLiquidation">
        <div v-if="selectedInvoice" class="invoice-ref">
          Abonando a factura: <strong>{{ selectedInvoice.saleNumber }}</strong>
          (Pendiente: <span style="color: var(--color-danger); font-weight: 600;">${{ formatNumber(selectedInvoice.pendingAmount) }}</span>)
        </div>
        <div class="form-group">
          <label class="form-label">Monto abonado</label>
          <CurrencyInput v-model="liquidationForm.amount" />
        </div>
        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <input
            v-model="liquidationForm.notes"
            type="text"
            class="form-input"
            @input="liquidationForm.notes = toUpperCase(liquidationForm.notes)"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="closeLiquidationModal">Cancelar</button>
        <button class="btn btn-primary" @click="saveLiquidation" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Registrar' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { toUpperCase } from '@/utils/textFormat'

const toast = useToastStore()

const partners = ref([])
const loading = ref(true)
const saving = ref(false)

const showCommissionModal = ref(false)
const showDetailModal = ref(false)
const showLiquidationModal = ref(false)

const selectedPartner = ref(null)
const selectedInvoice = ref(null)
const partnerDetail = ref(null)
const partnerSales = ref([])
const partnerInvoices = ref([])
const liquidations = ref([])
const activeTab = ref('invoices')
const commissionForm = ref({ commissionPercent: 0, allianceCommissionPercent: 0 })

const liquidationForm = ref({ amount: 0, notes: '' })

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function loadPartners() {
  try {
    loading.value = true
    const res = await api.get('/Partner')
    partners.value = res.data.data
  } catch (err) {
    console.error('Error cargando socias:', err)
  } finally {
    loading.value = false
  }
}

function openCommissionModal(partner) {
  selectedPartner.value = partner
  commissionForm.value = {
    commissionPercent: partner.commissionPercent,
    allianceCommissionPercent: partner.allianceCommissionPercent || 20
  }
  showCommissionModal.value = true
}

async function saveCommission() {
  try {
    saving.value = true
    await api.patch(`/Partner/${selectedPartner.value.id}/commission`, commissionForm.value)
    toast.show('Comisión actualizada correctamente', 'success')
    showCommissionModal.value = false
    loadPartners()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al actualizar la comisión', 'error')
  } finally {
    saving.value = false
  }
}

async function openDetailModal(partner) {
  selectedPartner.value = partner
  activeTab.value = 'invoices'
  try {
    const [summaryRes, salesRes, liqRes, invoicesRes] = await Promise.all([
      api.get(`/Partner/${partner.id}/admin-summary`),
      api.get(`/Partner/${partner.id}/sales`),
      api.get(`/Partner/${partner.id}/liquidations`),
      api.get(`/Partner/${partner.id}/invoices`, { params: { pageNumber: 1, pageSize: 50 } })
    ])
    partnerDetail.value = summaryRes.data.data
    partnerSales.value = salesRes.data.data
    liquidations.value = liqRes.data.data
    partnerInvoices.value = invoicesRes.data.data.data || []
    showDetailModal.value = true
  } catch (err) {
    console.error('Error al cargar el detalle de la socia.', err)
  }
}

function openLiquidationModal() {
  selectedInvoice.value = null
  liquidationForm.value = { amount: 0, notes: '' }
  showLiquidationModal.value = true
}

function openLiquidationModalForInvoice(invoice) {
  selectedInvoice.value = invoice
  liquidationForm.value = { amount: 0, notes: '', saleId: invoice.saleId }
  showLiquidationModal.value = true
}

function closeLiquidationModal() {
  showLiquidationModal.value = false
  selectedInvoice.value = null
  liquidationForm.value = { amount: 0, notes: '' }
}

async function saveLiquidation() {
  try {
    saving.value = true
    const now = new Date()
    const payload = {
      amount: liquidationForm.value.amount,
      type: 'Payment',
      notes: liquidationForm.value.notes || null,
      saleId: selectedInvoice.value?.saleId || null,
      periodFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      periodTo: now.toISOString()
    }
    await api.post(`/Partner/${selectedPartner.value.id}/liquidations`, payload)
    toast.show('Abono registrado correctamente', 'success')
    closeLiquidationModal()
    openDetailModal(selectedPartner.value)
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar el abono', 'error')
  } finally {
    saving.value = false
  }
}

async function downloadStatement() {
  try {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to = now.toISOString()
    const res = await api.get(`/Partner/${selectedPartner.value.id}/statement/pdf`, {
      params: { from, to },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch (err) {
    console.error('Error al descargar el estado de cuenta.', err)
  }
}

onMounted(loadPartners)
</script>

<style scoped>
.partners-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.state-text { text-align: center; padding: 30px 0; color: var(--color-text-muted); font-size: 13px; }
.hint-text { font-size: 12px; color: var(--color-accent); margin-top: 6px; }

.clickable-row { cursor: pointer; }
.clickable-row:hover { background: var(--color-accent-light) !important; }

.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  transition: var(--transition);
}
.btn-icon:hover { background: var(--color-accent-light); }

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
.summary-card.success { background: #EAF3DE; }
.summary-card.danger { background: #FFEBEE; }

.summary-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.summary-card strong { font-size: 15px; color: var(--color-text); }

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
  border-bottom: 2px solid transparent;
  transition: var(--transition);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.invoice-ref {
  background: var(--color-accent-light);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 13px;
  border-left: 3px solid var(--color-accent);
}
</style>
