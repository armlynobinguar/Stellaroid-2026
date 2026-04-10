/**
 * /api/wallet
 *
 * GET /balance/:address → XLM + token balances (Horizon)
 */

import { Router } from 'express'
import { Horizon } from '@stellar/stellar-sdk'
import { logError } from '../util/log.js'

const router = Router()
const horizon = new Horizon.Server(
  process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
)

router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params

    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Stellar address' })
    }

    const account = await horizon.loadAccount(address)

    const nativeBalance = account.balances.find((b) => b.asset_type === 'native')
    const xlm = nativeBalance ? nativeBalance.balance : '0'

    const tokens = account.balances
      .filter((b) => b.asset_type !== 'native')
      .map((b) => ({
        code: b.asset_code,
        issuer: b.asset_issuer,
        balance: b.balance,
      }))

    res.json({
      address,
      xlm,
      tokens,
      sequence: account.sequence,
    })
  } catch (err) {
    if (err?.response?.status === 404) {
      return res.json({
        address: req.params.address,
        xlm: '0',
        tokens: [],
        sequence: '0',
      })
    }
    logError('wallet.balance', err, {
      path: '/balance/:address',
      address: req.params.address,
    })
    res.status(500).json({ error: err.message })
  }
})

export default router
