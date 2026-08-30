<template>
  <div class="partner-sales-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Mis Ventas</h2>
        <p class="page-sub">Historial de tus ventas y comisiones</p>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="sales.length === 0" class="state-text">
        Aún no has registrado ventas.
      </div>
      <table v-else>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const sales = ref([])
const loading = ref(true)

)
}

async function loadSales() {
  try {
    loading.value = true
    const res = await api.get('/Partner/my/sales')
    sales.value = res.data.data
  } catch (err) {
    toast.show('Error al cargar las ventas', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadSales)
</script>

<style scoped>
.partner-sales-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
</style>
