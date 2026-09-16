import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Prevenir cambio de valor con scroll en inputs numéricos globalmente
document.addEventListener('wheel', (e) => {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: true })
