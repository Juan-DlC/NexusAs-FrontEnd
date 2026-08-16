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
              <tr
                v-for="inv in partnerInvoices"
                :key="inv.saleId"
                class="clickable-row"
                @click="openInvoiceDetail(inv)"
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
                    @click.stop="openLiquidationModalForInvoice(inv)"
                  >
                    💳 Abonar
                  </button>
                  <span v-else-if="inv.isFullyReturned" class="badge badge-danger">Devuelta</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pagination" v-if="invoicesTotalPages > 1">
            <button class="btn btn-secondary btn-sm" :disabled="invoicesPageNumber <= 1" @click="loadMoreInvoices(invoicesPageNumber - 1)">
              ← Anterior
            </button>
            <span class="page-info">Página {{ invoicesPageNumber }} de {{ invoicesTotalPages }}</span>
            <button class="btn btn-secondary btn-sm" :disabled="invoicesPageNumber >= invoicesTotalPages" @click="loadMoreInvoices(invoicesPageNumber + 1)">
              Siguiente →
            </button>
          </div>
          <p v-else class="state-text">Sin facturas registradas.</p>
        </div>

        <div v-if="activeTab === 'liquidations'">
          <button class="btn btn-secondary btn-sm" @click="openLiquidationModal" style="margin-bottom: 12px;">
            + Registrar abono
          </button>
          <table v-if="sortedLiquidations.length > 0">
            <thead>
              <tr><th>Fecha</th><th>Monto</th><th>Factura</th><th>Notas</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in sortedLiquidations" :key="l.id">
                <td>{{ formatDate(l.date) }}</td>
                <td>${{ formatNumber(l.amount) }}</td>
                <td>{{ l.saleNumber || (l.notes && l.notes.includes('FACT') ? l.notes : 'Abono general') }}</td>
                <td>{{ (!l.notes || l.notes.includes('FACT')) ? '-' : l.notes }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="state-text">Sin abonos registrados.</p>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Cerrar</button>
        <button class="btn btn-primary" @click="openPartnerSaleModal">🧾 Nueva venta</button>
        <button class="btn btn-primary" @click="downloadStatement">Descargar estado de cuenta</button>
      </template>
    </ModalBase>

    <!-- Modal Registrar liquidación -->
    <ModalBase v-model="showLiquidationModal" title="Registrar abono de la socia" z-index="1100">
      <form @submit.prevent="saveLiquidation">
        <div v-if="selectedInvoice" class="invoice-ref">
          Abonando a factura: <strong>{{ selectedInvoice.saleNumber }}</strong>
          (Pendiente: <span style="color: var(--color-danger); font-weight: 600;">${{ formatNumber(selectedInvoice.pendingAmount) }}</span>)
        </div>
        <div class="credit-summary" v-if="partnerDetail">
          <p><strong>Deuda pendiente:</strong> <span style="color: var(--color-danger); font-weight: 700;">${{ formatNumber(partnerDetail.pendingDebt) }}</span></p>
          <p style="font-size: 11px; color: var(--color-text-muted);">El abono no puede superar la deuda pendiente</p>
        </div>
        
        <div class="form-group" v-if="selectedInvoice">
          <label class="form-label">Factura</label>
          <input
            type="text"
            class="form-input"
            :value="selectedInvoice.saleNumber"
            disabled
            style="background: var(--color-bg); cursor: not-allowed;"
          />
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

    <!-- Modal Detalle de Factura -->
    <ModalBase v-model="showInvoiceDetailModal" title="Detalle de factura" width="600px" :z-index="1050">
      <div v-if="selectedInvoiceDetail">
        <div class="detail-summary">
          <p><strong>Factura:</strong> {{ selectedInvoiceDetail.saleNumber }}</p>
          <p><strong>Fecha:</strong> {{ formatDate(selectedInvoiceDetail.date) }}</p>
          <p><strong>Total:</strong> ${{ formatNumber(selectedInvoiceDetail.total) }}</p>
          <p v-if="selectedInvoiceDetail.notes"><strong>Notas:</strong> {{ selectedInvoiceDetail.notes }}</p>
        </div>

        <div class="divider-label">Productos</div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in selectedInvoiceDetail.details" :key="i">
              <td>{{ d.productCode || d.code || '-' }}</td>
              <td>{{ d.productName }}</td>
              <td>{{ d.quantity }}</td>
              <td>${{ formatNumber(d.unitPrice) }}</td>
              <td>${{ formatNumber(d.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="selectedInvoiceDetail.creditInfo" class="credit-box" style="margin-top: 14px;">
          <div class="divider-label">Estado del crédito</div>
          <p style="color: var(--color-danger)">
            <strong>Pendiente:</strong> ${{ formatNumber(selectedInvoiceDetail.creditInfo.pendingAmount) }}
          </p>
          <p style="color: var(--color-success)">
            <strong>Abonado:</strong> ${{ formatNumber(selectedInvoiceDetail.creditInfo.paidAmount) }}
          </p>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showInvoiceDetailModal = false">Cerrar</button>
        <button class="btn btn-secondary" @click="downloadInvoicePdf(selectedInvoiceDetail.id)">📄 Ver factura PDF</button>
        <button class="btn btn-warning" @click="openReturnFromInvoice">↩ Registrar devolución</button>
        <button
          v-if="selectedInvoiceDetail?.creditInfo?.pendingAmount > 0"
          class="btn btn-primary"
          @click="openLiquidationModalForInvoice({ saleId: selectedInvoiceDetail.id, saleNumber: selectedInvoiceDetail.saleNumber, pendingAmount: selectedInvoiceDetail.creditInfo.pendingAmount })"
        >
          💳 Registrar abono
        </button>
      </template>
    </ModalBase>

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
    <ModalBase v-model="showPartnerSaleModal" :title="'Nueva venta — ' + (selectedPartner?.partnerName || '')" width="640px">
      <div class="invoice-ref" style="margin-bottom: 16px;">
        Registrando venta a nombre de: <strong>{{ selectedPartner?.partnerName }}</strong>
      </div>

      <div class="form-group">
        <label class="form-label">Método de pago <span style="color: var(--color-danger)">*</span></label>
        <select v-model.number="partnerSaleForm.paymentMethodId" class="form-input" required>
          <option :value="null" disabled>Selecciona método de pago</option>
          <option v-for="pm in partnerPaymentMethods" :key="pm.id" :value="pm.id">
            {{ pm.name }}
          </option>
        </select>
      </div>

      <div v-if="partnerSaleForm.paymentMethodId" :class="['payment-info', partnerSaleIsCredit ? 'payment-info-credit' : 'payment-info-cash']">
        {{ partnerSaleIsCredit ? '⚠️ Esta venta generará deuda para la socia' : '✅ Venta de contado, no genera deuda' }}
      </div>

      <div class="divider-label">Productos</div>

      <div v-for="(detail, index) in partnerSaleForm.details" :key="index">
        <div class="detail-row-partner">
          <ProductSearch @select="(p) => onPartnerProductSelect(detail, p)" />
          <input
            v-model.number="detail.quantity"
            type="number"
            min="1"
            class="form-input qty-input"
            :class="{ 'input-error': detail.productId && detail.quantity > detail.stock }"
          />
          <div class="price-info" v-if="detail.productId">
            <span class="partner-price">A socia: ${{ formatNumber(detail.partnerPrice) }}</span>
            <span class="suggested-price">Sugerido: ${{ formatNumber(detail.suggestedPrice) }}</span>
          </div>
          <button
            type="button"
            class="btn-icon btn-icon-danger"
            @click="partnerSaleForm.details.splice(index, 1)"
            v-if="partnerSaleForm.details.length > 1"
          >
            ✕
          </button>
        </div>

        <div class="partner-sale-detail" v-if="detail.productId && detail.partnerPrice > 0">
          <div class="price-row">
            <span>💰 Precio a socia (lo que paga a AS):</span>
            <strong style="color: var(--color-accent)">${{ formatNumber(detail.partnerPrice) }}</strong>
          </div>
          <div class="price-row">
            <span>🏷️ Precio sugerido de venta:</span>
            <span style="color: var(--color-text-muted)">${{ formatNumber(detail.suggestedPrice) }}</span>
          </div>
          <div class="price-row" v-if="Number(detail.quantity) > 1">
            <span>📦 Subtotal ({{ detail.quantity }} × ${{ formatNumber(detail.partnerPrice) }}):</span>
            <strong>${{ formatNumber(detail.partnerPrice * detail.quantity) }}</strong>
          </div>
        </div>

        <p class="stock-warning" v-if="detail.productId && detail.quantity > detail.stock">
          ⚠️ Stock insuficiente — disponible: {{ detail.stock }}
        </p>
      </div>

      <button
        type="button"
        class="btn btn-secondary btn-sm"
        @click="partnerSaleForm.details.push({ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 })"
        style="margin-bottom: 16px;"
      >
        + Agregar producto
      </button>

      <div class="form-group">
        <label class="form-label">Notas (opcional)</label>
        <input
          v-model="partnerSaleForm.notes"
          type="text"
          class="form-input"
          @input="partnerSaleForm.notes = toUpperCase(partnerSaleForm.notes)"
        />
      </div>

      <div class="total-preview" style="margin-top: 16px;">
        <span>Total a cobrar a la socia:</span>
        <strong>${{ formatNumber(partnerCalculatedTotal) }}</strong>
      </div>
      <p style="font-size: 11px; color: var(--color-text-muted); text-align: right; margin-top: 4px;">
        Precio sugerido total de venta: ${{ formatNumber(partnerSaleForm.details.reduce((s, d) => s + ((d.suggestedPrice || 0) * (d.quantity || 0)), 0)) }}
      </p>

      <template #footer>
        <button class="btn btn-secondary" @click="showPartnerSaleModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="savePartnerSale" :disabled="saving">
          {{ saving ? 'Registrando...' : 'Registrar venta' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Devolución desde Socia -->
    <ModalBase v-model="showReturnFromPartnerModal" title="Registrar devolución" width="560px">
      <div class="invoice-ref" style="margin-bottom: 16px;">
        Devolución de: <strong>{{ selectedInvoiceDetail?.saleNumber }}</strong>
      </div>
      <div v-for="(d, i) in returnPartnerForm.details" :key="i" class="return-item">
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
          v-model="returnPartnerForm.notes"
          type="text"
          class="form-input"
          @input="returnPartnerForm.notes = toUpperCase(returnPartnerForm.notes)"
        />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showReturnFromPartnerModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveReturnFromPartner" :disabled="saving">
          {{ saving ? 'Procesando...' : 'Confirmar devolución' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import ProductSearch from '@/components/shared/ProductSearch.vue'
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
const selectedInvoiceDetail = ref(null)
const partnerDetail = ref(null)
const partnerSales = ref([])
const partnerInvoices = ref([])
const invoicesTotalPages = ref(1)
const invoicesPageNumber = ref(1)
const liquidations = ref([])
const activeTab = ref('invoices')
const commissionForm = ref({ commissionPercent: 0, allianceCommissionPercent: 0 })

const showReturnFromPartnerModal = ref(false)
const showInvoiceDetailModal = ref(false)
const showPartnerSaleModal = ref(false)
const showSelectPartnerModal = ref(false)
const returnPartnerForm = ref({ notes: '', details: [] })

const liquidationForm = ref({ amount: 0, notes: '' })

const partnerSaleForm = ref({
  paymentMethodId: null,
  notes: '',
  requestId: '',
  details: [{ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 }]
})

// Función para generar RequestId único
const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const partnerPaymentMethods = ref([])

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
  invoicesPageNumber.value = 1
  try {
    const [summaryRes, salesRes, liqRes, invoicesRes] = await Promise.all([
      api.get(`/Partner/${partner.id}/admin-summary`),
      api.get(`/Partner/${partner.id}/sales`),
      api.get(`/Partner/${partner.id}/liquidations`),
      api.get(`/Partner/${partner.id}/invoices`, { params: { pageNumber: 1, pageSize: 20 } })
    ])
    partnerDetail.value = summaryRes.data.data
    partnerSales.value = salesRes.data.data
    liquidations.value = liqRes.data.data
    partnerInvoices.value = invoicesRes.data.data?.data || invoicesRes.data.data || []
    invoicesTotalPages.value = invoicesRes.data.data?.totalPages || 1
    
    // Debug: Ver qué devuelve el API
    console.log('📋 Facturas desde API:', partnerInvoices.value)
    if (partnerInvoices.value.length > 0) {
      console.log('🔍 Primera factura creditStatus:', partnerInvoices.value[0].creditStatus)
      console.log('🔍 Primera factura completa:', partnerInvoices.value[0])
    }
    
    console.log('💰 Liquidaciones desde API:', liquidations.value)
    if (liquidations.value.length > 0) {
      console.log('🔍 Primera liquidación:', liquidations.value[0])
      console.log('🔍 ¿Tiene saleNumber?:', liquidations.value[0].saleNumber)
    }
    
    showDetailModal.value = true
  } catch (err) {
    console.error('Error al cargar el detalle de la socia.', err)
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
  if (liquidationForm.value.amount <= 0) {
    toast.show('El monto debe ser mayor a 0', 'warning')
    return
  }
  if (partnerDetail.value && liquidationForm.value.amount > partnerDetail.value.pendingDebt) {
    toast.show(`El abono supera la deuda: $${formatNumber(partnerDetail.value.pendingDebt)}`, 'error')
    return
  }
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
    
    // Recargar resumen Y facturas para reflejar cambios dinámicamente
    const [summaryRes, invoicesRes, liqRes] = await Promise.all([
      api.get(`/Partner/${selectedPartner.value.id}/admin-summary`),
      api.get(`/Partner/${selectedPartner.value.id}/invoices`, { params: { pageNumber: invoicesPageNumber.value, pageSize: 20 } }),
      api.get(`/Partner/${selectedPartner.value.id}/liquidations`)
    ])
    partnerDetail.value = summaryRes.data.data
    partnerInvoices.value = invoicesRes.data.data?.data || []
    invoicesTotalPages.value = invoicesRes.data.data?.totalPages || 1
    liquidations.value = liqRes.data.data
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar abono', 'error')
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
  returnPartnerForm.value = {
    notes: '',
    details: selectedInvoiceDetail.value.details.map(d => ({
      productId: d.productId,
      productName: d.productName,
      originalQuantity: d.quantity,
      returnQuantity: 0,
      selected: false
    }))
  }
  showReturnFromPartnerModal.value = true
}

async function saveReturnFromPartner() {
  const details = returnPartnerForm.value.details
    .filter(d => d.selected && d.returnQuantity > 0)
    .map(d => ({ productId: d.productId, quantity: d.returnQuantity }))

  if (details.length === 0) {
    toast.show('Selecciona al menos un producto', 'warning')
    return
  }

  try {
    saving.value = true
    await api.post('/Return', {
      saleId: selectedInvoiceDetail.value.id,
      notes: returnPartnerForm.value.notes || null,
      details
    })
    toast.show('Devolución registrada. Stock actualizado.', 'success')
    showReturnFromPartnerModal.value = false
    showInvoiceDetailModal.value = false
    openDetailModal(selectedPartner.value)
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al registrar devolución', 'error')
  } finally {
    saving.value = false
  }
}

const partnerCalculatedTotal = computed(() => {
  return partnerSaleForm.value.details.reduce((sum, d) => {
    const price = Number(d.partnerPrice) || 0
    const qty = Number(d.quantity) || 1
    return sum + (price * qty)
  }, 0)
})

const selectedPartnerPaymentMethod = computed(() =>
  partnerPaymentMethods.value.find(pm => pm.id === partnerSaleForm.value.paymentMethodId)
)

const partnerSaleIsCredit = computed(() => selectedPartnerPaymentMethod.value?.code === 'CREDIT')

// Ordenar liquidaciones de más reciente a más antiguo
const sortedLiquidations = computed(() => {
  if (!liquidations.value || !Array.isArray(liquidations.value)) return []
  return [...liquidations.value].sort((a, b) => new Date(b.date) - new Date(a.date))
})

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

  // Preseleccionar método "Contado" por defecto
  const defaultMethod = partnerPaymentMethods.value.find(pm => pm.code === 'CASH')

  partnerSaleForm.value = {
    paymentMethodId: defaultMethod?.id || null,
    notes: '',
    requestId: generateRequestId(), // Generar RequestId único
    details: [{ productId: '', quantity: 1, unitPrice: 0, partnerPrice: 0, suggestedPrice: 0, stock: 0 }]
  }
  showPartnerSaleModal.value = true
}

function onPartnerProductSelect(detail, product) {
  detail.productId = product.id
  detail.stock = product.stock
  detail.suggestedPrice = product.salePrice || 0

  // Calcular precio a socia usando comisiones de selectedPartner
  const commissionPercent = product.isPartnership
    ? (selectedPartner.value.allianceCommissionPercent || 20)
    : (selectedPartner.value.commissionPercent || 50)

  const gainAS = (product.salePrice || 0) - (product.cost || 0)
  const calculatedPartnerPrice = (product.cost || 0) + (gainAS * commissionPercent / 100)

  detail.partnerPrice = Math.round(calculatedPartnerPrice)
  detail.unitPrice = detail.partnerPrice
}

async function savePartnerSale() {
  // Validaciones
  if (!partnerSaleForm.value.paymentMethodId) {
    toast.show('Selecciona un método de pago', 'warning')
    return
  }

  if (partnerSaleForm.value.details.some(d => !d.productId)) {
    toast.show('Selecciona un producto en cada fila', 'warning')
    return
  }

  if (partnerSaleForm.value.details.some(d => !d.partnerPrice || d.partnerPrice <= 0)) {
    toast.show('Hay productos sin precio calculado. Verifica la configuración de comisiones.', 'error')
    return
  }

  try {
    saving.value = true

    const payload = {
      requestId: partnerSaleForm.value.requestId, // Incluir requestId
      partnerUserId: selectedPartner.value.userId,
      paymentMethodId: partnerSaleForm.value.paymentMethodId,
      numberOfInstallments: 1,
      discount: 0,
      notes: partnerSaleForm.value.notes || null,
      details: partnerSaleForm.value.details
        .filter(d => d.productId && d.partnerPrice > 0)
        .map(d => ({
          productId: d.productId,
          quantity: Number(d.quantity) || 1,
          unitPrice: Number(d.partnerPrice)
        }))
    }

    if (payload.details.length === 0) {
      toast.show('Agrega al menos un producto válido', 'warning')
      return
    }

    console.log('🚀 Payload venta a socia:', payload)
    
    await api.post('/Sale', payload)
    toast.show('Venta registrada correctamente', 'success')
    
    // Regenerar requestId para próxima venta
    partnerSaleForm.value.requestId = generateRequestId()
    
    showPartnerSaleModal.value = false
    openDetailModal(selectedPartner.value)
  } catch (err) {
    console.error('❌ Error venta a socia:', err.response?.data)
    toast.show(err.response?.data?.message || 'Error al registrar venta', 'error')
  } finally {
    saving.value = false
  }
}

async function downloadInvoicePdf(saleId) {
  try {
    const res = await api.get(`/Sale/${saleId}/receipt`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al generar el PDF', 'error')
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

.credit-box {
  background: var(--color-accent-light);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
}

.detail-summary {
  background: var(--color-bg);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.detail-summary p {
  font-size: 13px;
  margin-bottom: 6px;
}

.divider-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 16px 0 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.detail-row {
  display: grid;
  grid-template-columns: 2fr 70px 100px 32px;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.qty-input, .price-input { padding: 10px 8px; }

.input-error { border-color: var(--color-danger) !important; }

.stock-warning {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: -4px;
  margin-bottom: 8px;
}

.total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-accent-light);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text);
  margin-top: 8px;
}

.total-preview strong { color: var(--color-accent); font-size: 17px; }

.btn-icon-danger:hover { background: #FFEBEE; color: var(--color-danger); }

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

.detail-row-partner {
  display: grid;
  grid-template-columns: 2fr 70px 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: start;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.partner-price {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
}

.suggested-price {
  font-size: 11px;
  color: var(--color-text-muted);
}

.partner-product-summary {
  background: var(--color-accent-light);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  margin-top: -4px;
  margin-bottom: 8px;
}

.partner-sale-detail {
  background: var(--color-accent-light);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  margin: -4px 0 10px 0;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 3px 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}

.credit-summary {
  background: var(--color-accent-light);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  border-left: 3px solid var(--color-danger);
}

.credit-summary p {
  margin-bottom: 6px;
  font-size: 13px;
}

.credit-summary p:last-child {
  margin-bottom: 0;
}

.payment-info {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  margin-top: 6px;
}

.payment-info-credit {
  background: #FFF3E0;
  color: var(--color-warning);
}

.payment-info-cash {
  background: #E8F5E9;
  color: var(--color-success);
}
</style>
