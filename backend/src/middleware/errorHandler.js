import { logError } from '../util/log.js'

export function notFound(req, res) {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  })
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500
  const message = err.message || 'Internal server error'

  if (status >= 500) {
    logError('express.errorHandler', err, {
      method: req.method,
      path: req.originalUrl,
    })
  }

  res.status(status).json({
    error: message,
    ...(err.details && { details: err.details }),
  })
}
