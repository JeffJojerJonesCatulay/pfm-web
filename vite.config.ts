import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react()],
  envPrefix: ['VITE_', 'PFM_'],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: env.PFM_DNS_URL,
        changeOrigin: true,
        secure: false
      }
    }
    }
  }
})
