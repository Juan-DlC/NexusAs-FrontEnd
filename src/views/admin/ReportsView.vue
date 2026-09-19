<template>
  <div class="reports-view">
    <div class="page-header-row">
      <div>
        <p class="page-sub">Genera informes en PDF y Excel</p>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Informe de Ventas</h3>
      <p class="card-desc">Resumen ejecutivo y detalle de ventas en un período específico.</p>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Desde</label>
          <input v-model="salesFrom" type="date" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Hasta</label>
          <input v-model="salesTo" type="date" class="form-input" />
        </div>
      </div>

      <div class="actions-row">
        <button class="btn btn-primary" @click="downloadSalesPdf" :disabled="loadingSalesPdf">
          <span v-if="loadingSalesPdf">⏳ Generando...</span>
          <span v-else>📄 Ver informe PDF</span>
        </button>
        <button class="btn btn-secondary" @click="downloadSalesExcel" :disabled="loadingSalesExcel">
          <span v-if="loadingSalesExcel">⏳ Generando...</span>
          <span v-else>📊 Descargar Excel</span>
        </button>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Catálogo de Productos</h3>
      <p class="card-desc">Lista de productos con precios de venta — ideal para compartir con clientes.</p>

      <div class="form-group" style="max-width: 280px;">
        <label class="form-label">Categoría (opcional)</label>
        <select v-model="catalogCategoryId" class="form-input">
          <option value="">Todas las categorías</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div class="actions-row">
        <button class="btn btn-primary" @click="downloadCatalogPdf" :disabled="loadingCatalog">
          <span v-if="loadingCatalog">⏳ Generando...</span>
          <span v-else>📄 Ver catálogo PDF</span>
        </button>
      </div>
    </div>
    <div class="card">
  <h3 class="card-title">Reporte de Productos de Alianza</h3>
  <p class="card-desc">Stock disponible y ventas de productos en sociedad — para liquidar con tu socio externo.</p>

  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Desde</label>
      <input v-model="allianceFrom" type="date" class="form-input" />
    </div>
    <div class="form-group">
      <label class="form-label">Hasta</label>
      <input v-model="allianceTo" type="date" class="form-input" />
    </div>
  </div>

  <button class="btn btn-primary" @click="loadAllianceReport" :disabled="loadingAlliance">
    <span v-if="loadingAlliance">⏳ Cargando...</span>
    <span v-else>🔍 Consultar</span>
  </button>

  <div v-if="allianceReport" style="margin-top: 20px;">
    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">Total vendido</span>
        <strong>${{ formatNumber(allianceReport.totalSoldAmount) }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Unidades vendidas</span>
        <strong>{{ allianceReport.totalSoldUnits }}</strong>
      </div>
    </div>

    <div class="divider-label">Ventas en el período</div>
        <div v-if="allianceReport.sold.length > 0">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Factura</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Vendido por</th></tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in paginatedSoldItems" :key="i">
                <td>{{ formatDate(s.date) }}</td>
                <td>{{ s.saleNumber }}</td>
                <td>{{ s.productName }}</td>
                <td>{{ s.quantity }}</td>
                <td>${{ formatNumber(s.total) }}</td>
                <td>
                  {{ s.sellerName }}
                  <span v-if="s.soldByPartner" class="badge badge-pink" style="margin-left: 4px;">Mayorista</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mini-pagination" v-if="totalSoldPages > 1">
            <button class="btn-mini" :disabled="soldPage === 1" @click="soldPage--">←</button>
            <span class="page-text">{{ soldPage }}/{{ totalSoldPages }}</span>
            <button class="btn-mini" :disabled="soldPage === totalSoldPages" @click="soldPage++">→</button>
          </div>
        </div>
        <p v-else class="state-text">Sin ventas en este período.</p>

    <div class="divider-label">Stock disponible</div>
        <div v-if="allianceReport.stock.length > 0">
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Stock actual</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in paginatedStockItems" :key="i">
                <td>{{ s.code }}</td>
                <td>{{ s.productName }}</td>
                <td>{{ s.currentStock }}</td>
              </tr>
            </tbody>
          </table>
          <div class="mini-pagination" v-if="totalStockItemsPages > 1">
            <button class="btn-mini" :disabled="stockItemsPage === 1" @click="stockItemsPage--">←</button>
            <span class="page-text">{{ stockItemsPage }}/{{ totalStockItemsPages }}</span>
            <button class="btn-mini" :disabled="stockItemsPage === totalStockItemsPages" @click="stockItemsPage++">→</button>
          </div>
        </div>
        <p v-else class="state-text">No hay productos de alianza marcados.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import { formatNumber, formatDate } from '@/utils/format'

const toast = useToastStore()

const today = new Date().toISOString().split('T')[0]

const allianceFrom = ref(today)
const allianceTo = ref(today)
const allianceReport = ref(null)
const loadingAlliance = ref(false)

// Paginación reportes
const soldPage = ref(1)
const stockItemsPage = ref(1)
const reportPageSize = 10

const paginatedSoldItems = computed(() => {
  if (!allianceReport.value?.sold) return []
  const start = (soldPage.value - 1) * reportPageSize
  const end = start + reportPageSize
  return allianceReport.value.sold.slice(start, end)
})

const paginatedStockItems = computed(() => {
  if (!allianceReport.value?.stock) return []
  const start = (stockItemsPage.value - 1) * reportPageSize
  const end = start + reportPageSize
  return allianceReport.value.stock.slice(start, end)
})

const totalSoldPages = computed(() => {
  if (!allianceReport.value?.sold) return 0
  return Math.ceil(allianceReport.value.sold.length / reportPageSize)
})

const totalStockItemsPages = computed(() => {
  if (!allianceReport.value?.stock) return 0
  return Math.ceil(allianceReport.value.stock.length / reportPageSize)
})

const categories = ref([])
const catalogCategoryId = ref('')

const salesFrom = ref(today)
const salesTo = ref(today)

const loadingSalesPdf = ref(false)
const loadingSalesExcel = ref(false)
const loadingCatalog = ref(false)

async function loadAllianceReport() {
  try {
    loadingAlliance.value = true
    const res = await api.get('/Partner/alliance-report', {
      params: {
        from: `${allianceFrom.value}T00:00:00`,
        to: `${allianceTo.value}T23:59:59`
      }
    })
    allianceReport.value = res.data.data
  } catch {
    toast.show('Error al cargar el reporte de alianza', 'error')
  } finally {
    loadingAlliance.value = false
  }
}

async function loadCategories() {
  const res = await api.get('/Category', { params: { pageSize: 100 } })
  categories.value = res.data.data.data
}

function openPdfInNewTab(data) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  window.open(url, '_blank')
}

