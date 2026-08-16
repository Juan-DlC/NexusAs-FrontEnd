<template>
  <div class="dashboard">
    <!-- Botones de Acción -->
    <div class="action-buttons-grid">
      <div class="action-card" @click="$router.push('/ventas')">
        <div class="action-icon">🧾</div>
        <div class="action-info">
          <span class="action-title">Nueva venta</span>
          <span class="action-sub">Registrar venta al cliente</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
      
      <div class="action-card action-card-addi" @click="openAddiLink">
        <div class="action-icon">💳</div>
        <div class="action-info">
          <span class="action-title">Venta con Addi</span>
          <span class="action-sub">Financiamiento externo</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
    </div>

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
                <span class="badge" :class="sale.paymentMethodName === 'Contado' || sale.paymentMethodName === 'CONTADO' ? 'badge-success' : 'badge-warning'">
                  {{ sale.paymentMethodName || 'N/A' }}
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
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()
const loading = ref(true)
const summary = ref(null)
const recentSales = ref([])
const lowStock = ref([])

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function openAddiLink() {
  const addiUrl = 'https://addi.com' // TODO: configurar URL real
  window.open(addiUrl, '_blank')
}

const stats = computed(() => {
  if (!summary.value) return []
  return [
    {
      label: 'Ventas hoy',
      value: `$${formatNumber(summary.value.todaySalesAmount || 0)}`,
      sub: `${summary.value.todaySalesCount || 0} transacciones`,
      icon: '◆',
      color: 'var(--color-text)',
      subColor: 'var(--color-text-muted)'
    },
    {
      label: 'Productos activos',
      value: summary.value.activeProducts || 0,
      sub: 'En catálogo',
      icon: '◉',
      color: 'var(--color-accent)',
      subColor: 'var(--color-text-muted)'
    },
    {
      label: 'Créditos pendientes',
      value: `$${formatNumber(summary.value.pendingCreditsAmount || 0)}`,
      sub: `${summary.value.pendingCreditsCount || 0} deudores`,
      icon: '◇',
      color: summary.value.pendingCreditsCount > 0 ? 'var(--color-danger)' : 'var(--color-text)',
      subColor: 'var(--color-danger)'
    },
    {
      label: 'Stock bajo',
      value: summary.value.lowStockCount || 0,
      sub: summary.value.lowStockCount > 0 ? 'Requieren atención' : 'Todo en orden ✓',
      icon: '◰',
      color: summary.value.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
      subColor: summary.value.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'
    }
  ]
})

async function loadSummary() {
  try {
    const res = await api.get('/Dashboard/summary')
    summary.value = res.data.data
  } catch (err) {
    console.error('Error cargando summary:', err)
    // Fallback a endpoint anterior si el nuevo no existe
    try {
      const dashRes = await api.get('/Dashboard')
      summary.value = {
        todaySalesAmount: dashRes.data.data.todaySales,
        todaySalesCount: dashRes.data.data.todayTransactions,
        activeProducts: 0,
        pendingCreditsAmount: dashRes.data.data.pendingCreditsAmount,
        pendingCreditsCount: dashRes.data.data.pendingCredits,
        lowStockCount: 0
      }
    } catch {
      // Silenciar error si tampoco existe el anterior
    }
  }
}

async function loadDashboard() {
  try {
    loading.value = true
    await loadSummary()
    
    const [salesRes, stockRes] = await Promise.all([
      api.get('/Sale', { params: { pageSize: 5 } }),
      api.get('/Product/low-stock')
    ])
    
    recentSales.value = (salesRes.data.data?.data || []).slice(0, 5)
    lowStock.value = stockRes.data.data || []
    
    // Actualizar lowStockCount si no vino del summary
    if (summary.value) {
      summary.value.lowStockCount = lowStock.value.length
    }
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

.action-buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-white);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: var(--transition);
}

.action-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-card-addi {
  border-color: #4CAF50;
}

.action-card-addi:hover {
  border-color: #388E3C;
  background: #E8F5E9;
}

.action-icon {
  font-size: 28px;
}

.action-info {
  flex: 1;
}

.action-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.action-sub {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.action-arrow {
  font-size: 18px;
  color: var(--color-text-muted);
}

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
