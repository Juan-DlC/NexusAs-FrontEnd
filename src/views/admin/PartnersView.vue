<template>
  <div class="partners-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Socias Vendedoras</h2>
        <p class="page-sub">{{ partners.length }} socias registradas</p>
      </div>
      <button class="btn btn-secondary" @click="openSelectPartnerForSale" style="margin-right: 8px;">
        🧾 Venta a socia
      </button>
    </div>

    <PartnerList
      :partners="partners"
      :loading="loading"
      @partner-clicked="openDetailModal"
      @edit-commission="openCommissionModal"
    />

    <!-- Modal Editar comisión -->
    <ModalBase v-model="showCommissionModal" title="Editar comisiones" width="480px">
      <div v-if="selectedPartner">
        <!-- Info de la socia -->
        <div style="background: var(--color-bg); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 20px;">
          <p style="font-size: 14px; font-weight: 700;">{{ selectedPartner.partnerName }}</p>
          <p style="font-size: 12px; color: var(--color-text-muted);">{{ selectedPartner.username }}</p>
        </div>

        <!-- % General productos AS -->
        <div class="form-group">
          <label class="form-label">% Comisión productos normales (AS)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input 
              v-model.number="commissionForm.commissionPercent"
              type="number" 
              min="1" 
              max="100"
              class="form-input" 
              style="max-width: 80px;" 
            />
            <span style="font-size: 13px; color: var(--color-text-muted);">%</span>
          </div>
          <p class="hint-text">% de la ganancia de AS en productos propios que recibe esta socia.</p>
        </div>

        <!-- % por Socio Comercial -->
        <div class="form-group" style="margin-top: 4px;">
          <label class="form-label">% Comisión por Socio Comercial (Alianza)</label>
          
          <div 
            v-if="commissionForm.businessCommissions.length === 0"
            style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 13px; background: var(--color-bg); border-radius: var(--radius-sm);"
          >
            No hay socios comerciales registrados.<br>
            <span style="font-size: 12px;">Créalos en "Socios Comerciales".</span>
          </div>

          <div 
            v-for="bc in commissionForm.businessCommissions" 
            :key="bc.businessPartnerId"
            class="alliance-commission-row"
          >
            <div>
              <span class="alliance-name">🤝 {{ bc.businessPartnerName }}</span>
              <span style="font-size: 11px; color: var(--color-text-muted); margin-left: 6px;">(Alianza)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input 
                v-model.number="bc.commissionPercent"
                type="number" 
                min="0" 
                max="100"
                class="form-input"
                style="max-width: 70px; padding: 6px 10px;" 
              />
              <span style="font-size: 13px; color: var(--color-text-muted);">%</span>
            </div>
          </div>

          <p class="hint-text" v-if="commissionForm.businessCommissions.length > 0">
            % de la ganancia que recibe esta socia al vender productos de cada alianza.
            Cada socio comercial puede tener un porcentaje diferente.
          </p>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showCommissionModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveCommission" :disabled="saving">
          {{ saving ? '⏳ Guardando...' : 'Guardar comisiones' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Detalle de socia -->
    <PartnerDetailModal
      v-model="showDetailModal"
      :partner="selectedPartner"
      :partner-detail="partnerDetail"
      :invoices="partnerInvoices"
      :invoices-page="invoicesPageNumber"
      :invoices-total-pages="invoicesTotalPages"
      :liquidations="liquidations"
      :liquidations-page="liquidationsPage"
      :liquidations-total-pages="liquidationsTotalPages"
      @invoice-clicked="openInvoiceDetail"
      @payment-clicked="openLiquidationModalForInvoice"
      @add-payment="openLiquidationModal"
      @open-sale="openPartnerSaleModal"
      @download-statement="downloadStatement"
      @invoices-page-changed="loadMoreInvoices"
      @liquidations-page-changed="loadLiquidations"
    />

    <!-- Modal Registrar liquidación -->
    <PartnerPaymentModal
      v-model="showLiquidationModal"
      :partner="selectedPartner"
      :invoice="selectedInvoice"
      :pending-debt="partnerDetail?.pendingDebt || 0"
      @payment-saved="onPaymentSaved"
    />

    <!-- Modal Detalle de Factura -->
    <PartnerInvoiceDetailModal
      v-model="showInvoiceDetailModal"
      :invoice="selectedInvoiceDetail"
      @open-return="openReturnFromInvoice"
      @open-payment="openPaymentFromInvoiceDetail"
    />

    <!-- Modal Selección de Socia -->
    <ModalBase v-model="showSelectPartnerModal" title="Seleccionar socia" width="400px">
      <div v-for="p in partners" :key="p.id" class="partner-select-item" @click="selectPartnerForSale(p)">
        <strong>{{ p.partnerName }}</strong>
        <span style="font-size:12px; color: var(--color-text-muted)">{{ p.username }}</span>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showSelectPartnerModal = false">Cancelar</button>
      </template>
    </ModalBase>

    <!-- Modal Venta a Socia -->
    <PartnerSaleModal
      v-model="showPartnerSaleModal"
      :partner="selectedPartner"
      :payment-methods="partnerPaymentMethods"
      @sale-created="onPartnerSaleCreated"
    />

    <!-- Modal Devolución desde Socia -->
    <PartnerReturnModal
      v-model="showReturnFromPartnerModal"
      :invoice="selectedInvoiceDetail"
      @return-saved="onReturnSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import PartnerList from '@/components/partners/PartnerList.vue'
import PartnerDetailModal from '@/components/partners/PartnerDetailModal.vue'
import PartnerPaymentModal from '@/components/partners/PartnerPaymentModal.vue'
import PartnerInvoiceDetailModal from '@/components/partners/PartnerInvoiceDetailModal.vue'
import PartnerSaleModal from '@/components/partners/PartnerSaleModal.vue'
import PartnerReturnModal from '@/components/partners/PartnerReturnModal.vue'

const toast = useToastStore()

const partners = ref([])
const loading = ref(true)
const saving = ref(false)

const showCommissionModal = ref(false)
const showDetailModal = ref(false)
const showLiquidationModal = ref(false)
const showInvoiceDetailModal = ref(false)
const showPartnerSaleModal = ref(false)
const showSelectPartnerModal = ref(false)
const showReturnFromPartnerModal = ref(false)

const selectedPartner = ref(null)
const selectedInvoice = ref(null)
const selectedInvoiceDetail = ref(null)
const partnerDetail = ref(null)
const partnerInvoices = ref([])
const invoicesTotalPages = ref(1)
const invoicesPageNumber = ref(1)
const liquidations = ref([])
const liquidationsPage = ref(1)
const liquidationsTotalPages = ref(1)
const activeTab = ref('invoices')
const commissionForm = ref({
  commissionPercent: 0,
  allianceCommissionPercent: 20,
  businessCommissions: []
})
const businessPartners = ref([])

const partnerPaymentMethods = ref([])

async function loadPartners() {
  try {
    loading.value = true
    const res = await api.get('/Partner')
    partners.value = res.data.data
  } catch {
    toast.show('Error al cargar las socias', 'error')
  } finally {
    loading.value = false
  }
}

async function openCommissionModal(partner) {
  selectedPartner.value = partner

  // Cargar socios comerciales activos
  try {
    const res = await api.get('/BusinessPartner', { params: { pageSize: 100 } })
    businessPartners.value = res.data.data?.data || res.data.data || []
  } catch {
    businessPartners.value = []
  }

  // Inicializar form con comisiones actuales
  // partner.businessCommissions viene del backend como array de {businessPartnerId, businessPartnerName, commissionPercent}
  commissionForm.value = {
    commissionPercent: partner.commissionPercent,
    allianceCommissionPercent: partner.allianceCommissionPercent || 20,
    businessCommissions: businessPartners.value.map(bp => {
      const existing = partner.businessCommissions?.find(bc => bc.businessPartnerId === bp.id)
      return {
        businessPartnerId: bp.id,
        businessPartnerName: bp.name,
        commissionPercent: existing?.commissionPercent ?? (partner.allianceCommissionPercent || 20)
      }
    })
  }
  showCommissionModal.value = true
}

async function saveCommission() {
  try {
    saving.value = true
    await api.patch(`/Partner/${selectedPartner.value.id}/commission`, commissionForm.value)
    toast.show('Comisiones actualizadas correctamente', 'success')
    showCommissionModal.value = false
    await loadPartners()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al actualizar comisiones', 'error')
  } finally {
    saving.value = false
  }
}

async function openDetailModal(partner) {
  selectedPartner.value = partner
  activeTab.value = 'invoices'
  invoicesPageNumber.value = 1
  liquidationsPage.value = 1
  try {
    const [summaryRes, invoicesRes, liqRes] = await Promise.all([
      api.get(`/Partner/${partner.id}/admin-summary`),
      api.get(`/Partner/${partner.id}/invoices`, { params: { pageNumber: 1, pageSize: 20 } }),
      api.get(`/Partner/${partner.id}/liquidations/paged`, { params: { pageNumber: 1, pageSize: 10 } })
    ])
    partnerDetail.value = summaryRes.data.data
    partnerInvoices.value = invoicesRes.data.data?.data || invoicesRes.data.data || []
    invoicesTotalPages.value = invoicesRes.data.data?.totalPages || 1
    liquidations.value = liqRes.data.data?.data || liqRes.data.data || []
    liquidationsTotalPages.value = liqRes.data.data?.totalPages || 1

    showDetailModal.value = true
  } catch {
    toast.show('Error al cargar el detalle de la socia', 'error')
  }
}

async function loadMoreInvoices(page) {
  invoicesPageNumber.value = page
  const res = await api.get(`/Partner/${selectedPartner.value.id}/invoices`, {
    params: { pageNumber: page, pageSize: 20 }
  })
  partnerInvoices.value = res.data.data?.data || []
  invoicesTotalPages.value = res.data.data?.totalPages || 1
}

async function loadLiquidations(page = 1) {
  const res = await api.get(`/Partner/${selectedPartner.value.id}/liquidations/paged`, {
    params: { pageNumber: page, pageSize: 10 }
  })
  liquidations.value = res.data.data?.data || []
  liquidationsTotalPages.value = res.data.data?.totalPages || 1
  liquidationsPage.value = page
}

function openLiquidationModal() {
  selectedInvoice.value = null
  showLiquidationModal.value = true
}

function openLiquidationModalForInvoice(invoice) {
  selectedInvoice.value = invoice
  showLiquidationModal.value = true
}

async function onPaymentSaved() {
  toast.show('Abono registrado correctamente', 'success')
  showLiquidationModal.value = false
  selectedInvoice.value = null

  if (!selectedPartner.value) return

  // Pequeño delay para asegurar que el backend actualizó los datos
  await new Promise(resolve => setTimeout(resolve, 300))

  // Recargar resumen, facturas y liquidaciones en paralelo
  try {
    const [summaryRes, invoicesRes, liqRes] = await Promise.all([
      api.get(`/Partner/${selectedPartner.value.id}/admin-summary`),
      api.get(`/Partner/${selectedPartner.value.id}/invoices`, {
        params: { pageNumber: invoicesPageNumber.value, pageSize: 20 }
      }),
      api.get(`/Partner/${selectedPartner.value.id}/liquidations/paged`, {
        params: { pageNumber: liquidationsPage.value, pageSize: 10 }
      })
    ])

    partnerDetail.value = summaryRes.data.data
    partnerInvoices.value = invoicesRes.data.data?.data || []
    invoicesTotalPages.value = invoicesRes.data.data?.totalPages || 1
    liquidations.value = liqRes.data.data?.data || []
    liquidationsTotalPages.value = liqRes.data.data?.totalPages || 1

    // Si hay un modal de factura abierto, recargar sus datos actualizados
    if (showInvoiceDetailModal.value && selectedInvoiceDetail.value) {
      const invoiceRes = await api.get(`/Sale/${selectedInvoiceDetail.value.id}`)
      selectedInvoiceDetail.value = invoiceRes.data.data
    }
  } catch {
    toast.show('Error al recargar los datos', 'error')
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
  } catch {
    toast.show('Error al descargar el estado de cuenta', 'error')
  }
}

async function openInvoiceDetail(inv) {
  try {
    const res = await api.get(`/Sale/${inv.saleId}`)
    selectedInvoiceDetail.value = res.data.data
    showInvoiceDetailModal.value = true
  } catch {
    toast.show('Error al cargar detalle de factura', 'error')
  }
}

function openReturnFromInvoice() {
  showReturnFromPartnerModal.value = true
}

function openPaymentFromInvoiceDetail() {
  openLiquidationModalForInvoice({
    saleId: selectedInvoiceDetail.value.id,
    saleNumber: selectedInvoiceDetail.value.saleNumber,
    pendingAmount: selectedInvoiceDetail.value.creditInfo.pendingAmount
  })
}

async function onReturnSaved() {
  toast.show('Devolución registrada. Stock actualizado.', 'success')
  showInvoiceDetailModal.value = false
  await openDetailModal(selectedPartner.value)
}

function openSelectPartnerForSale() {
  showSelectPartnerModal.value = true
}

function selectPartnerForSale(partner) {
  showSelectPartnerModal.value = false
  selectedPartner.value = partner
  openPartnerSaleModal()
}

async function openPartnerSaleModal() {
  if (partnerPaymentMethods.value.length === 0) {
    try {
      const res = await api.get('/PaymentMethod')
      partnerPaymentMethods.value = res.data.data.filter(pm => pm.code === 'CASH' || pm.code === 'CREDIT')
    } catch {
      toast.show('Error cargando métodos de pago', 'error')
      return
    }
  }

  showPartnerSaleModal.value = true
}

async function onPartnerSaleCreated() {
  // ✅ Toast ya se muestra en PartnerSaleModal, no duplicar aquí
  showPartnerSaleModal.value = false
  if (selectedPartner.value) {
    await openDetailModal(selectedPartner.value)
  }
}

onMounted(loadPartners)
</script>

<style scoped>
.partners-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.partner-select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition);
}

.partner-select-item:hover {
  background: var(--color-accent-light);
}

.hint-text {
  font-size: 12px;
  color: var(--color-accent);
  margin-top: 4px;
}

.alliance-commission-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
  border: 1px solid var(--color-border);
}

.alliance-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
</style>
