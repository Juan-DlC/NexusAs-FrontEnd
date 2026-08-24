<template>
  <div class="login-page">
    <img src="/Login_Def.jpeg" class="bg-img" alt="AS Accesorios" />
    <div class="bg-overlay"></div>

    <div class="login-card">
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="Usuario"
            :disabled="loading"
            required
          />
        </div>

        <div class="form-group" style="margin-bottom: 0">
          <div class="input-wrap">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="Contraseña"
              :disabled="loading"
              required
            />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword">
              {{ showPassword ? '◉' : '○' }}
            </button>
          </div>
        </div>

        <transition name="slide-error">
          <div v-if="error" class="error-msg">{{ error }}</div>
        </transition>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Ingresando...' : 'Ingresar' }}</span>
        </button>
      </form>
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
  z-index: 1;
}

.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 32px 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  animation: cardIn 0.5s ease;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 12px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #ede8e3;
  border-radius: 12px;
  font-size: 14px;
  color: #2c2018;
  background: #fafafa;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #c8956c;
  background: white;
  box-shadow: 0 0 0 3px rgba(200, 149, 108, 0.12);
}

.form-input::placeholder {
  color: #b0a49c;
}

.input-wrap {
  position: relative;
}
.input-wrap .form-input {
  padding-right: 42px;
}

.eye-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  color: #b0a49c;
  font-size: 13px;
  padding: 0;
  transition: color 0.2s;
}
.eye-btn:hover {
  color: #c8956c;
}

.error-msg {
  background: #ffebee;
  color: #c62828;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-top: 10px;
  border-left: 3px solid #c62828;
}

.btn-login {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: #c8956c;
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-login:hover:not(:disabled) {
  background: #b8845c;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(200, 149, 108, 0.35);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.slide-error-enter-active {
  transition: all 0.3s ease;
}
.slide-error-leave-active {
  transition: all 0.2s ease;
}
.slide-error-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.slide-error-leave-to {
  opacity: 0;
}
</style>
