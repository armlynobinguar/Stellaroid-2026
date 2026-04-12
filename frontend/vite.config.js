import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Netlify has no Node server: /api/* must be rewritten to your Express host.
 * Set NETLIFY_API_ORIGIN or VITE_API_BASE_URL in Netlify → Environment (no trailing slash).
 * Also copies index → 404.html and writes _redirects (SPA fallback last).
 */
function netlifyDistExtras() {
  return {
    name: 'netlify-dist-extras',
    closeBundle() {
      const dist = join(__dirname, 'dist')
      const index = join(dist, 'index.html')
      const notFound = join(dist, '404.html')
      if (existsSync(index)) copyFileSync(index, notFound)

      const origin = String(
        process.env.NETLIFY_API_ORIGIN ||
          process.env.VITE_API_BASE_URL ||
          '',
      ).replace(/\/$/, '')

      const lines = []
      if (origin) {
        lines.push(`/api/*\t${origin}/api/:splat\t200`)
        lines.push(`/health\t${origin}/health\t200`)
      } else if (process.env.NETLIFY === 'true') {
        console.warn(
          '\n[vite] Netlify build: set NETLIFY_API_ORIGIN (or VITE_API_BASE_URL) to your Express API URL.\n' +
            '    Without it, /api/* returns Netlify’s HTML 404 while the SPA still loads.\n',
        )
      }
      lines.push(`/*\t/index.html\t200`)
      writeFileSync(join(dist, '_redirects'), `${lines.join('\n')}\n`, 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [react(), netlifyDistExtras()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
