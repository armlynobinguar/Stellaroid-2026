import { copyFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Netlify serves 404.html for misses; mirror built index so the SPA still loads. */
function spa404Html() {
  return {
    name: 'spa-404-html',
    closeBundle() {
      const dist = join(__dirname, 'dist')
      const index = join(dist, 'index.html')
      const notFound = join(dist, '404.html')
      if (existsSync(index)) copyFileSync(index, notFound)
    },
  }
}

export default defineConfig({
  plugins: [react(), spa404Html()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
