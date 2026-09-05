<template>
  <div class="suppliers-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Proveedores</h2>
        <p class="page-sub">{{ totalRecords }} proveedores registrados</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="openCreateModal">
        + Nuevo proveedor
      </button>
    </div>

    <div class="search-bar">
      <div class="search-input-wrapper">
        <input
          v-model="search"
          type="text"
          class="form-input search-input"
          placeholder="Buscar por nombre, teléfono o email..."
          @input="onSearchInput"
        />
        <span v-if="searching" class="search-spinner" title="Buscando...">🔍</span>
      </div>
    </div>

    <div class="card">
      <SkeletonLoader v-if="loading" type="table" :rows="8" :columns="5" />

      <div v-else-if="suppliers.length === 0" class="state-text">
        No se encontraron proveedores.
      </div>

      <table v-else>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id" class="clickable-row" @click="openEditModal(s)">
            <td><strong>{{ s.name }}</strong></td>
            <td>{{ s.phone || '-' }}</td>
            <td>{{ s.email || '-' }}</td>
            <td>{{ s.notes || '-' }}</td>
            <td>
              <button class="btn-icon" @click.stop="openEditModal(s)" :title="`✏️ Editar ${s.name}`">✏️</button>
              <button class="btn-icon btn-icon-danger" @click.stop="confirmDelete(s)" :title="`🗑️ Eliminar ${s.name}`">🗑️</button>
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

    <!-- Modal Crear/Editar -->
    <ModalBase v-model="showModal" :title="editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'">
      <form @submit.prevent="saveSupplier">
        <div class="form-group">
          <label class="form-label">Nombre del proveedor</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            required
            @input="form.name = toUpperCase(form.name)"
          />
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
          <label class="form-label">Notas (opcional)</label>
          <textarea
            v-model="form.notes"
            class="form-input"
            rows="3"
            @input="form.notes = toUpperCase(form.notes)"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveSupplier" :disabled="saving">
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
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber, formatDate } from '@/utils/format'

const toast = useToastStore()

const suppliers = ref([])
const loading = ref(true)
const saving = ref(false)
const searching = ref(false)
const search = ref('')
const showModal = ref(false)
const editingSupplier = ref(null)

const showConfirm = ref(false)
const confirmConfig = ref({ title: '', message: '', action: null })

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({
  name: '',
  phone: '',
  email: '',
  notes: ''
})

let searchTimeout = null
function onSearchInput() {
  searching.value = true
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    pageNumber.value = 1
    await loadSuppliers()
    searching.value = false
  }, 300)
}

async function loadSuppliers() {
  try {
    loading.value = true
    const res = await api.get('/Supplier', {
      params: { pageNumber: pageNumber.value, pageSize: pageSize.value, search: search.value }
    })
    const data = res.data.data
    suppliers.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch (err) {
    toast.show('Error al cargar los proveedores', 'error')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  pageNumber.value = page
  loadSuppliers()
}

function openCreateModal() {
  editingSupplier.value = null
  form.value = { name: '', phone: '', email: '', notes: '' }
  showModal.value = true
}

function openEditModal(supplier) {
  editingSupplier.value = supplier
  form.value = {
    name: supplier.name,
    phone: supplier.phone || '',
    email: supplier.email || '',
    notes: supplier.notes || ''
  }
  showModal.value = true
}

async function saveSupplier() {
  try {
    saving.value = true

    // ✅ Payload exacto según backend: name, phone, email, notes
    const payload = {
      name: form.value.name,
      phone: form.value.phone || null,
      email: form.value.email || null,
      notes: form.value.notes || null
    }

    if (editingSupplier.value) {
      await api.put(`/Supplier/${editingSupplier.value.id}`, payload)
      toast.show('Proveedor actualizado correctamente', 'success')
    } else {
      await api.post('/Supplier', payload)
      toast.show('Proveedor creado correctamente', 'success')
    }
    showModal.value = false
    loadSuppliers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al guardar el proveedor', 'error')
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

function confirmDelete(supplier) {
  openConfirm(
    '¿Eliminar proveedor?',
    `¿Deseas eliminar al proveedor "${supplier.name}"?`,
    () => deleteSupplier(supplier)
  )
}

async function deleteSupplier(supplier) {
  try {
    await api.delete(`/Supplier/${supplier.id}`)
    toast.show('Proveedor eliminado correctamente', 'success')
    loadSuppliers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al eliminar el proveedor', 'error')
  }
}

onMounted(() => {
  loadSuppliers()
})
</script>

<style scoped>
.suppliers-view {
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

.search-input-wrapper {
  position: relative;
  max-width: 400px;
  flex: 1;
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

.state-text {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 13px;
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
  margin-right: 6px;
  transition: var(--transition);
}

.btn-icon:hover {
  background: var(--color-accent-light);
}

.btn-icon-danger:hover {
  background: #ffebee;
  color: var(--color-danger);
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

textarea.form-input {
  resize: vertical;
  font-family: inherit;
}
</style>
