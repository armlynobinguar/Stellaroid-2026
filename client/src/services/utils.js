async function sha256Buffer(buf) {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashFile(file) {
  const buf = await file.arrayBuffer()
  return sha256Buffer(buf)
}

export async function hashString(str) {
  const enc = new TextEncoder().encode(str)
  return sha256Buffer(enc)
}

export function truncateAddress(addr, start = 4, end = 4) {
  if (!addr || addr.length < start + end + 3) return addr || ''
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

const STROOPS_PER_XLM = 10_000_000n

export function stroopsToXlm(stroops) {
  const s = BigInt(stroops)
  const whole = s / STROOPS_PER_XLM
  const frac = s % STROOPS_PER_XLM
  if (frac === 0n) return whole.toString()
  const fracStr = (frac * 10n ** 7n / STROOPS_PER_XLM)
    .toString()
    .padStart(7, '0')
  return `${whole}.${fracStr}`.replace(/\.?0+$/, '')
}

export function xlmToStroops(xlmStr) {
  const n = Number(xlmStr)
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid XLM amount')
  return BigInt(Math.round(n * Number(STROOPS_PER_XLM))).toString()
}
