import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Ruta pública — Login
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true }
    },

    // Rutas Admin
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'productos',
          name: 'products',
          component: () => import('@/views/admin/ProductsView.vue'),
          meta: { roles: ['Admin', 'Seller', 'Partner'] }
        },
        {
          path: 'categorias',
          name: 'categories',
          component: () => import('@/views/admin/CategoriesView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'proveedores',
          name: 'suppliers',
          component: () => import('@/views/admin/SuppliersView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'clientes',
          name: 'customers',
          component: () => import('@/views/admin/CustomersView.vue'),
          meta: { roles: ['Admin', 'Seller'] }
        },
        {
          path: 'ventas',
          name: 'sales',
          component: () => import('@/views/admin/SalesView.vue'),
          meta: { roles: ['Admin', 'Seller', 'Partner'] }
        },
        {
          path: 'creditos',
          name: 'credits',
          component: () => import('@/views/admin/CreditsView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'stock',
          name: 'stock',
          component: () => import('@/views/admin/StockView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'usuarios',
          name: 'users',
          component: () => import('@/views/admin/UsersView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'socias',
          name: 'partners',
          component: () => import('@/views/admin/PartnersView.vue'),
          meta: { roles: ['Admin'] }
        },
        {
          path: 'reportes',
          name: 'reports',
          component: () => import('@/views/admin/ReportsView.vue'),
          meta: { roles: ['Admin'] }
        },
        // Rutas Partner
        {
          path: 'mi-resumen',
          name: 'partner-summary',
          component: () => import('@/views/partner/PartnerSummaryView.vue'),
          meta: { roles: ['Partner'] }
        },
      ]
    },

    // Ruta 404
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Si intenta acceder a login estando autenticado, redirigir a home
  if (to.path === '/login' && auth.isAuthenticated) {
    const homeRoute = getHomeRoute(auth.user?.role)
    if (to.path !== homeRoute) {
      return homeRoute
    }
  }

  // Si intenta acceder a ruta protegida sin estar autenticado, redirigir a login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    if (to.path !== '/login') {
      return '/login'
    }
  }

  // Si intenta acceder a una ruta sin el rol adecuado, redirigir a home de su rol
  if (to.meta.roles && auth.user?.role && !to.meta.roles.includes(auth.user.role)) {
    const homeRoute = getHomeRoute(auth.user.role)
    if (to.path !== homeRoute) {
      return homeRoute
    }
  }

  // Permitir navegación
  return true
})

function getHomeRoute(role) {
  if (role === 'Partner') return '/mi-resumen'
  return '/'
}

export default router
