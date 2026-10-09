<template>
  <div class="partner-sales-view">
    <div class="page-header-row">
      <div>
        <p class="page-sub">Historial de tus ventas y comisiones</p>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="sales.length === 0" class="state-text">
        Aún no has registrado ventas.
      </div>
      <div v-else>
        <table>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio AS</th>
              <th>Vendiste a</th>
              <th>Tu ganancia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sales" :key="s.id">
              <td><strong>{{ s.saleNumber }}</strong></td>
              <td>{{ formatDate(s.date) }}</td>
              <td>
                {{ s.productName }}
                <span v-if="s.isPartnership" class="badge badge-pink" style="margin-left: 4px;">
                  Alianza
                </span>
              </td>
              <td>{{ s.quantity }}</td>
              <td>${{ formatNumber(s.partnerPrice) }}</td>
              <td>${{ formatNumber(s.salePrice) }}</td>
              <td style="color: var(--color-success); font-weight: 600;">
                ${{ formatNumber(s.partnerEarning) }}
              </td>
            </tr>
          </tbody>
        </table>

        <PaginationControls
          v-if="pagination.totalPages > 1"
          :current-page="pagination.pageNumber"
          :total-pages="pagination.totalPages"
          :has-next-page="pagination.hasNextPage"
          :has-previous-page="pagination.hasPreviousPage"
          @change-page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import { formatNumber, formatDate } from '@/utils/format'
import PaginationControls from '@/components/shared/PaginationControls.vue'

const toast = useToastStore()
const sales = ref([])
const loading = ref(true)
const pagination = ref({
  pageNumber: 1,
  pageSize: 20,
  totalPages: 1,
  totalCount: 0,
  hasNextPage: false,
  hasPreviousPage: false
})

async function loadSales(pageNumber = 1) {
  try {
    loading.value = true
    const res = await api.get('/Partner/my/sales', {
      params: {
        pageNumber,
        pageSize: pagination.value.pageSize
      }
    })
    
    // Si la respuesta incluye datos de paginación
    if (res.data.data?.data) {
      sales.value = res.data.data.data
      pagination.value = {
        pageNumber: res.data.data.pageNumber || 1,
        pageSize: res.data.data.pageSize || 20,
        totalPages: res.data.data.totalPages || 1,
        totalCount: res.data.data.totalCount || 0,
        hasNextPage: res.data.data.hasNextPage || false,
        hasPreviousPage: res.data.data.hasPreviousPage || false
      }
    } else {
      // Si no hay paginación en la respuesta, usar los datos directamente
      sales.value = res.data.data || []
    }
  } catch {
    toast.show('Error al cargar las ventas', 'error')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page) {
  loadSales(page)
}

onMounted(() => loadSales())
</script>

<style scoped>
.partner-sales-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
</style>
