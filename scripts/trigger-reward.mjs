#!/usr/bin/env node
/**
 * Week 4 — POST /api/rewards/trigger (backend signs reward_student on Testnet).
 * Usage: npm run green-belt:week4:reward -- <64-char-sha256-hex>
 *        API_URL=http://localhost:4000 npm run green-belt:week4:reward -- abc...
 */

const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')
const hash = process.argv[2]

if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash.replace(/^0x/i, ''))) {
  console.error('Usage: npm run green-belt:week4:reward -- <64-char-certificate-hash-hex>')
  process.exit(1)
}

const clean = hash.replace(/^0x/i, '')

const res = await fetch(`${base}/api/rewards/trigger`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hash: clean }),
})

const text = await res.text()
let body
try {
  body = JSON.parse(text)
} catch {
  body = text
}

if (!res.ok) {
  console.error(res.status, body)
  process.exit(1)
}

console.log(body)
