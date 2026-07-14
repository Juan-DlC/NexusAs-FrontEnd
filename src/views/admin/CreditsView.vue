<template>
  <div class="credits-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Créditos</h2>
        <p class="page-sub">{{ totalRecords }} créditos registrados</p>
      </div>
      <select v-model="statusFilter" class="form-input filter-select" @change="onFilterChange">
        <option value="">Todos los estados</option>
        <option value="Pending">Pendientes</option>
        <option value="Partial">Pago parcial</option>
        <option value="Paid">Pagados</option>
      </select>
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
      <div v-else-if="credits.length === 0" class="state-text">
        No hay créditos con este filtro.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Abonado</th>
            <th>Pendiente</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in credits" :key="c.id" class="clickable-row" @click="openDetailModal(c)">
            <td><strong>{{ c.saleNumber }}</strong></td>
            <td>{{ c.customerName }}</td>
            <td>${{ formatNumber(c.totalAmount) }}</td>
            <td style="color: var(--color-success)">${{ formatNumber(c.paidAmount) }}</td>
            <td style="color: var(--color-danger); font-weight: 600;">
              ${{ formatNumber(c.pendingAmount) }}
            </td>
            <td>
              <span :class="['badge', statusBadge(c.status)]">
                {{ statusLabel(c.status) }}
              </span>
            </td>
            <td>
              <button
                v-if="c.status !== 'Paid'"
                class="btn btn-secondary btn-sm"
                @click.stop="openPaymentModal(c)"
              >
                Registrar abono
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages > 1">
        <button class="btn btn-secondary btn-sm" :disabled="!hasPreviousPage" @click="changePage(pageNumber - 1)">
          ← Anterior
        </button>
        <span class="page-info">Página {{ pageNumber }} de {{ totalPages }}</span>
        <button class="btn btn-secondary btn-sm" :disabled="!hasNextPage" @click="changePage(pageNumber + 1)">
          Siguiente →
        </button>
      </div>
    </div>

    <ModalBase v-model="showModal" title="Registrar abono">
      <div v-if="selectedCredit">
        <div class="credit-summary">
          <p><strong>Cliente:</strong> {{ selectedCredit.customerName }}</p>
          <p><strong>Factura:</strong> {{ selectedCredit.saleNumber }}</p>
          <p><strong>Saldo pendiente:</strong>
            <span style="color: var(--color-danger); font-weight: 700;">
              ${{ formatNumber(selectedCredit.pendingAmount) }}
            </span>
          </p>
        </div>

        <form @submit.prevent="savePayment">
          <div class="form-group">
            <label class="form-label">Monto a abonar</label>
            <CurrencyInput v-model="paymentForm.amount" />
          </div>
          <div class="form-group">
            <label class="form-label">Notas (opcional)</label>
            <input v-model="paymentForm.notes" type="text" class="form-input" @input="paymentForm.notes = toUpperCase(paymentForm.notes)" />
          </div>
        </form>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="savePayment" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Registrar abono' }}
        </button>
      </template>
    </ModalBase>
    <ModalBase v-model="showDetailModal" title="Detalle del crédito" width="560px">
      <div v-if="creditDetail">
        <div class="detail-summary">
          <p><strong>Factura:</strong> {{ creditDetail.saleNumber }}</p>
          <p><strong>Cliente:</strong> {{ creditDetail.customerName }}</p>
          <p><strong>Total:</strong> ${{ formatNumber(creditDetail.totalAmount) }}</p>
          <p style="color: var(--color-success)">
            <strong>Abonado:</strong> ${{ formatNumber(creditDetail.paidAmount) }}
          </p>
          <p style="color: var(--color-danger)">
            <strong>Pendiente:</strong> ${{ formatNumber(creditDetail.pendingAmount) }}
          </p>
        </div>

        <div class="divider-label">Productos comprados</div>
        <table>
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in creditDetail.products" :key="i">
              <td>{{ p.productName }}</td>
              <td>{{ p.quantity }}</td>
              <td>${{ formatNumber(p.unitPrice) }}</td>
              <td>${{ formatNumber(p.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="creditDetail.numberOfInstallments > 1" style="margin-top: 14px;">
          <div class="divider-label">Cuotas ({{ creditDetail.numberOfInstallments }})</div>
          <div class="installment-item" v-for="i in creditDetail.installments" :key="i.number">
            <span>Cuota {{ i.number }}</span>
            <span>${{ formatNumber(i.amount) }}</span>
            <span :class="['badge', i.isPaid ? 'badge-success' : 'badge-warning']">
              {{ i.isPaid ? 'Pagada' : 'Pendiente' }}
            </span>
          </div>
        </div>

        <div v-if="creditDetail.payments.length > 0" style="margin-top: 14px;">
          <div class="divider-label">Historial de abonos</div>
          <div class="payment-item" v-for="(p, i) in creditDetail.payments" :key="i">
            <div class="payment-row">
              <span><strong>${{ formatNumber(p.amount) }}</strong></span>
              <span class="payment-date">{{ formatDate(p.date) }}</span>
            </div>
            <p class="payment-notes" v-if="p.notes">📝 {{ p.notes }}</p>
            <p class="payment-user">Registrado por: {{ p.userName }}</p>
          </div>
        </div>
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
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { toUpperCase } from '@/utils/textFormat'
const showDetailModal = ref(false)
const creditDetail = ref(null)

const credits = ref([])
const loading = ref(true)
const saving = ref(false)
const statusFilter = ref('')
const search = ref('')
const showModal = ref(false)
const selectedCredit = ref(null)
const paymentForm = ref({ amount: 0, notes: '' })

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function statusLabel(status) {
  const map = { Pending: 'Pendiente', Partial: 'Pago parcial', Paid: 'Pagado' }
  return map[status] || status
}

function statusBadge(status) {
  const map = { Pending: 'badge-danger', Partial: 'badge-warning', Paid: 'badge-success' }
  return map[status] || ''
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function openDetailModal(credit) {
  try {
    const res = await api.get(`/Credit/${credit.id}/details`)
    creditDetail.value = res.data.data
    showDetailModal.value = true
  } catch (err) {
    console.error('Error al cargar el detalle del crédito.', err)
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadCredits()
  }, 400)
}

function onFilterChange() {
  pageNumber.value = 1
  loadCredits()
}

function changePage(page) {
  pageNumber.value = page
  loadCredits()
}

async function loadCredits() {
  try {
    loading.value = true
    const res = await api.get('/Credit', {
      params: {
        status: statusFilter.value || undefined,
        search: search.value || undefined,
        pageNumber: pageNumber.value,
        pageSize: pageSize.value
      }
    })
    const data = res.data.data
    credits.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch (err) {
    console.error('Error cargando créditos:', err)
  } finally {
    loading.value = false
  }
}

function openPaymentModal(credit) {
  selectedCredit.value = credit
  paymentForm.value = { amount: 0, notes: '' }
  showModal.value = true
}

async function savePayment() {
  try {
    saving.value = true
    await api.post(`/Credit/${selectedCredit.value.id}/payment`, paymentForm.value)
    showModal.value = false
    loadCredits()
  } catch (err) {
    alert(err.response?.data?.message || 'Error al registrar el abono.')
  } finally {
    saving.value = false
  }
}

onMounted(loadCredits)
</script>

<style scoped>
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: var(--color-accent-light) !important; }

.divider-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 16px 0 10px;
}

.installment-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.payment-item {
  background: var(--color-bg);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.payment-date { color: var(--color-text-muted); }
.payment-notes { font-size: 12px; color: var(--color-text); margin-top: 4px; }
.payment-user { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.credits-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.filter-select { max-width: 200px; }
.search-bar { display: flex; }
.search-input { max-width: 320px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
}
.page-info { font-size: 12px; color: var(--color-text-muted); }

.credit-summary {
  background: var(--color-bg);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}
.credit-summary p { font-size: 13px; margin-bottom: 4px; }
.credit-summary p:last-child { margin-bottom: 0; }
</style>
