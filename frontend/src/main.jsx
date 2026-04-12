import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:system-ui;padding:2rem;color:#c00">Missing #root in index.html — rebuild the frontend (vite build).</p>'
  throw new Error('Missing #root')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
