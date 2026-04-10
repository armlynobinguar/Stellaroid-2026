/**
 * /api/payments
 *
 * POST /build   → unsigned XDR for link_payment
 * POST /submit  → submit Freighter-signed XDR
 */

import { Router } from 'express'
import { logError } from '../util/log.js'
import {
  buildTx,
  submitSigned,
  hexToScBytes32,
  addressToScVal,
  i128ToScVal,
  XLM_SAC,
} from '../services/soroban.js'

const router = Router()

router.post('/build', async (req, res) => {
  try {
    const { employer, hash, amount } = req.body || {}

    if (!employer) throw new Error('employer address is required')
    if (!hash) throw new Error('hash is required')
    if (!amount) throw new Error('amount (stroops) is required')
    validateStellarAddress(employer, 'employer')
    validateHash(hash)

    const stroops = BigInt(amount)
    if (stroops <= 0n) throw new Error('amount must be positive')

    if (!XLM_SAC) throw new Error('XLM_SAC not configured in .env')

    const xdrStr = await buildTx(employer, 'link_payment', [
      addressToScVal(employer),
      addressToScVal(XLM_SAC),
      hexToScBytes32(hash),
      i128ToScVal(stroops),
    ])

    res.json({ xdr: xdrStr })
  } catch (err) {
    logError('payments.build', err, { path: '/build' })
    res.status(400).json({ error: err.message })
  }
})

router.post('/submit', async (req, res) => {
  try {
    const { signedXdr } = req.body || {}
    if (!signedXdr) throw new Error('signedXdr is required')

    const result = await submitSigned(signedXdr)

    res.json({
      success: true,
      txHash: result.txHash,
    })
  } catch (err) {
    logError('payments.submit', err, { path: '/submit' })

    const msg = err.message || ''
    if (msg.includes('CertificateNotFound')) {
      return res.status(404).json({
        error: 'Certificate not found — cannot release payment.',
      })
    }

    res.status(500).json({ error: msg })
  }
})

function validateStellarAddress(addr, name = 'address') {
  if (!/^G[A-Z2-7]{55}$/.test(addr)) {
    throw new Error(`Invalid Stellar address for ${name}`)
  }
}

function validateHash(hash) {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error('hash must be 64 hex chars')
  }
}

export default router
