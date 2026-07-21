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
      <input
        v-model="search"
        type="text"
        class="form-input search-input"
        placeholder="Buscar por nombre, contacto o teléfono..."
        @input="onSearchInput"
      />
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando proveedores...</div>
      <div v-else-if="suppliers.length === 0" class="state-text">
        No se encontraron proveedores.
      </div>

      <table v-else>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id" class="clickable-row" @click="openEditModal(s)">
            <td><strong>{{ s.name }}</strong></td>
            <td>{{ s.contactName || '-' }}</td>
            <td>{{ s.phone || '-' }}</td>
            <td>{{ s.email || '-' }}</td>
            <td>
              <button class="btn-icon" @click.stop="openEditModal(s)">✎</button>
              <button class="btn-icon btn-icon-danger" @click.stop="confirmDelete(s)">🗑</button>
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

        <div class="form-group">
          <label class="form-label">Nombre de contacto (opcional)</label>
          <input
            v-model="form.contactName"
            type="text"
            class="form-input"
            @input="form.contactName = toUpperCase(form.contactName)"
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
          <label class="form-label">Dirección (opcional)</label>
          <input
            v-model="form.address"
            type="text"
            class="form-input"
            @input="form.address = toUpperCase(form.address)"
          />
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import ModalBase from '@/components/shared/ModalBase.vue'
import { toUpperCase } from '@/utils/textFormat'

const suppliers = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const showModal = ref(false)
const editingSupplier = ref(null)

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
})

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadSuppliers()
  }, 400)
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
    console.error('Error cargando proveedores:', err)
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
  form.value = { name: '', contactName: '', phone: '', email: '', address: '', notes: '' }
  showModal.value = true
}

function openEditModal(supplier) {
  editingSupplier.value = supplier
  form.value = {
    name: supplier.name,
    contactName: supplier.contactName || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
    notes: supplier.notes || ''
  }
  showModal.value = true
}

async function saveSupplier() {
  try {
    saving.value = true
    if (editingSupplier.value) {
      await api.put(`/Supplier/${editingSupplier.value.id}`, form.value)
    } else {
      await api.post('/Supplier', form.value)
    }
    showModal.value = false
    loadSuppliers()
  } catch (err) {
    alert(err.response?.data?.message || 'Error al guardar el proveedor.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(supplier) {
  if (!confirm(`¿Eliminar el proveedor "${supplier.name}"?`)) return
  try {
    await api.delete(`/Supplier/${supplier.id}`)
    loadSuppliers()
  } catch (err) {
    alert(err.response?.data?.message || 'Error al eliminar el proveedor.')
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

.search-input {
  max-width: 400px;
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
