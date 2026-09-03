<template>
  <div class="app-layout">
    <ToastNotification />
    <aside class="sidebar" :data-collapsed="sidebarCollapsed">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">✦</div>
          <div class="logo-text">
            <span class="logo-name">NexusAs</span>
            <span class="logo-sub">AS Accesorios</span>
          </div>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'">
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
import ToastNotification from '@/components/shared/ToastNotification.vue'

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
  { name: 'business-partners', path: '/socios', label: 'Socios Comerciales', icon: '🤝', roles: ['Admin'] },
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
  '/socios': 'Socios Comerciales',
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
  width: 240px;
  min-width: 240px;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 12px rgba(0,0,0,0.15);
}

.sidebar[data-collapsed="true"] {
  width: 70px;
  min-width: 70px;
}

.sidebar[data-collapsed="true"] .logo {
  justify-content: center;
}

.sidebar[data-collapsed="true"] .logo-text,
.sidebar[data-collapsed="true"] .nav-label,
.sidebar[data-collapsed="true"] .nav-section,
.sidebar[data-collapsed="true"] .user-details,
.sidebar[data-collapsed="true"] .logout-btn {
  display: none;
}

.sidebar-header {
  padding: 24px 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 8px;
}

.sidebar[data-collapsed="true"] .sidebar-header {
  flex-direction: column;
  align-items: center;
  padding: 20px 10px 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: justify-content 0.3s ease;
  width: 100%;
}

.logo-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(200,149,108,0.3);
}

.logo-text {
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.logo-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
}

.logo-sub {
  display: block;
  font-size: 11px;
  color: var(--sidebar-accent);
  margin-top: 2px;
}

.collapse-btn {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 14px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
}

.collapse-btn:hover {
  background: rgba(255,255,255,0.2);
  color: white;
  transform: scale(1.05);
  border-color: rgba(255,255,255,0.2);
}

.collapse-btn:active {
  transform: scale(0.95);
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
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  transition: var(--transition);
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: white;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(200,149,108,0.25), rgba(200,149,108,0.15));
  color: white;
  border: 1px solid rgba(200,149,108,0.3);
}

.nav-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.2s ease, visibility 0.2s ease;
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
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: var(--shadow-xs);
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.topbar-date {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: capitalize;
  background: var(--color-bg);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
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
