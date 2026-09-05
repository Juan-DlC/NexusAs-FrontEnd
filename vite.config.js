import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5174,
    strictPort: true  
  },
  build: {
    // Optimización del build
    rollupOptions: {
      output: {
        // Code splitting manual para optimizar chunks
        manualChunks: (id) => {
          // Vendor principal (Vue ecosystem)
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue') || 
              id.includes('node_modules/pinia')) {
            return 'vendor-vue'
          }
          
          // Vendor secundario (axios)
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios'
          }
          
          // Componentes compartidos
          if (id.includes('/components/shared/')) {
            return 'components-shared'
          }
        }
      }
    },
    // Aumentar límite de advertencia de chunk size
    chunkSizeWarningLimit: 600
  }
})