function downloadFile(data, filename, mimeType) {
  const url = window.URL.createObjectURL(new Blob([data], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}

async function downloadSalesPdf() {
  try {
    loadingSalesPdf.value = true
    const res = await api.get('/Report/sales/pdf', {
      params: {
        from: `${salesFrom.value}T00:00:00`,
        to: `${salesTo.value}T23:59:59`
      },
      responseType: 'blob'
    })
    openPdfInNewTab(res.data)
  } catch {
    toast.show('Error al generar el informe', 'error')
  } finally {
    loadingSalesPdf.value = false
  }
}

async function downloadSalesExcel() {
  try {
    loadingSalesExcel.value = true
    const res = await api.get('/Report/sales/excel', {
      params: {
        from: `${salesFrom.value}T00:00:00`,
        to: `${salesTo.value}T23:59:59`
      },
      responseType: 'blob'
    })
    downloadFile(
      res.data,
      `Informe_Ventas_${salesFrom.value}_${salesTo.value}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  } catch {
    toast.show('Error al generar el Excel', 'error')
  } finally {
    loadingSalesExcel.value = false
  }
}

async function downloadCatalogPdf() {
  try {
    loadingCatalog.value = true
    const res = await api.get('/Report/catalog/pdf', {
      params: catalogCategoryId.value ? { categoryId: catalogCategoryId.value } : {},
      responseType: 'blob'
    })
    openPdfInNewTab(res.data)
  } catch {
    toast.show('Error al generar el catálogo', 'error')
  } finally {
    loadingCatalog.value = false
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
.summary-card { background: var(--color-bg); padding: 12px; border-radius: var(--radius-sm); text-align: center; }
.summary-label { display: block; font-size: 11px; color: var(--color-text-muted); margin-bottom: 4px; }
.summary-card strong { font-size: 15px; color: var(--color-text); }
.divider-label { font-size: 12px; font-weight: 600; color: var(--color-accent); text-transform: uppercase; margin: 16px 0 10px; }
.state-text { text-align: center; padding: 20px 0; color: var(--color-text-muted); font-size: 13px; }
.reports-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.card-title { font-size: 15px; font-weight: 600; color: var(--color-text); margin-bottom: 4px; }
.card-desc { font-size: 12px; color: var(--color-text-muted); margin-bottom: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 400px; }
.actions-row { display: flex; gap: 10px; margin-top: 12px; }
</style>

.mini-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 4px;
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
}

.btn-mini {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: var(--transition);
}

.btn-mini:hover:not(:disabled) {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
}

.btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-text {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 40px;
  text-align: center;
}
