/**
 * Structured stderr logging. Set LOG_LEVEL=debug|info|warn|error (default: info).
 * Set LOG_REQUEST_BODY=1 to log sanitized JSON bodies on POST /api (dev only).
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }

function levelNum() {
  const n = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()]
  return n === undefined ? LEVELS.info : n
}

function ts() {
  return new Date().toISOString()
}

export function logError(tag, err, context = {}) {
  if (levelNum() < LEVELS.error) return
  const message = err?.message ?? String(err)
  console.error(`[${ts()}] [ERROR] [${tag}] ${message}`)
  if (context && Object.keys(context).length > 0) {
    console.error('  context:', JSON.stringify(context, null, 2))
  }
  if (err?.stack) {
    console.error(err.stack)
  }
}

export function logWarn(tag, message, context = {}) {
  if (levelNum() < LEVELS.warn) return
  console.warn(`[${ts()}] [WARN] [${tag}] ${message}`)
  if (context && Object.keys(context).length > 0) {
    console.warn('  context:', JSON.stringify(context, null, 2))
  }
}

export function logInfo(tag, message, context = {}) {
  if (levelNum() < LEVELS.info) return
  console.log(`[${ts()}] [INFO] [${tag}] ${message}`)
  if (context && Object.keys(context).length > 0) {
    console.log('  context:', JSON.stringify(context, null, 2))
  }
}

export function logDebug(tag, message, context = {}) {
  if (levelNum() < LEVELS.debug) return
  console.log(`[${ts()}] [DEBUG] [${tag}] ${message}`)
  if (context && Object.keys(context).length > 0) {
    console.log('  context:', JSON.stringify(context, null, 2))
  }
}

/** Redact long or sensitive fields for request logging */
export function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  const out = { ...body }
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase()
    if (
      lower.includes('secret') ||
      lower.includes('password') ||
      lower.includes('authorization')
    ) {
      out[key] = '[redacted]'
      continue
    }
    if (lower.includes('xdr') && typeof out[key] === 'string') {
      const s = out[key]
      out[key] = `[xdr ${s.length} chars]`
    }
  }
  return out
}
