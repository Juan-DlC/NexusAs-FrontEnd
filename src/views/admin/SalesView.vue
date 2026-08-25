<template>
  <div class="sales-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Ventas</h2>
        <p class="page-sub">{{ totalRecords }} ventas registradas</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="showFormModal = true">
        + Nueva venta
      </button>
    </div>

    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        class="form-input search-input"
        placeholder="Buscar por factura o cliente..."
        @input="onSearchInput"
      />
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="sales.length === 0" class="state-text">
        No hay ventas registradas.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente/Socia</th>
            <th>Fecha</th>
            <th>Método</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Recibo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sales" :key="s.id" class="clickable-row" @click="openDetail(s)">
            <td><strong>{{ s.saleNumber }}</strong></td>
            <td>{{ s.partnerUserId ? 'Venta a socia' : (s.customerId ? s.customerName : 'Sin cliente') }}</td>
            <td>{{ formatDate(s.date) }}</td>
            <td>
              <span :class="['badge', s.paymentMethodName === 'Contado' ? 'badge-success' : 'badge-warning']">
                {{ s.paymentMethodName || 'Contado' }}
              </span>
            </td>
            <td>${{ formatNumber(s.total) }}</td>
            <td>
              <span v-if="s.status === 'FullReturn'" class="badge badge-danger">Devuelta</span>
              <span v-else-if="s.status === 'PartialReturn'" class="badge badge-warning">Dev. parcial</span>
            </td>
            <td>
              <button class="btn-icon" @click.stop="downloadReceipt(s.id)" title="📄 Ver recibo">
                📄
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages > 1">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="!hasPreviousPage"
          @click="changePage(pageNumber - 1)"
        >
          ← Anterior
        </button>
        <span class="page-info">Página {{ pageNumber }} de {{ totalPages }}</span>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="!hasNextPage"
          @click="changePage(pageNumber + 1)"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <SaleFormModal
      v-model="showFormModal"
      :customers="customers"
      :payment-methods="paymentMethods"
      @sale-created="onSaleCreated"
    />

    <SaleDetailModal
      v-model="showDetailModal"
      :sale="selectedSale"
      @return-opened="loadSales"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import SaleFormModal from '@/components/sales/SaleFormModal.vue'
import SaleDetailModal from '@/components/sales/SaleDetailModal.vue'

const toast = useToastStore()

const sales = ref([])
const customers = ref([])
const paymentMethods = ref([])
const loading = ref(true)
const search = ref('')
const selectedSale = ref(null)
const showFormModal = ref(false)
const showDetailModal = ref(false)

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

async function loadSales() {
  try {
    loading.value = true
    const res = await api.get('/Sale', {
      params: {
        pageNumber: pageNumber.value,
        pageSize: pageSize.value,
        search: search.value || undefined
      }
    })
    const data = res.data.data
    sales.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch (err) {
    toast.show('Error cargando ventas', 'error')
  } finally {
    loading.value = false
  }
}

async function loadCustomers() {
  try {
    const res = await api.get('/Customer', { params: { pageSize: 200 } })
    customers.value = res.data.data?.data || []
  } catch {
    customers.value = []
  }
}

async function loadPaymentMethods() {
  try {
    const res = await api.get('/PaymentMethod')
    paymentMethods.value = res.data.data || []
  } catch {
    paymentMethods.value = []
  }
}

async function openDetail(sale) {
  try {
    const [saleRes, returnsRes] = await Promise.all([
      api.get(`/Sale/${sale.id}`),
      api.get(`/Return/by-sale/${sale.id}`).catch(() => ({ data: { data: [] } }))
    ])
    selectedSale.value = {
      ...saleRes.data.data,
      returns: returnsRes.data.data || []
    }
    showDetailModal.value = true
  } catch {
    toast.show('Error al cargar el detalle de la venta', 'error')
  }
}

async function downloadReceipt(saleId) {
  try {
    const res = await api.get(`/Sale/${saleId}/receipt`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
  } catch {
    toast.show('Error al generar el recibo', 'error')
  }
}

async function onSaleCreated() {
  showFormModal.value = false
  await loadSales()
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadSales()
  }, 400)
}

function changePage(page) {
  pageNumber.value = page
  loadSales()
}

onMounted(() => {
  loadSales()
  loadCustomers()
  loadPaymentMethods()
})
</script>

<style scoped>
.sales-view {
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

.search-bar {
  display: flex;
}

.search-input {
  max-width: 320px;
}

.state-text {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
}

.page-info {
  font-size: 12px;
  color: var(--color-text-muted);
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
  transition: var(--transition);
}

.btn-icon:hover {
  background: var(--color-accent-light);
}
</style>
