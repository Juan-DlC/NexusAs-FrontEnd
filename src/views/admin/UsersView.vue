<template>
  <div class="users-view">
    <div class="page-header-row">
      <div>
        <h2 class="page-title">Usuarios</h2>
        <p class="page-sub">{{ users.length }} usuarios registrados</p>
      </div>
      <div class="header-actions">
        <label class="toggle-label">
          <input type="checkbox" v-model="showInactive" @change="loadUsers" />
          Mostrar inactivos
        </label>
        <button class="btn btn-primary" @click="openCreateModal">
          + Nuevo usuario
        </button>
      </div>
    </div>

    <div class="card">
      <SkeletonLoader v-if="loading" type="table" :rows="6" :columns="5" />

      <div v-else-if="users.length === 0" class="state-text">
        No hay usuarios registrados.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre completo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.username }}</strong></td>
            <td>{{ u.fullName }}</td>
            <td>
              <span :class="['badge', roleBadge(u.role)]">{{ roleLabel(u.role) }}</span>
            </td>
            <td>
              <span :class="['badge', u.isActive ? 'badge-success' : 'badge-danger']">
                {{ u.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button class="btn-icon" @click.stop="openResetModal(u)" title="🔑 Resetear contraseña">🔑</button>
              <button class="btn btn-secondary btn-sm" @click="confirmToggleStatus(u)">
                {{ u.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalBase v-model="showModal" title="Nuevo usuario">
      <form @submit.prevent="saveUser">
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <input
            v-model="form.fullName"
            type="text"
            class="form-input"
            required
            style="text-transform: uppercase;"
            @input="form.fullName = form.fullName.toUpperCase()"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Usuario (username)</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            required
            style="text-transform: uppercase;"
            @input="form.username = form.username.toUpperCase()"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <input v-model="form.password" type="password" class="form-input" required minlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">Rol</label>
          <select v-model="form.role" class="form-input" required>
            <option value="" disabled>Selecciona un rol</option>
            <option value="Admin">Admin</option>
            <option value="Seller">Vendedor</option>
            <option value="Partner">Socia-vendedora</option>
          </select>
          <p class="hint-text" v-if="form.role === 'Partner'">
            Después de crear este usuario, configura su comisión en la sección "Socias".
          </p>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="saveUser" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Crear usuario' }}
        </button>
      </template>
    </ModalBase>

    <ConfirmDialog
      v-model="showConfirm"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      @confirm="handleConfirm"
    />

    <!-- Modal Reset de Contraseña -->
    <ModalBase v-model="showResetModal" title="Resetear contraseña" width="420px">
      <div v-if="resetTarget">
        <div class="reset-user-info">
          <span class="reset-user-icon">👤</span>
          <div>
            <p class="reset-user-name">{{ resetTarget.fullName }}</p>
            <p class="reset-user-role">{{ resetTarget.username }} — {{ roleLabel(resetTarget.role) }}</p>
          </div>
        </div>

        <div class="reset-warning">
          ⚠️ Esta acción cambiará la contraseña del usuario inmediatamente.
          Comunícale la nueva contraseña de forma segura.
        </div>

        <div class="form-group" style="margin-top: 16px;">
          <label class="form-label">Nueva contraseña</label>
          <input
            v-model="resetForm.newPassword"
            type="password"
            class="form-input"
            placeholder="Mínimo 6 caracteres"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Confirmar contraseña</label>
          <input
            v-model="resetForm.confirmPassword"
            type="password"
            class="form-input"
            placeholder="Repite la contraseña"
            autocomplete="new-password"
            @keyup.enter="resetPassword"
          />
          <p v-if="resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword" class="error-hint">
            ❌ Las contraseñas no coinciden
          </p>
          <p v-else-if="resetForm.confirmPassword && resetForm.newPassword === resetForm.confirmPassword" class="success-hint">
            ✅ Las contraseñas coinciden
          </p>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showResetModal = false">Cancelar</button>
        <button class="btn btn-primary" @click="resetPassword" :disabled="resetting">
          {{ resetting ? '⏳ Actualizando...' : '🔑 Cambiar contraseña' }}
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
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'

const toast = useToastStore()

const users = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const showInactive = ref(false)
const form = ref({ fullName: '', username: '', password: '', role: '' })

const showConfirm = ref(false)
const confirmConfig = ref({ title: '', message: '', action: null })

// ✅ Variables para reset de contraseña
const showResetModal = ref(false)
const resetTarget = ref(null)
const resetForm = ref({ newPassword: '', confirmPassword: '' })
const resetting = ref(false)

function roleLabel(role) {
  const map = { Admin: 'Administrador', Seller: 'Vendedor', Partner: 'Socia' }
  return map[role] || role
}

function roleBadge(role) {
  const map = { Admin: 'badge-info', Seller: 'badge-success', Partner: 'badge-pink' }
  return map[role] || ''
}

async function loadUsers() {
  try {
    loading.value = true
    const res = await api.get('/User', { params: { includeInactive: showInactive.value } })
    users.value = res.data.data
  } catch {
    toast.show('Error al cargar los usuarios', 'error')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  form.value = { fullName: '', username: '', password: '', role: '' }
  showModal.value = true
}

async function saveUser() {
  try {
    saving.value = true
    await api.post('/User', form.value)
    toast.show('Usuario creado correctamente', 'success')
    showModal.value = false
    loadUsers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al crear el usuario', 'error')
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

function confirmToggleStatus(user) {
  const action = user.isActive ? 'desactivar' : 'activar'
  openConfirm(
    `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
    `¿Deseas ${action} al usuario "${user.fullName}"?`,
    () => toggleStatus(user)
  )
}

async function toggleStatus(user) {
  try {
    await api.patch(`/User/${user.id}/toggle-status`)
    toast.show(`Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`, 'success')
    loadUsers()
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al cambiar el estado', 'error')
  }
}

// ✅ Funciones para reset de contraseña
function openResetModal(user) {
  resetTarget.value = user
  resetForm.value = { newPassword: '', confirmPassword: '' }
  showResetModal.value = true
}

async function resetPassword() {
  if (!resetForm.value.newPassword || resetForm.value.newPassword.length < 6) {
    toast.show('La contraseña debe tener al menos 6 caracteres', 'warning')
    return
  }

  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    toast.show('Las contraseñas no coinciden', 'warning')
    return
  }

  try {
    resetting.value = true
    await api.patch(`/User/${resetTarget.value.id}/reset-password`, {
      newPassword: resetForm.value.newPassword,
      confirmPassword: resetForm.value.confirmPassword
    })
    toast.show(`Contraseña de "${resetTarget.value.fullName}" actualizada correctamente`, 'success')
    showResetModal.value = false
    resetForm.value = { newPassword: '', confirmPassword: '' }
  } catch (err) {
    toast.show(err.response?.data?.message || 'Error al resetear la contraseña', 'error')
  } finally {
    resetting.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.toggle-label input { width: 16px; height: 16px; cursor: pointer; }
.users-view { display: flex; flex-direction: column; gap: 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--color-text); }
.page-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.state-text { text-align: center; padding: 40px 0; color: var(--color-text-muted); font-size: 13px; }
.hint-text { font-size: 12px; color: var(--color-accent); margin-top: 6px; }

/* ✅ Estilos para modal de reset de contraseña */
.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  margin-right: 8px;
  transition: var(--transition);
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-icon:hover {
  background: var(--color-accent-light);
}

.reset-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  margin-bottom: 14px;
}

.reset-user-icon {
  font-size: 28px;
}

.reset-user-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.reset-user-role {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.reset-warning {
  background: #FFF8E1;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 12px;
  color: #856404;
  line-height: 1.5;
}

.error-hint {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: 4px;
}

.success-hint {
  font-size: 12px;
  color: var(--color-success);
  margin-top: 4px;
}
</style>
