<template>
  <div class="dashboard">
    <!-- Botones de Acción -->
    <div class="action-buttons-grid">
      <div class="action-card" @click="openSaleModal">
        <div class="action-icon">💰</div>
        <div class="action-info">
          <span class="action-title">Nueva venta</span>
          <span class="action-sub">Registrar venta al cliente</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
      
      <div class="action-card action-card-addi" @click="openAddiLink">
        <div class="action-icon">🏦</div>
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
              <td>{{ sale.customerId ? (sale.customerName || 'Sin cliente') : 'Sin cliente' }}</td>
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

    <!-- Modal Nueva Venta -->
    <SaleFormModal
      v-model="showSaleModal"
      :customers="customers"
      :payment-methods="paymentMethods"
      @sale-created="handleSaleCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'
import SaleFormModal from '@/components/sales/SaleFormModal.vue'
import { useToastStore } from '@/stores/toast'
import { formatNumber } from '@/utils/format'

const toast = useToastStore()
const loading = ref(true)
const summary = ref(null)
const recentSales = ref([])
const lowStock = ref([])
const showSaleModal = ref(false)
const paymentMethods = ref([])
const customers = ref([])

function openAddiLink() {
  const addiUrl = 'https://addi.com' // TODO: configurar URL real
  window.open(addiUrl, '_blank')
}

async function openSaleModal() {
  // Cargar datos necesarios si no están cargados
  if (paymentMethods.value.length === 0) {
    try {
      const res = await api.get('/PaymentMethod')
      paymentMethods.value = res.data.data
    } catch {
      toast.show('Error cargando métodos de pago', 'error')
      return
    }
  }

  if (customers.value.length === 0) {
    try {
      const res = await api.get('/Customer', { params: { pageSize: 100 } })
      customers.value = res.data.data.data
    } catch {
      toast.show('Error cargando clientes', 'error')
      return
    }
  }

  showSaleModal.value = true
}

function handleSaleCreated() {
  showSaleModal.value = false
  loadDashboard() // Recargar dashboard para mostrar la nueva venta
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
  } catch {
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
    
    // ✅ Cargar customers primero
    await loadCustomersMap()
    
    const [salesRes, stockRes] = await Promise.all([
      api.get('/Sale', { params: { pageSize: 5 } }),
      api.get('/Product/low-stock')
    ])
    
    // ✅ Enriquecer ventas con customerName
    const rawSales = (salesRes.data.data?.data || []).slice(0, 5)
    recentSales.value = rawSales.map(sale => ({
      ...sale,
      customerName: sale.customerName || (sale.customerId ? customersMap.value[sale.customerId] : null)
    }))
    
    lowStock.value = stockRes.data.data || []
    
    // Actualizar lowStockCount si no vino del summary
    if (summary.value) {
      summary.value.lowStockCount = lowStock.value.length
    }
  } catch {
    toast.show('Error al cargar el dashboard', 'error')
  } finally {
    loading.value = false
  }
}

// ✅ Función para cargar customers
const customersMap = ref({})
async function loadCustomersMap() {
  try {
    const res = await api.get('/Customer', { params: { pageSize: 200 } })
    const customersList = res.data.data?.data || []
    const map = {}
    customersList.forEach(c => {
      map[c.id] = c.name
    })
    customersMap.value = map
  } catch {
    customersMap.value = {}
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
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.stat-card {
  position: relative;
  background: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 16px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: var(--color-accent-light);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-icon {
  font-size: 24px;
  color: var(--color-accent);
  opacity: 0.25;
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  opacity: 0.6;
  transform: scale(1.1);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.stat-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
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
