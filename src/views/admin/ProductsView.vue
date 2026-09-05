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
      <div class="search-input-wrapper">
        <input
          v-model="search"
          type="text"
          class="form-input search-input"
          placeholder="Buscar por nombre o código..."
          @input="onSearchInput"
        />
        <span v-if="searching" class="search-spinner" title="Buscando...">🔍</span>
      </div>
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
      <!-- Skeleton Loader mientras carga -->
      <SkeletonLoader v-if="loading" type="table" :rows="10" :columns="7" />

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
          <tr v-for="p in products" :key="p.id" class="clickable-row" @click="openProductDetail(p)">
            <td>{{ p.code }}</td>
            <td>
              <strong>{{ p.name }}</strong>
              <span v-if="p.businessPartnerName" class="badge badge-pink" style="margin-left: 6px;">
                🤝 {{ p.businessPartnerName }}
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
                @click.stop="confirmToggleStatus(p)"
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
          <tr
            v-for="p in products"
            :key="p.productId"
            class="clickable-row"
            @click="openProductDetail(p)"
          >
            <td>{{ p.code }}</td>
            <td>
              <strong>{{ p.name }}</strong>
              <span v-if="p.businessPartnerName" class="badge badge-pink" style="margin-left: 6px;">
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
          <label class="form-label">Proveedor (opcional)</label>
          <select v-model="form.supplierId" class="form-input">
            <option value="">Sin proveedor</option>
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
              min="0"
              required
            />
            <p class="hint-text" v-if="editingProduct">
              ⚠️ Modificar stock aquí no registra movimiento en el kardex. Para trazabilidad completa usa la vista de Stock.
            </p>
          </div>
          <div class="form-group">
            <label class="form-label">Stock mínimo</label>
            <input v-model.number="form.minStock" type="number" class="form-input" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Socio comercial (opcional)</label>
          <select v-model="form.businessPartnerId" class="form-input">
            <option :value="null">Sin socio — producto propio de AS</option>
            <option v-for="bp in businessPartners" :key="bp.id" :value="bp.id">
              {{ bp.name }}
            </option>
          </select>
          <p class="hint-text" v-if="form.businessPartnerId">
            Este producto pertenece a la sociedad con {{ businessPartners.find(bp => bp.id === form.businessPartnerId)?.name }}.
            La ganancia se dividirá en la liquidación.
          </p>
        </div>
      </form>

      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveProduct" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </ModalBase>

    <!-- Modal Detalle de Producto -->
    <ModalBase v-model="showProductDetailModal" title="Detalle del producto" width="480px">
      <div v-if="selectedProduct" class="product-detail">
        <!-- Campos para todos los roles -->
        <div class="detail-row-info">
          <span>Código:</span>
          <strong>{{ selectedProduct.code }}</strong>
        </div>
        <div class="detail-row-info">
          <span>Nombre:</span>
          <strong>{{ selectedProduct.name }}</strong>
        </div>
        <div class="detail-row-info">
          <span>Categoría:</span>
          <strong>{{ selectedProduct.categoryName || '-' }}</strong>
        </div>
        <div class="detail-row-info">
          <span>Stock disponible:</span>
          <strong :style="{ color: selectedProduct.stock <= 0 ? 'var(--color-danger)' : 'var(--color-success)' }">
            {{ selectedProduct.stock }} uds
          </strong>
        </div>

        <!-- Solo para Partner: precios -->
        <template v-if="auth.isPartner">
          <div class="detail-row-info" style="border-top: 1px solid var(--color-border); margin-top: 8px; padding-top: 8px;">
            <span>💰 Te cuesta:</span>
            <strong style="color: var(--color-accent); font-size: 15px;">
              ${{ formatNumber(selectedProduct.partnerPrice) }}
            </strong>
          </div>
          <div class="detail-row-info">
            <span>🏷️ Precio sugerido venta:</span>
            <strong>${{ formatNumber(selectedProduct.suggestedPrice || selectedProduct.salePrice) }}</strong>
          </div>
          <div class="detail-row-info" v-if="selectedProduct.businessPartnerName">
            <span>Tipo:</span>
            <span class="badge badge-pink">🤝 Alianza</span>
          </div>
        </template>

        <!-- Solo para Admin/Seller: info completa -->
        <template v-if="!auth.isPartner">
          <div class="detail-row-info">
            <span>Precio venta:</span>
            <strong>${{ formatNumber(selectedProduct.salePrice) }}</strong>
          </div>
          <div class="detail-row-info" v-if="auth.isAdmin">
            <span>Costo:</span>
            <strong>${{ formatNumber(selectedProduct.cost) }}</strong>
          </div>
          <div class="detail-row-info">
            <span>Stock mínimo:</span>
            <strong>{{ selectedProduct.minStock }} uds</strong>
          </div>
          <div class="detail-row-info" v-if="auth.isAdmin">
            <span>Proveedor:</span>
            <strong>{{ selectedProduct.supplierName || 'Sin proveedor' }}</strong>
          </div>
          <div class="detail-row-info" v-if="auth.isAdmin">
            <span>Socio comercial:</span>
            <strong>{{ selectedProduct.businessPartnerName || 'Producto propio de AS' }}</strong>
          </div>
          <div class="detail-row-info">
            <span>Estado:</span>
            <span :class="['badge', selectedProduct.isActive ? 'badge-success' : 'badge-danger']">
              {{ selectedProduct.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showProductDetailModal = false">Cerrar</button>
        <button
          class="btn btn-primary"
          @click="showProductDetailModal = false; openEditModal(selectedProduct)"
          v-if="auth.isAdmin"
        >
          ✏️ Editar
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
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'
import { toUpperCase } from '@/utils/textFormat'
import { formatNumber, formatDate } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()

const products = ref([])
const categories = ref([])
const suppliers = ref([])
const businessPartners = ref([])
const loading = ref(true)
const saving = ref(false)
const searching = ref(false)
const search = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const showProductDetailModal = ref(false)
const editingProduct = ref(null)
const selectedProduct = ref(null)
const suggestedPrice = ref(0)

const showConfirm = ref(false)
const confirmConfig = ref({ title: '', message: '', action: null })

const pageNumber = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)

const form = ref({
  code: '', name: '', categoryId: '', supplierId: '', cost: 0,
  salePrice: 0, stock: 0, minStock: 0, isPartnership: false, businessPartnerId: null
})

function suggestPrice() {
  suggestedPrice.value = Math.round(form.value.cost * 1.7)
  form.value.salePrice = suggestedPrice.value
}

let searchTimeout = null
function onSearchInput() {
  searching.value = true
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    pageNumber.value = 1
    await loadProducts()
    searching.value = false
  }, 300)
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
    toast.show('Error al cargar los productos', 'error')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await api.get('/Category', { params: { pageSize: 100 } })
    categories.value = res.data.data.data
  } catch (err) {
    toast.show('Error al cargar las categorías', 'error')
  }
}

