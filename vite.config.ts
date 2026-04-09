import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'PFM_'],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
