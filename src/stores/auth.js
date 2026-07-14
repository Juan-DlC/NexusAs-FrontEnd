import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('nexusas_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('nexusas_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isSeller = computed(() => user.value?.role === 'Seller')
  const isPartner = computed(() => user.value?.role === 'Partner')

  async function login(username, password) {
    const response = await api.post('/Auth/login', { username, password })
    const data = response.data.data

    token.value = data.token
    user.value = {
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      expiration: data.expiration
    }

    localStorage.setItem('nexusas_token', data.token)
    localStorage.setItem('nexusas_user', JSON.stringify(user.value))

    return user.value
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('nexusas_token')
    localStorage.removeItem('nexusas_user')
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isSeller,
    isPartner,
    login,
    logout
  }
})
