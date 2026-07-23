<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">✦</div>
          <div class="logo-text">
            <span class="logo-name">NexusAs</span>
            <span class="logo-sub">AS Accesorios</span>
          </div>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <span>{{ sidebarCollapsed ? '→' : '←' }}</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        <template v-for="item in menuItems" :key="item.name">
          <div v-if="item.section && !sidebarCollapsed" class="nav-section">
            {{ item.section }}
          </div>
          <router-link
            v-if="item.path && canSee(item.roles)"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            :title="`${item.icon} ${item.label}`"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label" v-if="!sidebarCollapsed">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-details" v-if="!sidebarCollapsed">
            <p class="user-name">{{ auth.user?.fullName }}</p>
            <p class="user-role">{{ auth.user?.role }}</p>
          </div>
        </div>
        <button v-if="!sidebarCollapsed" class="logout-btn" @click="handleLogout">Salir</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <h1 class="page-title">{{ currentPageTitle }}</h1>
        <span class="topbar-date">{{ currentDate }}</span>
      </header>

      <div class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const sidebarCollapsed = ref(false)

const menuItems = [
  { section: 'Principal' },
  { name: 'dashboard', path: '/', label: 'Dashboard', icon: '📊', roles: ['Admin'] },
  {
    name: 'products',
    path: '/productos',
    label: 'Productos',
    icon: '👟',
    roles: ['Admin', 'Seller', 'Partner'],
  },
  { name: 'categories', path: '/categorias', label: 'Categorías', icon: '🏷️', roles: ['Admin'] },
  { name: 'suppliers', path: '/proveedores', label: 'Proveedores', icon: '📦', roles: ['Admin'] },
  { section: 'Ventas' },
  { name: 'customers', path: '/clientes', label: 'Clientes', icon: '👥', roles: ['Admin', 'Seller'] },
  { name: 'sales', path: '/ventas', label: 'Ventas', icon: '💰', roles: ['Admin', 'Seller', 'Partner'] },
  { name: 'credits', path: '/creditos', label: 'Créditos', icon: '💳', roles: ['Admin'] },
  { section: 'Gestión' },
  { name: 'stock', path: '/stock', label: 'Stock', icon: '📋', roles: ['Admin'] },
  { name: 'partners', path: '/socias', label: 'Socias', icon: '👩‍💼', roles: ['Admin'] },
  { name: 'users', path: '/usuarios', label: 'Usuarios', icon: '👤', roles: ['Admin'] },
  { name: 'reports', path: '/reportes', label: 'Reportes', icon: '📈', roles: ['Admin'] },
  { section: 'Mi cuenta' },
  { name: 'partner-summary', path: '/mi-resumen', label: 'Mi Resumen', icon: '💼', roles: ['Partner'] },
]

const pageTitles = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/proveedores': 'Proveedores',
  '/clientes': 'Clientes',
  '/ventas': 'Ventas',
  '/creditos': 'Créditos',
  '/stock': 'Control de Stock',
  '/socias': 'Socias Vendedoras',
  '/usuarios': 'Usuarios',
  '/reportes': 'Reportes',
  '/mi-resumen': 'Mi Resumen',
}

const currentPageTitle = computed(() => pageTitles[route.path] || 'NexusAs')
const userInitials = computed(() => {
  const name = auth.user?.fullName || ''
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})
const currentDate = computed(() =>
  new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
)

function canSee(roles) {
  return roles?.includes(auth.user?.role)
}

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 230px;
  min-width: 230px;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: var(--transition);
}

.sidebar-header {
  padding: 22px 18px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: var(--sidebar-accent);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.logo-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}

.logo-sub {
  display: block;
  font-size: 10px;
  color: var(--sidebar-accent);
  margin-top: 1px;
}

.collapse-btn {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}
.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 10px;
  overflow-y: auto;
}

.nav-section {
  font-size: 10px;
  font-weight: 600;
  color: var(--sidebar-section);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px 8px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--sidebar-text);
  transition: var(--transition);
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: white;
}

.nav-item.active {
  background: var(--sidebar-active);
  color: var(--sidebar-text-active);
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: var(--transition);
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-item:hover .nav-icon {
  opacity: 1;
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--sidebar-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: var(--sidebar-accent);
}

.logout-btn {
  width: 100%;
  padding: 8px;
  background: rgba(192, 57, 43, 0.12);
  color: #e57373;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transition: var(--transition);
}
.logout-btn:hover {
  background: rgba(192, 57, 43, 0.25);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
}

.topbar {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  padding: 0 28px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
}

.topbar-date {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
