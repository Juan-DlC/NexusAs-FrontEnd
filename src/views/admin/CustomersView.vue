<template>
  <div class="customers-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Clientes</h2>
        <p class="page-sub">{{ totalRecords }} clientes registrados</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="openCreateModal" v-if="auth.isAdmin">
        + Nuevo cliente
      </button>
    </div>

    <div class="search-bar">
      <div class="search-input-wrapper">
        <input
          v-model="search"
          type="text"
          class="form-input search-input"
          placeholder="Buscar por nombre o documento..."
          @input="onSearchInput"
        />
        <span v-if="searching" class="search-spinner" title="Buscando...">🔍</span>
      </div>
    </div>

    <div class="card">
      <!-- Skeleton Loader mientras carga -->
      <SkeletonLoader v-if="loading" type="table" :rows="8" :columns="6" />

      <div v-else-if="customers.length === 0" class="state-text">
        No se encontraron clientes.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Notas</th>
            <th v-if="auth.isAdmin">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id">
            <td><strong>{{ c.name }}</strong></td>
            <td>{{ c.document || '-' }}</td>
            <td>{{ c.phone || '-' }}</td>
            <td>{{ c.email || '-' }}</td>
            <td class="notes-cell">{{ c.notes || '-' }}</td>
            <td v-if="auth.isAdmin">
              <button class="btn-icon" @click="openEditModal(c)" :title="`✏️ Editar ${c.name}`">✏️</button>
              <button class="btn-icon btn-icon-danger" @click="confirmDelete(c)" :title="`🗑️ Eliminar ${c.name}`">🗑️</button>
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

    <ModalBase v-model="showModal" :title="editingCustomer ? 'Editar cliente' : 'Nuevo cliente'">
      <form @submit.prevent="saveCustomer">
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <input v-model="form.name" type="text" class="form-input" required @input="form.name = toUpperCase(form.name)" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Documento</label>
            <input v-model="form.document" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input v-model="form.phone" type="text" class="form-input" @input="form.phone = toUpperCase(form.phone)" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correo (opcional)</label>
          <input v-model="form.email" type="email" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <input v-model="form.notes" type="text" class="form-input" @input="form.notes = toUpperCase(form.notes)" />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveCustomer" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>

    <ConfirmDialog
      v-model="showConfirm"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'
import { toUpperCase } from '@/utils/textFormat'

const auth = useAuthStore()
const toast = useToastStore()
const customers = ref([])
const loading = ref(true)
const saving = ref(false)
const searching = ref(false)
const search = ref('')
const showModal = ref(false)
const editingCustomer = ref(null)

const showConfirm = ref(false)
const confirmConfig = ref({ title: '', message: '', action: null })

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({ name: '', document: '', phone: '', email: '', notes: '' })

let searchTimeout = null
function onSearchInput() {
  searching.value = true
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    pageNumber.value = 1
    await loadCustomers()
    searching.value = false
  }, 300)
}

async function loadCustomers() {
  try {
    loading.value = true
    const res = await api.get('/Customer', {
      params: { pageNumber: pageNumber.value, pageSize: pageSize.value, search: search.value }
    })
    const data = res.data.data
    customers.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch {
    toast.show('Error al cargar los clientes', 'error')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  pageNumber.value = page
  loadCustomers()
}

function openCreateModal() {
  editingCustomer.value = null
  form.value = { name: '', document: '', phone: '', email: '', notes: '' }
  showModal.value = true
}

function openEditModal(customer) {
  editingCustomer.value = customer
  form.value = {
    name: customer.name,
    document: customer.document || '',
    phone: customer.phone || '',
    email: customer.email || '',
    notes: customer.notes || ''
  }
  showModal.value = true
}

async function saveCustomer() {
  try {
    saving.value = true
    const payload = {
      name: form.value.name,
      document: form.value.document || null,
      phone: form.value.phone || null,
      email: form.value.email || null,
      notes: form.value.notes || null
    }
    if (editingCustomer.value) {
      await api.put(`/Customer/${editingCustomer.value.id}`, payload)
      toast.show('Cliente actualizado correctamente', 'success')
    } else {
      await api.post('/Customer', payload)
      toast.show('Cliente creado correctamente', 'success')
    }
    showModal.value = false
    loadCustomers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al guardar el cliente', 'error')
  } finally {
    saving.value = false
  }
}

function openConfirm(title, message, action) {
  confirmConfig.value = { title, message, action }
  showConfirm.value = true
}

async function handleConfirm() {
  if (confirmConfig.value.action) {
    await confirmConfig.value.action()
  }
}

function confirmDelete(customer) {
  openConfirm(
    '¿Eliminar cliente?',
    `¿Deseas eliminar a "${customer.name}"? Esta acción no se puede deshacer.`,
    () => deleteCustomer(customer)
  )
}

async function deleteCustomer(customer) {
  try {
    await api.delete(`/Customer/${customer.id}`)
    toast.show('Cliente desactivado correctamente', 'success')
    loadCustomers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al desactivar el cliente', 'error')
  }
}

onMounted(loadCustomers)
</script>

<style scoped>
.customers-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.search-bar { display: flex; }
.search-input-wrapper {
  position: relative;
  max-width: 320px;
}
.search-input {
  width: 100%;
  padding-right: 36px;
}
.search-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  animation: spin 1s linear infinite;
  pointer-events: none;
}
@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
.btn-icon { background: var(--color-bg); width: 30px; height: 30px; border-radius: 8px; margin-right: 6px; transition: var(--transition); }
.btn-icon:hover { background: var(--color-accent-light); }
.btn-icon-danger:hover { background: #FFEBEE; color: var(--color-danger); }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--color-border); }
.page-info { font-size: 12px; color: var(--color-text-muted); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
</style>
