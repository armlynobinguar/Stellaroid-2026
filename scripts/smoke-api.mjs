#!/usr/bin/env node
/**
 * Week 4 — smoke test: public verify + cert count endpoints (API must be running).
 * Usage: npm run green-belt:week4:smoke
 *        API_URL=https://api.example.com npm run green-belt:week4:smoke
 */

const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')

async function main() {
  const health = await fetch(`${base}/health`)
  if (!health.ok) {
    console.error('GET /health failed:', health.status, await health.text())
    process.exit(1)
  }
  console.log('health:', await health.json())

  const countRes = await fetch(`${base}/api/certificates/count`)
  if (!countRes.ok) {
    console.error('GET /api/certificates/count failed:', countRes.status, await countRes.text())
    process.exit(1)
  }
  console.log('cert_count:', await countRes.json())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
