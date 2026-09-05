<template>
  <div class="business-partners-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Socios Comerciales</h2>
        <p class="page-sub">{{ partners.length }} socios registrados</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="openCreateModal">
        + Nuevo socio
      </button>
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="partners.length === 0" class="state-text">
        No hay socios comerciales registrados.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Nombre COMERCIAL</th>
            <th>NOMBRE NATURAL</th>
            <th>Teléfono</th>
            <th>% Comisión</th>
            <th>Productos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in partners" :key="p.id" class="clickable-row" @click="openDetailModal(p)">
            <td><strong>{{ p.name }}</strong></td>
            <td>{{ p.documentNumber || '-' }}</td>
            <td>{{ p.phone || '-' }}</td>
            <td>{{ p.commissionPercent }}%</td>
            <td>{{ p.productCount }} productos</td>
            <td>
              <span :class="['badge', p.isActive ? 'badge-success' : 'badge-danger']">
                {{ p.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button class="btn-icon" @click.stop="openEditModal(p)" title="✏️ Editar">✎</button>
              <button class="btn-icon" @click.stop="openCommissionModal(p)" title="💰 Comisión">%</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Crear/Editar -->
    <ModalBase v-model="showModal" :title="editingPartner ? 'Editar socio' : 'Nuevo socio comercial'">
      <div class="form-group">
        <label class="form-label">Nombre del socio *</label>
        <input v-model="form.name" type="text" class="form-input" required
          @input="form.name = toUpperCase(form.name)" />
      </div>

      <div class="form-group">
        <label class="form-label">Documento (NIT, cédula) *</label>
        <input v-model="form.documentNumber" type="text" class="form-input" required
          placeholder="Ej: 900123456" />
        <p class="hint-text">Número de identificación del socio comercial</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Teléfono (opcional)</label>
          <input v-model="form.phone" type="text" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Email (opcional)</label>
          <input v-model="form.email" type="email" class="form-input" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Dirección (opcional)</label>
        <input v-model="form.address" type="text" class="form-input"
          @input="form.address = toUpperCase(form.address)" />
      </div>

      <div class="form-group">
        <label class="form-label">% de comisión sobre ganancia neta *</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input v-model.number="form.commissionPercent" type="number"
            min="0" max="100" class="form-input" style="max-width: 80px;" required />
          <span style="font-size: 13px; color: var(--color-text-muted);">%</span>
        </div>
        <p class="hint-text">Porcentaje de la ganancia neta que recibe el socio. Default: 50%</p>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="savePartner" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Editar Comisión -->
    <ModalBase v-model="showCommissionModal" title="Editar comisión">
      <div v-if="selectedPartner" class="form-group">
        <label class="form-label">Socio: {{ selectedPartner.name }}</label>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <input v-model.number="newCommission" type="number" min="1" max="100" class="form-input"
            style="max-width: 80px;" />
          <span>%</span>
        </div>
        <p class="hint-text">% de la ganancia neta que recibe este socio en la liquidación.</p>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showCommissionModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveCommission" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Actualizar' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Detalle: Liquidaciones e historial -->
    <ModalBase v-model="showDetailModal"
      :title="`Socio: ${selectedPartner?.name || ''}`" width="760px">
      <div v-if="selectedPartner">
        <div class="partner-info-bar">
          <span>Comisión: <strong>{{ selectedPartner.commissionPercent }}%</strong></span>
          <span>Productos: <strong>{{ selectedPartner.productCount }}</strong></span>
          <span v-if="selectedPartner.phone">📞 {{ selectedPartner.phone }}</span>
        </div>

        <div class="section-header">
          <h3>Vista previa de liquidación</h3>
          <p class="hint-text">Selecciona el período de ventas COMPLETAMENTE PAGADAS para calcular</p>
        </div>

        <div class="liquidation-period-row">
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input v-model="liquidationFrom" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input v-model="liquidationTo" type="date" class="form-input" />
          </div>
          <button class="btn btn-secondary" @click="previewLiquidation" :disabled="loadingPreview">
            <span v-if="loadingPreview">⏳ Calculando...</span>
            <span v-else>🔍 Calcular liquidación</span>
          </button>
        </div>

        <div v-if="liquidationPreview" class="liquidation-preview">
          <div class="preview-grid">
            <div class="preview-card">
              <span class="preview-label">Ventas brutas</span>
              <strong>${{ formatNumber(liquidationPreview.totalRevenue) }}</strong>
            </div>
            <div class="preview-card">
              <span class="preview-label">Costo (inversión)</span>
              <strong>${{ formatNumber(liquidationPreview.totalCost) }}</strong>
            </div>
            <div class="preview-card success">
              <span class="preview-label">Ganancia bruta</span>
              <strong>${{ formatNumber(liquidationPreview.grossProfit) }}</strong>
            </div>
            <div class="preview-card warning">
              <span class="preview-label">Descuento socias vendedoras</span>
              <strong>-${{ formatNumber(liquidationPreview.partnerSalesDiscount) }}</strong>
            </div>
            <div class="preview-card">
              <span class="preview-label">Ganancia neta</span>
              <strong>${{ formatNumber(liquidationPreview.netProfit) }}</strong>
            </div>
            <div class="preview-card accent">
              <span class="preview-label">Le corresponde al socio ({{ selectedPartner.commissionPercent }}%)</span>
              <strong>${{ formatNumber(liquidationPreview.businessPartnerEarning) }}</strong>
            </div>
            <div class="preview-card success">
              <span class="preview-label">Le corresponde a AS</span>
              <strong>${{ formatNumber(liquidationPreview.asEarning) }}</strong>
            </div>
          </div>

          <div v-if="liquidationPreview.sales && liquidationPreview.sales.length > 0" style="margin-top: 16px;">
            <p style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">
              Facturas incluidas ({{ liquidationPreview.sales.length }}):
            </p>
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Venta</th>
                  <th>Costo</th>
                  <th>G. Neta</th>
                  <th>Socio {{ selectedPartner.commissionPercent }}%</th>
                  <th>AS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in liquidationPreview.sales" :key="s.saleId">
                  <td><strong>{{ s.saleNumber }}</strong></td>
                  <td>{{ formatDate(s.saleDate) }}</td>
                  <td>{{ s.sellerName }}</td>
                  <td>${{ formatNumber(s.revenue) }}</td>
                  <td>${{ formatNumber(s.cost) }}</td>
                  <td>${{ formatNumber(s.netProfit) }}</td>
                  <td style="color: var(--color-accent);">${{ formatNumber(s.businessPartnerEarning) }}</td>
                  <td style="color: var(--color-success);">${{ formatNumber(s.asEarning) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="liquidationPreview && liquidationPreview.sales?.length === 0" class="empty-preview">
            <p>⚠️ No se encontraron ventas completamente pagadas de este socio en el período seleccionado.</p>
            <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 6px;">
              Recuerda: solo se incluyen ventas de contado o créditos completamente pagados,
              que no hayan sido liquidados previamente.
            </p>
          </div>

          <div v-if="liquidationPreview && liquidationPreview.sales?.length > 0" class="confirm-liquidation-box">
            <div class="confirm-summary">
              <p>✅ Se liquidarán <strong>{{ liquidationPreview.sales.length }} facturas</strong></p>
              <p>💰 Total para <strong>{{ selectedPartner.name }}</strong>:
                <strong style="color: var(--color-accent);">${{ formatNumber(liquidationPreview.businessPartnerEarning) }}</strong>
              </p>
              <p>🏪 Total para <strong>AS Accesorios</strong>:
                <strong style="color: var(--color-success);">${{ formatNumber(liquidationPreview.asEarning) }}</strong>
              </p>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label">Notas de liquidación (opcional)</label>
              <input v-model="liquidationNotes" type="text" class="form-input"
                @input="liquidationNotes = toUpperCase(liquidationNotes)"
                placeholder="Ej: LIQUIDACIÓN AGOSTO 2026" />
            </div>

            <button class="btn btn-primary"
              @click="confirmLiquidation"
              :disabled="saving || !liquidationPreview?.sales?.length"
              style="width: 100%; margin-top: 10px; padding: 12px;">
              <span v-if="saving">⏳ Registrando...</span>
              <span v-else>✅ Confirmar y registrar liquidación</span>
            </button>
          </div>
        </div>

        <div class="section-header" style="margin-top: 24px;">
          <h3>Historial de liquidaciones</h3>
        </div>

        <div v-if="loadingLiquidations" class="state-text">Cargando...</div>

        <table v-else-if="liquidations.length > 0">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Período</th>
              <th>Facturas</th>
              <th>Ventas</th>
              <th>G. Neta</th>
              <th>Socio ({{ selectedPartner?.commissionPercent }}%)</th>
              <th>AS</th>
              <th>Estado</th>
              <th>Notas</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in liquidations" :key="l.id">
              <td>{{ formatDate(l.date || l.createdAt) }}</td>
              <td style="font-size: 11px;">
                {{ formatDate(l.periodFrom) }} —<br>{{ formatDate(l.periodTo) }}
              </td>
              <td style="text-align: center;">{{ l.detailCount || '-' }}</td>
              <td>${{ formatNumber(l.totalRevenue) }}</td>
              <td>${{ formatNumber(l.netProfit) }}</td>
              <td style="color: var(--color-accent); font-weight: 600;">
                ${{ formatNumber(l.businessPartnerEarning) }}
              </td>
              <td style="color: var(--color-success); font-weight: 600;">
                ${{ formatNumber(l.asEarning) }}
              </td>
              <td>
                <span :class="['badge', l.status === 'Confirmed' ? 'badge-success' : 'badge-warning']">
                  {{ l.status === 'Confirmed' ? 'Confirmada' : 'Borrador' }}
                </span>
              </td>
              <td>
                <span
                  v-if="l.notes"
                  :title="l.notes"
                  style="cursor: help; font-size: 12px;"
                >
                  📝
                </span>
                <span v-else style="color: var(--color-text-muted);">-</span>
              </td>
              <td>
                <button class="btn-icon" @click.stop="downloadLiquidationPdf(l.id)" title="📄 PDF">
                  📄
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="state-text">Sin liquidaciones registradas.</p>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Cerrar</button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber as utilFormatNumber, formatDate as utilFormatDate } from '@/utils/format'

// ✅ Re-exportar las funciones para asegurar que estén disponibles en el template
const formatNumber = utilFormatNumber
const formatDate = utilFormatDate

const toast = useToastStore()

const partners = ref([])
const loading = ref(true)
const saving = ref(false)
const selectedPartner = ref(null)
const editingPartner = ref(null)
const newCommission = ref(50)
const liquidations = ref([])
const loadingLiquidations = ref(false)
const liquidationPreview = ref(null)
const loadingPreview = ref(false)
const liquidationFrom = ref('')
const liquidationTo = ref('')
const liquidationNotes = ref('')

const showModal = ref(false)
const showCommissionModal = ref(false)
const showDetailModal = ref(false)

const form = ref({
  name: '',
  documentNumber: '',
  phone: '',
  email: '',
  address: '',
  commissionPercent: 50
})

async function loadPartners() {
  try {
    loading.value = true
    const res = await api.get('/BusinessPartner', { params: { pageSize: 100 } })
    partners.value = res.data.data?.data || res.data.data || []
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingPartner.value = null
  form.value = {
    name: '',
    documentNumber: '',
    phone: '',
    email: '',
    address: '',
    commissionPercent: 50
  }
  showModal.value = true
}

function openEditModal(partner) {
  editingPartner.value = partner
  form.value = {
    name: partner.name,
    documentNumber: partner.documentNumber || '',
    phone: partner.phone || '',
    email: partner.email || '',
    address: partner.address || '',
    commissionPercent: partner.commissionPercent
  }
  showModal.value = true
}

async function savePartner() {
  if (!form.value.name.trim()) {
    toast.show('El nombre es obligatorio', 'warning')
    return
  }

  if (!form.value.documentNumber.trim()) {
    toast.show('El documento es obligatorio', 'warning')
    return
  }

  try {
    saving.value = true

    // Construir payload según especificación del backend
    const payload = {
      name: form.value.name,
      documentNumber: form.value.documentNumber,
      email: form.value.email || null,
      phone: form.value.phone || null,
      address: form.value.address || null,
      commissionPercent: form.value.commissionPercent
    }

    if (editingPartner.value) {
      await api.put(`/BusinessPartner/${editingPartner.value.id}`, payload)
      toast.show('Socio actualizado correctamente', 'success')
    } else {
      await api.post('/BusinessPartner', payload)
      toast.show('Socio creado correctamente', 'success')
    }
    showModal.value = false
    await loadPartners()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al guardar', 'error')
  } finally {
    saving.value = false
  }
}

function openCommissionModal(partner) {
  selectedPartner.value = partner
  newCommission.value = partner.commissionPercent
  showCommissionModal.value = true
}

async function saveCommission() {
  try {
    saving.value = true
    await api.patch(`/BusinessPartner/${selectedPartner.value.id}/commission`, { commissionPercent: newCommission.value })
    toast.show('Comisión actualizada', 'success')
    showCommissionModal.value = false
    await loadPartners()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al actualizar comisión', 'error')
  } finally {
    saving.value = false
  }
}

async function openDetailModal(partner) {
  console.log('🔍 ABRIENDO DETALLE DE SOCIA:', partner.name)

  selectedPartner.value = partner
  liquidationPreview.value = null
  liquidationNotes.value = ''

  const now = new Date()
  liquidationFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  liquidationTo.value = now.toISOString().split('T')[0]

  showDetailModal.value = true
  console.log('✅ showDetailModal =', showDetailModal.value)

  loadingLiquidations.value = true

  try {
    const res = await api.get(`/BusinessPartner/${partner.id}/liquidations`, {
      params: { pageNumber: 1, pageSize: 20 }
    })

    console.log('📦 Liquidaciones recibidas:', res.data.data)

    // ✅ TRANSFORMAR: Mapear propiedades del backend al formato que espera el frontend
    const rawLiquidations = res.data.data?.data || []
    liquidations.value = rawLiquidations.map(liq => {
      // Calcular totales desde details si existen
      let totalRevenue = 0
      let totalCost = 0
      let grossProfit = 0
      let partnerCommissionAmount = 0
      let businessPartnerEarning = 0
      let asEarning = 0

      if (liq.details && liq.details.length > 0) {
        liq.details.forEach(d => {
          totalRevenue += (d.salePrice || 0) * (d.quantity || 0)
          totalCost += (d.costPrice || 0) * (d.quantity || 0)
          grossProfit += d.grossProfit || 0
          partnerCommissionAmount += d.partnerCommissionAmount || 0
          businessPartnerEarning += d.businessPartnerAmount || 0
          asEarning += d.asAmount || 0
        })
      }

      return {
        id: liq.id,
        liquidationNumber: liq.liquidationNumber,
        date: liq.liquidationDate,
        createdAt: liq.createdAt,
        periodFrom: liq.fromDate,
        periodTo: liq.toDate,
        detailCount: liq.totalSales,
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        grossProfit: grossProfit,
        netProfit: grossProfit - partnerCommissionAmount,
        businessPartnerEarning: businessPartnerEarning,
        asEarning: asEarning,
        status: liq.isActive ? 'Confirmed' : 'Draft',
        notes: liq.notes
      }
    })
  } catch (err) {
    console.error('❌ Error cargando liquidaciones:', err)
  } finally {
    loadingLiquidations.value = false
  }
}

async function previewLiquidation() {
  if (!liquidationFrom.value || !liquidationTo.value) {
    toast.show('Selecciona el período', 'warning')
    return
  }

  try {
    loadingPreview.value = true

    const res = await api.get(`/BusinessPartner/${selectedPartner.value.id}/liquidation/preview`, {
      params: {
        from: liquidationFrom.value,
        to: liquidationTo.value + 'T23:59:59'
      }
    })

    // ✅ TRANSFORMACIÓN: Agrupar líneas de venta por factura y mapear propiedades
    const rawData = res.data.data

    if (rawData.sales && rawData.sales.length > 0) {
      // Agrupar por saleNumber (factura)
      const salesByInvoice = {}

      rawData.sales.forEach(line => {
        const invoiceNum = line.saleNumber

        if (!salesByInvoice[invoiceNum]) {
          salesByInvoice[invoiceNum] = {
            saleId: line.saleId,
            saleNumber: line.saleNumber,
            saleDate: line.saleDate,
            sellerName: line.sellerName,
            paymentMethodName: line.paymentMethodName,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            partnerCommissionAmount: 0,
            businessPartnerEarning: 0,
            asEarning: 0
          }
        }

        // Sumar los valores de cada línea
        salesByInvoice[invoiceNum].revenue += (line.salePrice || 0) * (line.quantity || 0)
        salesByInvoice[invoiceNum].cost += (line.costPrice || 0) * (line.quantity || 0)
        salesByInvoice[invoiceNum].grossProfit += line.grossProfit || 0
        salesByInvoice[invoiceNum].partnerCommissionAmount += line.partnerCommissionAmount || 0
        salesByInvoice[invoiceNum].businessPartnerEarning += line.businessPartnerAmount || 0
        salesByInvoice[invoiceNum].asEarning += line.asAmount || 0
      })

      // Convertir objeto a array
      const aggregatedSales = Object.values(salesByInvoice)

      // Calcular netProfit (grossProfit - partnerCommissionAmount)
      aggregatedSales.forEach(sale => {
        sale.netProfit = sale.grossProfit - sale.partnerCommissionAmount
      })

      // ✅ RECALCULAR TOTALES AGREGADOS desde las facturas agrupadas
      const totals = aggregatedSales.reduce((acc, sale) => {
        acc.totalRevenue += sale.revenue
        acc.totalCost += sale.cost
        acc.grossProfit += sale.grossProfit
        acc.partnerSalesDiscount += sale.partnerCommissionAmount
        acc.netProfit += sale.netProfit
        acc.businessPartnerEarning += sale.businessPartnerEarning
        acc.asEarning += sale.asEarning
        return acc
      }, {
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        partnerSalesDiscount: 0,
        netProfit: 0,
        businessPartnerEarning: 0,
        asEarning: 0
      })

      // Reemplazar sales y totales con datos agregados
      liquidationPreview.value = {
        ...rawData,
        sales: aggregatedSales,
        totalRevenue: totals.totalRevenue,
        totalCost: totals.totalCost,
        grossProfit: totals.grossProfit,
        partnerSalesDiscount: totals.partnerSalesDiscount,
        netProfit: totals.netProfit,
        businessPartnerEarning: totals.businessPartnerEarning,
        asEarning: totals.asEarning
      }
    } else {
      liquidationPreview.value = rawData
    }
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al calcular', 'error')
  } finally {
    loadingPreview.value = false
  }
}

async function confirmLiquidation() {
  try {
    saving.value = true

    const payload = {
      from: liquidationFrom.value,
      fromDate: liquidationFrom.value,
      to: liquidationTo.value + 'T23:59:59',
      toDate: liquidationTo.value + 'T23:59:59',
      notes: liquidationNotes.value || null
    }

    await api.post(`/BusinessPartner/${selectedPartner.value.id}/liquidation/confirm`, payload)

    toast.show('✅ Liquidación confirmada y registrada correctamente', 'success')
    liquidationPreview.value = null
    liquidationNotes.value = ''

    // Recargar historial
    loadingLiquidations.value = true
    const liqRes = await api.get(`/BusinessPartner/${selectedPartner.value.id}/liquidations`, {
      params: { pageNumber: 1, pageSize: 20 }
    })

    // ✅ TRANSFORMAR: Mapear propiedades del backend al formato que espera el frontend
    const rawLiquidations = liqRes.data.data?.data || []
    liquidations.value = rawLiquidations.map(liq => {
      // Calcular totales desde details si existen
      let totalRevenue = 0
      let totalCost = 0
      let grossProfit = 0
      let partnerCommissionAmount = 0
      let businessPartnerEarning = 0
      let asEarning = 0

      if (liq.details && liq.details.length > 0) {
        liq.details.forEach(d => {
          totalRevenue += (d.salePrice || 0) * (d.quantity || 0)
          totalCost += (d.costPrice || 0) * (d.quantity || 0)
          grossProfit += d.grossProfit || 0
          partnerCommissionAmount += d.partnerCommissionAmount || 0
          businessPartnerEarning += d.businessPartnerAmount || 0
          asEarning += d.asAmount || 0
        })
      }

      return {
        id: liq.id,
        liquidationNumber: liq.liquidationNumber,
        date: liq.liquidationDate,
        createdAt: liq.createdAt,
        periodFrom: liq.fromDate,
        periodTo: liq.toDate,
        detailCount: liq.totalSales,
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        grossProfit: grossProfit,
        netProfit: grossProfit - partnerCommissionAmount,
        businessPartnerEarning: businessPartnerEarning,
        asEarning: asEarning,
        status: liq.isActive ? 'Confirmed' : 'Draft',
        notes: liq.notes
      }
    })

    // Actualizar lista de socios (puede cambiar productCount)
    await loadPartners()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al confirmar liquidación', 'error')
  } finally {
    saving.value = false
    loadingLiquidations.value = false
  }
}

async function downloadLiquidationPdf(liquidationId) {
  try {
    const res = await api.get(`/BusinessPartner/liquidations/${liquidationId}/pdf`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    toast.show('PDF generado correctamente', 'success')
  } catch {
    toast.show('Error al generar el PDF', 'error')
  }
}

onMounted(loadPartners)
</script>

<style scoped>
.business-partners-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.page-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.state-text {
  text-align: center;
  padding: 30px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.hint-text {
  font-size: 12px;
  color: var(--color-accent);
  margin-top: 4px;
}

.partner-info-bar {
  display: flex;
  gap: 20px;
  padding: 10px 14px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 13px;
}

.section-header {
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.liquidation-period-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}

.liquidation-preview {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px;
  background: var(--color-bg);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.preview-card {
  background: var(--color-white);
  padding: 16px 18px;
  border-radius: var(--radius-sm);
  text-align: center;
  border: 1px solid var(--color-border);
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.preview-card.success {
  border-color: var(--color-success);
  background: #F0FFF4;
}

.preview-card.warning {
  border-color: var(--color-warning);
  background: #FFF8E1;
}

.preview-card.accent {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.preview-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.preview-card strong {
  font-size: 16px;
  color: var(--color-text);
  font-weight: 700;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: var(--color-accent-light) !important;
}

.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  margin-right: 4px;
  transition: var(--transition);
  border: none;
  cursor: pointer;
}

.btn-icon:hover {
  background: var(--color-accent-light);
}

.empty-preview {
  background: #FFF8E1;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text);
}

.confirm-liquidation-box {
  background: var(--color-bg);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 16px;
}

.confirm-summary p {
  font-size: 13px;
  margin-bottom: 6px;
}
</style>
