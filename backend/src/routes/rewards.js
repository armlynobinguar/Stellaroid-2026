/**
 * /api/rewards
 *
 * POST /trigger → backend signs and submits reward_student()
 */

import { Router } from 'express'
import { logError } from '../util/log.js'
import {
  buildTx,
  signAndSubmit,
  hexToScBytes32,
  addressToScVal,
  i128ToScVal,
  getBackendKeypair,
  XLM_SAC,
} from '../services/soroban.js'

const router = Router()

const DEFAULT_REWARD_STROOPS = BigInt(process.env.REWARD_STROOPS || 50_000_000)

router.post('/trigger', async (req, res) => {
  try {
    const { hash } = req.body || {}
    if (!hash) throw new Error('hash is required')
    validateHash(hash)

    if (!XLM_SAC) throw new Error('XLM_SAC not configured in .env')

    const backendKp = getBackendKeypair()

    const xdrStr = await buildTx(backendKp.publicKey(), 'reward_student', [
      addressToScVal(XLM_SAC),
      hexToScBytes32(hash),
      i128ToScVal(DEFAULT_REWARD_STROOPS),
    ])

    const result = await signAndSubmit(xdrStr)

    res.json({
      success: true,
      txHash: result.txHash,
      reward: DEFAULT_REWARD_STROOPS.toString(),
      unit: 'stroops',
      xlm: (Number(DEFAULT_REWARD_STROOPS) / 10_000_000).toFixed(7),
    })
  } catch (err) {
    logError('rewards.trigger', err, { path: '/trigger' })

    const msg = err.message || ''
    if (msg.includes('AlreadyRewarded')) {
      return res.status(409).json({
        error: 'Student has already been rewarded for this certificate.',
      })
    }
    if (msg.includes('CertificateNotFound')) {
      return res.status(404).json({ error: 'Certificate not found on-chain.' })
    }

    res.status(500).json({ error: msg })
  }
})

function validateHash(hash) {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error('hash must be 64 hex chars')
  }
}

export default router
