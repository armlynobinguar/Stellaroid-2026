/**
 * - Local dev: `/api` → Vite proxy → http://localhost:4000
 * - Netlify: set `VITE_API_BASE_URL` at build time to your public API (https://…),
 *   so the browser calls the API directly (CORS must allow your Netlify URL).
 * - Optional: `_redirects` also proxies `/api` if the same URL is set at build.
 */
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  if (path.startsWith('http')) return path
  return API_BASE ? `${API_BASE}${path}` : path
}

function isProbablyHtml(body) {
  const s = String(body || '').trimStart()
  return s.startsWith('<!') || s.startsWith('<html')
}

async function parseJson(res) {
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    if (isProbablyHtml(text)) {
      data = {
        error:
          'The server returned HTML instead of JSON. On Netlify add build env VITE_API_BASE_URL=https://your-api-host ' +
            '(your Express URL, no trailing slash), redeploy, and set FRONTEND_URL on the API to this site’s URL for CORS. ' +
            'Locally run the API on port 4000.',
      }
    } else {
      data = { error: text || res.statusText }
    }
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText)
    err.response = { status: res.status, data }
    throw err
  }
  return data
}

export async function buildRegisterTx(body) {
  const res = await fetch(apiUrl('/api/certificates/build-register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJson(res)
  return data.xdr
}

export async function registerCertificate({ signedXdr, fileHash }) {
  const res = await fetch(apiUrl('/api/certificates/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXdr, fileHash }),
  })
  return parseJson(res)
}

export async function getCertsByOwner(owner) {
  const res = await fetch(
    apiUrl(`/api/certificates/owner/${encodeURIComponent(owner)}`),
  )
  return parseJson(res)
}

export async function getBalance(address) {
  const res = await fetch(
    apiUrl(`/api/wallet/balance/${encodeURIComponent(address)}`),
  )
  return parseJson(res)
}

export async function verifyCertificate(hash) {
  const clean = hash.replace(/^0x/i, '')
  const res = await fetch(
    apiUrl(`/api/certificates/verify/${encodeURIComponent(clean)}`),
  )
  return parseJson(res)
}

export async function buildPaymentTx(body) {
  const res = await fetch(apiUrl('/api/payments/build'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJson(res)
  return data.xdr
}

export async function submitPayment({ signedXdr }) {
  const res = await fetch(apiUrl('/api/payments/submit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXdr }),
  })
  return parseJson(res)
}

export async function getCertCount() {
  const res = await fetch(apiUrl('/api/certificates/count'))
  const data = await parseJson(res)
  return data.count
}
