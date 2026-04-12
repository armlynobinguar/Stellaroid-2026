import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Writes dist/_redirects: optional /api proxy + SPA fallback; copies index → 404.html.
 * Primary API path: set VITE_API_BASE_URL at Netlify build so the client bundle calls the API directly.
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
        process.env.VITE_API_BASE_URL ||
          process.env.NETLIFY_API_ORIGIN ||
          '',
      ).replace(/\/$/, '')

      const onNetlifyProd =
        process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production'
      if (onNetlifyProd && !origin) {
        console.warn(
          '\n[vite] Netlify production: set VITE_API_BASE_URL (or NETLIFY_API_ORIGIN) so /api works. ' +
            'Build continues; live /api calls will fail until that env is set and you redeploy.\n',
        )
      }

      const lines = []
      if (origin) {
        lines.push(`/api/*\t${origin}/api/:splat\t200`)
        lines.push(`/health\t${origin}/health\t200`)
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
