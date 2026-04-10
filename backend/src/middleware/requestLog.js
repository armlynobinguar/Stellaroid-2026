import { logDebug, logWarn, sanitizeBody } from '../util/log.js'

/**
 * After express.json — optionally log POST bodies (LOG_REQUEST_BODY=1).
 * Logs API responses with status >= 400 (LOG_API_ERRORS=1, default on).
 */
export function requestBodyLogger(req, res, next) {
  if (process.env.LOG_REQUEST_BODY !== '1') {
    return next()
  }
  if (req.method === 'POST' && req.path?.startsWith('/api')) {
    logDebug('http.body', `${req.method} ${req.originalUrl}`, {
      body: sanitizeBody(req.body),
    })
  }
  next()
}

export function apiResponseLogger(req, res, next) {
  if (process.env.LOG_API_ERRORS === '0') {
    return next()
  }
  if (!req.originalUrl?.startsWith('/api')) {
    return next()
  }
  const start = Date.now()
  const origJson = res.json.bind(res)
  res.json = function logAwareJson(payload) {
    const ms = Date.now() - start
    const code = res.statusCode
    const log4xx = process.env.LOG_HTTP_4XX === '1'
    if (code >= 500 || (log4xx && code >= 400)) {
      logWarn('http.response', `${req.method} ${req.originalUrl} → ${code} (${ms}ms)`, {
        status: code,
        payload: typeof payload === 'object' ? payload : String(payload),
      })
    }
    return origJson(payload)
  }
  next()
}
