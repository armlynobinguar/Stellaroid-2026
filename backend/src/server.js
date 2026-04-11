import './load-env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import certificateRoutes from './routes/certificates.js'
import rewardRoutes from './routes/rewards.js'
import paymentRoutes from './routes/payments.js'
import walletRoutes from './routes/wallet.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import {
  requestBodyLogger,
  apiResponseLogger,
} from './middleware/requestLog.js'
import { logError } from './util/log.js'

const REQUIRED = ['CONTRACT_ID', 'BACKEND_SECRET']
const missing = REQUIRED.filter((k) => !String(process.env[k] ?? '').trim())
if (missing.length) {
  console.error(`\n❌  Missing or empty env vars: ${missing.join(', ')}`)
  console.error('   Edit backend/.env (copy from .env.example).')
  console.error(
    '   BACKEND_SECRET = funded Testnet Stellar secret key (S…), same family as `stellar keys` / deploy --source.',
  )
  console.error(
    '   Fund it: https://friendbot.stellar.org/?addr=<G...public>\n',
  )
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(morgan('dev'))
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '64kb' }))
app.use(requestBodyLogger)
app.use(apiResponseLogger)

process.on('unhandledRejection', (reason) => {
  logError('process.unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)))
})

process.on('uncaughtException', (err) => {
  logError('process.uncaughtException', err)
})

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
})
app.use('/api', limiter)

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests.' },
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    contract: process.env.CONTRACT_ID,
    network: process.env.NETWORK_PASSPHRASE || 'testnet',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/certificates', certificateRoutes)
app.use('/api/rewards', writeLimiter, rewardRoutes)
app.use('/api/payments', writeLimiter, paymentRoutes)
app.use('/api/wallet', walletRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`
  ✦ Stellaroid Earn API
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server  →  http://localhost:${PORT}
  Health  →  http://localhost:${PORT}/health
  Network →  ${process.env.NETWORK_PASSPHRASE || 'testnet'}
  Contract→  ${process.env.CONTRACT_ID}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})

export default app
