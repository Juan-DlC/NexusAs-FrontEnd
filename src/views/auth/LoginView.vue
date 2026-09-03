<template>
  <div class="login-page">
    <img src="/Login_Def.jpeg" class="bg-img" alt="AS Accesorios" />
    <div class="bg-overlay"></div>

    <div class="login-card">
      <div class="login-header">
        <!-- <div class="brand-logo">✦</div> -->
        <h1 class="login-title">NexusAs</h1>
        <p class="login-subtitle">Sistema de gestión AS Accesorios</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="input-label">Usuario</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input
              v-model="form.username"
              type="text"
              class="login-input"
              placeholder="Tu nombre de usuario"
              :disabled="loading"
              required
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="input-label">Contraseña</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="login-input"
              placeholder="Tu contraseña"
              :disabled="loading"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="eye-btn"
              @click="showPassword = !showPassword"
              :disabled="loading"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>

        <transition name="slide-error">
          <div v-if="error" class="error-msg">
            ⚠️ {{ error }}
          </div>
        </transition>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Ingresando...' : '→ Ingresar al sistema' }}</span>
        </button>
      </form>

      <div class="login-footer">
        NexusAs © {{ new Date().getFullYear() }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    const userData = await auth.login(form.value.username, form.value.password)

    // Redirigir según el rol del usuario
    if (userData.role === 'Partner') {
      router.push('/mi-resumen')
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Usuario o contraseña incorrectos.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1;
}

.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 40px 36px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(200, 149, 108, 0.1);
  animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand-logo {
  font-size: 32px;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.login-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
}

.form-group {
  margin-bottom: 18px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
  z-index: 1;
}

.login-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-white);
  transition: all 0.2s ease;
  font-family: inherit;
}

.login-input:focus {
  border-color: var(--color-accent);
  background: var(--color-white);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  outline: none;
}

.login-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.6;
}

.login-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg);
}

.eye-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 16px;
  padding: 6px;
  cursor: pointer;
  transition: var(--transition);
  z-index: 1;
}

.eye-btn:hover:not(:disabled) {
  color: var(--color-accent);
}

.eye-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.error-msg {
  background: #FFEBEE;
  color: var(--color-danger);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 16px;
  border-left: 3px solid var(--color-danger);
  line-height: 1.4;
}

.btn-login {
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  background: var(--color-accent);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(200, 149, 108, 0.3);
}

.btn-login:hover:not(:disabled) {
  background: #b8845c;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(200, 149, 108, 0.4);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--color-white);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-muted);
}

.slide-error-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-error-leave-active {
  transition: all 0.2s ease;
}
.slide-error-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.slide-error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
