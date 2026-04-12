/**
 * Same-origin `/api/*` in dev (Vite proxy → localhost) and on Netlify (rewrite in
 * built `_redirects` → set NETLIFY_API_ORIGIN or VITE_API_BASE_URL at build time).
 */
async function parseJson(res) {
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: text || res.statusText }
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText)
    err.response = { status: res.status, data }
    throw err
  }
  return data
}

export async function buildRegisterTx(body) {
  const res = await fetch('/api/certificates/build-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJson(res)
  return data.xdr
}

export async function registerCertificate({ signedXdr, fileHash }) {
  const res = await fetch('/api/certificates/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXdr, fileHash }),
  })
  return parseJson(res)
}

export async function getCertsByOwner(owner) {
  const res = await fetch(
    `/api/certificates/owner/${encodeURIComponent(owner)}`,
  )
  return parseJson(res)
}

export async function getBalance(address) {
  const res = await fetch(
    `/api/wallet/balance/${encodeURIComponent(address)}`,
  )
  return parseJson(res)
}

export async function verifyCertificate(hash) {
  const clean = hash.replace(/^0x/i, '')
  const res = await fetch(
    `/api/certificates/verify/${encodeURIComponent(clean)}`,
  )
  return parseJson(res)
}

export async function buildPaymentTx(body) {
  const res = await fetch('/api/payments/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJson(res)
  return data.xdr
}

export async function submitPayment({ signedXdr }) {
  const res = await fetch('/api/payments/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXdr }),
  })
  return parseJson(res)
}

export async function getCertCount() {
  const res = await fetch('/api/certificates/count')
  const data = await parseJson(res)
  return data.count
}
