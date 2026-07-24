<template>
  <div class="products-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Productos</h2>
        <p class="page-sub" v-if="!auth.isPartner">{{ totalRecords }} productos registrados</p>
        <p class="page-sub" v-else>Precios a los que AS te entrega cada producto</p>
      </div>
      <button class="btn btn-primary floating-action-btn" @click="openCreateModal" v-if="auth.isAdmin">
        + Nuevo producto
      </button>
    </div>

    <div class="search-bar" v-if="!auth.isPartner">
      <input
        v-model="search"
        type="text"
        class="form-input search-input"
        placeholder="Buscar por nombre o código..."
        @input="onSearchInput"
      />
      <select v-model="filterCategory" class="form-input filter-select" @change="onFilterChange">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <select v-model="filterStatus" class="form-input filter-select" @change="onFilterChange">
        <option value="">Solo activos (default)</option>
        <option value="inactive">Solo inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div class="card">
      <div v-if="loading" class="state-text">Cargando productos...</div>
      <div v-else-if="products.length === 0" class="state-text">
        No se encontraron productos.
      </div>

      <!-- Tabla ADMIN / SELLER -->
      <table v-else-if="!auth.isPartner">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th v-if="auth.isAdmin">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.code }}</td>
            <td>
              <strong>{{ p.name }}</strong>
              <span v-if="p.isPartnership" class="badge badge-pink" style="margin-left: 6px;">
                Alianza
              </span>
            </td>
            <td>{{ p.categoryName }}</td>
            <td>${{ formatNumber(p.salePrice) }}</td>
            <td>
              <span :class="['badge', p.isLowStock ? 'badge-danger' : 'badge-success']">
                {{ p.stock }} uds
              </span>
            </td>
            <td>
              <span :class="['badge', p.isActive ? 'badge-success' : 'badge-danger']">
                {{ p.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td v-if="auth.isAdmin">
              <button class="btn-icon" @click.stop="openEditModal(p)" :title="`✏️ Editar ${p.name}`">✏️</button>
              <button 
                class="btn-icon" 
                :class="p.isActive ? 'btn-icon-warning' : 'btn-icon-success'"
                @click.stop="toggleProductStatus(p)" 
                :title="`${p.isActive ? '🔴 Desactivar' : '🟢 Activar'} ${p.name}`"
              >
                {{ p.isActive ? '🔴' : '🟢' }}
              </button>
              <button class="btn-icon btn-icon-danger" @click.stop="confirmDelete(p)" :title="`🗑️ Eliminar ${p.name}`">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Tabla PARTNER -->
      <table v-else>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Te cuesta</th>
            <th>Precio sugerido</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.productId">
            <td>{{ p.code }}</td>
            <td>
              <strong>{{ p.name }}</strong>
              <span v-if="p.isPartnership" class="badge badge-pink" style="margin-left: 6px;">
                Alianza
              </span>
            </td>
            <td>{{ p.categoryName }}</td>
            <td>
              <span :class="['badge', p.stock <= 0 ? 'badge-danger' : 'badge-success']">
                {{ p.stock }} uds
              </span>
            </td>
            <td style="color: var(--color-accent); font-weight: 600;">
              ${{ formatNumber(p.partnerPrice) }}
            </td>
            <td>${{ formatNumber(p.suggestedPrice) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="!auth.isPartner && totalPages > 1">
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

    <!-- Modal Crear/Editar (solo Admin) -->
    <ModalBase v-model="showModal" :title="editingProduct ? 'Editar producto' : 'Nuevo producto'">
      <form @submit.prevent="saveProduct">
        <div class="form-group">
          <label class="form-label">Código</label>
          <input v-model="form.code" type="text" class="form-input" required @input="form.code = toUpperCase(form.code)" />
        </div>

        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input v-model="form.name" type="text" class="form-input" required @input="form.name = toUpperCase(form.name)" />
        </div>

        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select v-model="form.categoryId" class="form-input" required>
            <option value="" disabled>Selecciona una categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Proveedor</label>
          <select v-model="form.supplierId" class="form-input" required>
            <option value="" disabled>Selecciona un proveedor</option>
            <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
              {{ sup.name }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Costo (privado)</label>
            <CurrencyInput v-model="form.cost" @update:modelValue="suggestPrice" />
          </div>
          <div class="form-group">
            <label class="form-label">Precio de venta</label>
            <CurrencyInput v-model="form.salePrice" />
          </div>
        </div>
        <p class="hint-text" v-if="suggestedPrice">
          Sugerido (+70%): ${{ formatNumber(suggestedPrice) }}
        </p>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Stock {{ editingProduct ? '' : 'inicial' }}</label>
            <input
              v-model.number="form.stock"
              type="number"
              class="form-input"
              :disabled="!!editingProduct"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Stock mínimo</label>
            <input v-model.number="form.minStock" type="number" class="form-input" required />
          </div>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.isPartnership" />
            Producto de alianza (sociedad con socio externo)
          </label>
        </div>
      </form>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveProduct" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import ModalBase from '@/components/shared/ModalBase.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { toUpperCase } from '@/utils/textFormat'

const auth = useAuthStore()
const toast = useToastStore()

const products = ref([])
const categories = ref([])
const suppliers = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingProduct = ref(null)
const suggestedPrice = ref(0)

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({
  code: '', name: '', categoryId: '', supplierId: '', cost: 0,
  salePrice: 0, stock: 0, minStock: 0, isPartnership: false
})

function formatNumber(n) {
  return Number(n).toLocaleString('es-CO')
}

function suggestPrice() {
  suggestedPrice.value = Math.round(form.value.cost * 1.7)
  form.value.salePrice = suggestedPrice.value
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pageNumber.value = 1
    loadProducts()
  }, 400)
}

function onFilterChange() {
  pageNumber.value = 1
  loadProducts()
}

async function loadProducts() {
  try {
    loading.value = true

    if (auth.isPartner) {
      const res = await api.get('/Partner/my/products')
      products.value = res.data.data
    } else {
      const params = { 
        pageNumber: pageNumber.value, 
        pageSize: pageSize.value, 
        search: search.value 
      }
      
      // Agregar filtros opcionales
      if (filterCategory.value) {
        params.categoryId = filterCategory.value
      }
      
      // Filtro de estado
      if (filterStatus.value === 'inactive') {
        params.isActive = false
      } else if (filterStatus.value === 'all') {
        // No enviar isActive para que el backend devuelva todos
        // (omitir el parámetro)
      } else {
        // Default '' → solo activos
        params.isActive = true
      }
      
      const res = await api.get('/Product', { params })
      const data = res.data.data
      products.value = data.data
      totalRecords.value = data.totalRecords
      totalPages.value = data.totalPages
      hasNextPage.value = data.hasNextPage
      hasPreviousPage.value = data.hasPreviousPage
    }
  } catch (err) {
    console.error('Error cargando productos:', err)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await api.get('/Category', { params: { pageSize: 100 } })
    categories.value = res.data.data.data
  } catch (err) {
    console.error('Error cargando categorías:', err)
  }
}

async function loadSuppliers() {
  try {
    const res = await api.get('/Supplier', { params: { pageSize: 100 } })
    suppliers.value = res.data.data.data
  } catch (err) {
    console.error('Error cargando proveedores:', err)
  }
}

function changePage(page) {
  pageNumber.value = page
  loadProducts()
}

function openCreateModal() {
  editingProduct.value = null
  form.value = { code: '', name: '', categoryId: '', supplierId: '', cost: 0, salePrice: 0, stock: 0, minStock: 0, isPartnership: false }
  suggestedPrice.value = 0
  showModal.value = true
}

function openEditModal(product) {
  editingProduct.value = product
  form.value = {
    code: product.code,
    name: product.name,
    categoryId: product.categoryId,
    supplierId: product.supplierId || '',
    cost: product.cost || 0,
    salePrice: product.salePrice,
    stock: product.stock,
    minStock: product.minStock,
    isPartnership: product.isPartnership || false
  }
  showModal.value = true
}

async function saveProduct() {
  try {
    saving.value = true
    if (editingProduct.value) {
      await api.put(`/Product/${editingProduct.value.id}`, form.value)
      toast.show('Producto actualizado correctamente', 'success')
    } else {
      await api.post('/Product', form.value)
      toast.show('Producto creado correctamente', 'success')
    }
    showModal.value = false
    loadProducts()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al guardar el producto', 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(product) {
  if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return
  try {
    await api.delete(`/Product/${product.id}`)
    toast.show('Producto eliminado correctamente', 'success')
    loadProducts()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al eliminar el producto', 'error')
  }
}

async function toggleProductStatus(product) {
  const action = product.isActive ? 'desactivar' : 'activar'
  if (!confirm(`¿Está seguro de ${action} el producto "${product.name}"?`)) return
  try {
    await api.patch(`/Product/${product.id}/toggle-status`)
    toast.show(`Producto ${action}do correctamente`, 'success')
    loadProducts()
  } catch (err) {
    toast.show(err.response?.data?.message || `Error al ${action} el producto`, 'error')
  }
}

onMounted(() => {
  loadProducts()
  if (!auth.isPartner) {
    loadCategories()
    loadSuppliers()
  }
})
</script>

<style scoped>
.products-view { display: flex; flex-direction: column; gap: 16px; }

.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

.search-bar { 
  display: flex; 
  gap: 12px;
  flex-wrap: wrap;
}

.search-input { 
  max-width: 320px; 
  flex: 1;
  min-width: 200px;
}

.filter-select {
  max-width: 200px;
  flex-shrink: 0;
}

.state-text {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  margin-right: 6px;
  transition: var(--transition);
  cursor: pointer;
}
.btn-icon:hover { background: var(--color-accent-light); }
.btn-icon-danger:hover { background: #FFEBEE; color: var(--color-danger); }
.btn-icon-warning:hover { background: #FFF3E0; color: var(--color-warning); }
.btn-icon-success:hover { background: #E8F5E9; color: var(--color-success); }

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

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.hint-text {
  font-size: 12px;
  color: var(--color-accent);
  margin: -10px 0 14px;
}

.checkbox-group { margin-bottom: 8px; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}
.checkbox-label input { width: 16px; height: 16px; cursor: pointer; }
</style>
