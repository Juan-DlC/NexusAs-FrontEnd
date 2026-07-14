<template>
  <div class="dashboard">
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-top">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <div class="stat-value" :style="{ color: stat.color }">
          {{ stat.value }}
        </div>
        <div class="stat-sub" :style="{ color: stat.subColor }">
          {{ stat.sub }}
        </div>
      </div>
    </div>

    <!-- Fila inferior -->
    <div class="bottom-grid">
      <!-- Últimas ventas -->
      <div class="card">
        <h3 class="card-title">Últimas ventas</h3>
        <div v-if="loading" class="loading-text">Cargando...</div>
        <div v-else-if="recentSales.length === 0" class="empty-text">
          No hay ventas registradas hoy.
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in recentSales" :key="sale.id">
              <td>{{ sale.saleNumber }}</td>
              <td>{{ sale.customerName || 'Sin cliente' }}</td>
              <td>${{ formatNumber(sale.total) }}</td>
              <td>
                <span class="badge" :class="sale.paymentMethod === 'Cash' ? 'badge-success' : 'badge-warning'">
                  {{ sale.paymentMethod === 'Cash' ? 'Contado' : 'Crédito' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Stock bajo -->
      <div class="card">
        <h3 class="card-title">⚠️ Stock bajo</h3>
        <div v-if="loading" class="loading-text">Cargando...</div>
        <div v-else-if="lowStock.length === 0" class="empty-text success-text">
          ✓ Todos los productos tienen stock suficiente.
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in lowStock" :key="product.id">
              <td>{{ product.name }}</td>
              <td style="color: var(--color-danger); font-weight: 600;">
                {{ product.stock }}
              </td>
              <td>{{ product.minStock }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'

const loading = ref(true)
const dashboard = ref(null)
const recentSales = ref([])
const lowStock = ref([])

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

const stats = computed(() => {
  if (!dashboard.value) return []
  return [
    {
      label: 'Ventas hoy',
      value: `$${formatNumber(dashboard.value.todaySales)}`,
      sub: `${dashboard.value.todayTransactions} transacciones`,
      icon: '◆',
      color: 'var(--color-text)',
      subColor: 'var(--color-text-muted)'
    },
    {
      label: 'Contado',
      value: `$${formatNumber(dashboard.value.todayCash)}`,
      sub: '✓ Cobrado',
      icon: '◉',
      color: 'var(--color-success)',
      subColor: 'var(--color-success)'
    },
    {
      label: 'Créditos pendientes',
      value: `$${formatNumber(dashboard.value.pendingCreditsAmount)}`,
      sub: `${dashboard.value.pendingCredits} deudores`,
      icon: '◇',
      color: dashboard.value.pendingCredits > 0 ? 'var(--color-danger)' : 'var(--color-text)',
      subColor: 'var(--color-danger)'
    },
    {
      label: 'Stock bajo',
      value: lowStock.value.length,
      sub: lowStock.value.length > 0 ? 'Requieren atención' : 'Todo en orden ✓',
      icon: '◰',
      color: lowStock.value.length > 0 ? 'var(--color-danger)' : 'var(--color-success)',
      subColor: lowStock.value.length > 0 ? 'var(--color-danger)' : 'var(--color-success)'
    }
  ]
})

async function loadDashboard() {
  try {
    loading.value = true
    const [dashRes, salesRes, stockRes] = await Promise.all([
      api.get('/Dashboard'),
      api.get('/Sale', { params: { pageSize: 5 } }),
      api.get('/Product/low-stock')
    ])
    dashboard.value = dashRes.data.data
    recentSales.value = (salesRes.data.data?.data || []).slice(0, 5)
    lowStock.value = stockRes.data.data || []
  } catch (err) {
    console.error('Error cargando dashboard:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.stat-icon {
  font-size: 18px;
  color: var(--color-accent);
  opacity: 0.6;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-sub {
  font-size: 12px;
  color: var(--color-text-muted);
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 14px;
}

.loading-text {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 20px 0;
  text-align: center;
}

.empty-text {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 20px 0;
  text-align: center;
}

.success-text { color: var(--color-success); }
</style>
