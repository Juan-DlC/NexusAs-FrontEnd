<template>
  <div class="categories-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Categorías</h2>
        <p class="page-sub">{{ totalRecords }} categorías registradas</p>
      </div>
     <button class="btn btn-primary floating-action-btn" @click="openCreateModal">
        + Nueva categoría
      </button>
    </div>

    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        class="form-input search-input"
        placeholder="Buscar por nombre..."
        @input="onSearchInput"
      />
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando...</div>
      <div v-else-if="categories.length === 0" class="state-text">
        No hay categorías registradas.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat.id">
            <td><strong>{{ cat.name }}</strong></td>
            <td>{{ cat.description || '-' }}</td>
            <td>
              <button class="btn-icon" @click="openEditModal(cat)" :title="`✏️ Editar ${cat.name}`">✏️</button>
              <button class="btn-icon btn-icon-danger" @click="confirmDelete(cat)" :title="`🗑️ Eliminar ${cat.name}`">🗑️</button>
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

    <ModalBase v-model="showModal" :title="editingCategory ? 'Editar categoría' : 'Nueva categoría'">
      <form @submit.prevent="saveCategory">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input v-model="form.name" type="text" class="form-input" required @input="form.name = toUpperCase(form.name)" />
        </div>
        <div class="form-group">
          <label class="form-label">Descripción (opcional)</label>
          <input v-model="form.description" type="text" class="form-input" @input="form.description = toUpperCase(form.description)" />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveCategory" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import { toUpperCase } from '@/utils/textFormat'

const toast = useToastStore()

const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const showModal = ref(false)
const editingCategory = ref(null)
const form = ref({ name: '', description: '' })

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadCategories()
  }, 400)
}

function changePage(page) {
  pageNumber.value = page
  loadCategories()
}

async function loadCategories() {
  try {
    loading.value = true
    const res = await api.get('/Category', {
      params: { pageNumber: pageNumber.value, pageSize: pageSize.value, search: search.value }
    })
    const data = res.data.data
    categories.value = data.data
    totalRecords.value = data.totalRecords
    totalPages.value = data.totalPages
    hasNextPage.value = data.hasNextPage
    hasPreviousPage.value = data.hasPreviousPage
  } catch (err) {
    console.error('Error cargando categorías:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingCategory.value = null
  form.value = { name: '', description: '' }
  showModal.value = true
}

function openEditModal(cat) {
  editingCategory.value = cat
  form.value = { name: cat.name, description: cat.description || '' }
  showModal.value = true
}

async function saveCategory() {
  try {
    saving.value = true
    if (editingCategory.value) {
      await api.put(`/Category/${editingCategory.value.id}`, form.value)
      toast.show('Categoría actualizada correctamente', 'success')
    } else {
      await api.post('/Category', form.value)
      toast.show('Categoría creada correctamente', 'success')
    }
    showModal.value = false
    loadCategories()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al guardar la categoría', 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(cat) {
  if (!confirm(`¿Desactivar la categoría "${cat.name}"?`)) return
  try {
    await api.delete(`/Category/${cat.id}`)
    toast.show('Categoría desactivada correctamente', 'success')
    loadCategories()
  } catch (err) {
    toast.show(err.response?.data?.message || 'No se puede eliminar: tiene productos asociados', 'error')
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.categories-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.search-bar { display: flex; }
.search-input { max-width: 320px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
.btn-icon { background: var(--color-bg); width: 30px; height: 30px; border-radius: 8px; margin-right: 6px; transition: var(--transition); }
.btn-icon:hover { background: var(--color-accent-light); }
.btn-icon-danger:hover { background: #FFEBEE; color: var(--color-danger); }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--color-border); }
.page-info { font-size: 12px; color: var(--color-text-muted); }
</style>