async function loadSuppliers() {
  try {
    const res = await api.get('/Supplier', { params: { pageSize: 100 } })
    suppliers.value = res.data.data.data
  } catch (err) {
    toast.show('Error al cargar los proveedores', 'error')
  }
}

async function loadBusinessPartners() {
  try {
    const res = await api.get('/BusinessPartner', { params: { pageSize: 100 } })
    businessPartners.value = res.data.data?.data || res.data.data || []
  } catch {
    businessPartners.value = []
  }
}

function changePage(page) {
  pageNumber.value = page
  loadProducts()
}

function openCreateModal() {
  editingProduct.value = null
  form.value = { code: '', name: '', categoryId: '', supplierId: '', cost: 0, salePrice: 0, stock: 0, minStock: 0, isPartnership: false, businessPartnerId: null }
  suggestedPrice.value = 0
  showModal.value = true
}

function openEditModal(product) {
  editingProduct.value = product
  form.value = {
    code: product.code,
    name: product.name,
    categoryId: product.categoryId,
    cost: product.cost || 0,
    salePrice: product.salePrice,
    stock: product.stock,
    minStock: product.minStock,
    isPartnership: product.isPartnership || false,
    supplierId: product.supplierId || '',
    businessPartnerId: product.businessPartnerId || null
  }
  showModal.value = true
}

async function saveProduct() {
  try {
    saving.value = true
    const payload = {
      ...form.value,
      supplierId: form.value.supplierId || null
    }
    if (editingProduct.value) {
      await api.put(`/Product/${editingProduct.value.id}`, payload)
      toast.show('Producto actualizado correctamente', 'success')
    } else {
      await api.post('/Product', payload)
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

function openConfirm(title, message, action) {
  confirmConfig.value = { title, message, action }
  showConfirm.value = true
}

async function handleConfirm() {
  if (confirmConfig.value.action) {
    await confirmConfig.value.action()
  }
}

function confirmDelete(product) {
  openConfirm(
    '¿Eliminar producto?',
    `¿Deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
    () => deleteProduct(product)
  )
}

async function deleteProduct(product) {
  try {
    await api.delete(`/Product/${product.id}`)
    toast.show('Producto eliminado correctamente', 'success')
    loadProducts()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al eliminar el producto', 'error')
  }
}

function confirmToggleStatus(product) {
  const action = product.isActive ? 'desactivar' : 'activar'
  openConfirm(
    `¿${action.charAt(0).toUpperCase() + action.slice(1)} producto?`,
    `¿Deseas ${action} "${product.name}"?${product.isActive ? ' Puedes reactivarlo después desde los filtros.' : ''}`,
    () => toggleProductStatus(product)
  )
}

async function toggleProductStatus(product) {
  const action = product.isActive ? 'desactivar' : 'activar'
  try {
    await api.patch(`/Product/${product.id}/toggle-status`)
    toast.show(`Producto ${action}do correctamente`, 'success')
    loadProducts()
  } catch (err) {
    toast.show(err.response?.data?.message || `Error al ${action} el producto`, 'error')
  }
}

function openProductDetail(product) {
  selectedProduct.value = product
  showProductDetailModal.value = true
}

onMounted(() => {
  loadProducts()
  if (!auth.isPartner) {
    loadCategories()
    loadSuppliers()
    loadBusinessPartners()
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

.search-input-wrapper {
  position: relative;
  max-width: 320px;
  flex: 1;
  min-width: 200px;
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
  margin: 8px 0 0 0;
  line-height: 1.4;
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

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: var(--color-accent-light) !important;
}

.product-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.detail-row-info span:first-child {
  color: var(--color-text-muted);
}
</style>
