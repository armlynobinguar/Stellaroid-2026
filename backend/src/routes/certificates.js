/**
 * /api/certificates
 *
 * POST /build-register → unsigned XDR for register_certificate
 * POST /register      → submit Freighter-signed tx
 * GET  /verify/:hash  → verify_certificate (simulated read)
 * GET  /:hash         → get_certificate (simulated read)
 * GET  /owner/:owner  → certs for wallet (event scan + get_certificate)
 * GET  /count         → cert_count
 */

import { Router } from 'express'
import { logError } from '../util/log.js'
import {
  buildTx,
  submitSigned,
  readContract,
  parseCertRecord,
  parseGetCertificateResult,
  parseU64,
  parseResultBool,
  hexToScBytes32,
  addressToScVal,
  symbolToScVal,
  rpc,
  parseCertRegEventValue,
} from '../services/soroban.js'

const router = Router()

function validatePresent(fields) {
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') {
      throw new Error(`${k} is required`)
    }
  }
}

function validateStellarAddress(addr, name = 'address') {
  if (!/^G[A-Z2-7]{55}$/.test(addr)) {
    throw new Error(`Invalid Stellar address for ${name}`)
  }
}

function validateHash(hash) {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error('hash must be a 64-char hex string (SHA-256)')
  }
}

function validateCertId(certId) {
  if (!certId || certId.length > 32) {
    throw new Error('certId must be 1–32 characters')
  }
  if (!/^[A-Z0-9_]+$/.test(certId)) {
    throw new Error(
      'certId must be uppercase letters, digits, and underscores only',
    )
  }
}

router.post('/build-register', async (req, res) => {
  try {
    const { issuer, owner, certId, fileHash } = req.body || {}

    validatePresent({ issuer, owner, certId, fileHash })
    validateStellarAddress(issuer, 'issuer')
    validateStellarAddress(owner, 'owner')
    validateHash(fileHash)
    validateCertId(certId)

    const xdrStr = await buildTx(issuer, 'register_certificate', [
      addressToScVal(issuer),
      addressToScVal(owner),
      symbolToScVal(certId),
      hexToScBytes32(fileHash),
    ])

    res.json({ xdr: xdrStr })
  } catch (err) {
    const msg = err?.message || String(err)
    logError('certificates.build-register', err, { path: '/build-register' })
    res.status(400).json({ error: msg })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { signedXdr } = req.body || {}
    if (!signedXdr) throw new Error('signedXdr is required')

    const result = await submitSigned(signedXdr)
    const { fileHash } = req.body || {}

    res.json({
      success: true,
      txHash: result.txHash,
      certHash: fileHash || null,
    })
  } catch (err) {
    const msg = err?.message || String(err)
    logError('certificates.register', err, { path: '/register' })
    res.status(500).json({ error: msg })
  }
})

router.get('/count', async (req, res) => {
  try {
    const retval = await readContract('cert_count', [])
    res.json({ count: parseU64(retval) })
  } catch (err) {
    logError('certificates.count', err, { path: '/count' })
    res.status(500).json({ error: err.message })
  }
})

router.get('/verify/:hash', async (req, res) => {
  try {
    const { hash } = req.params
    validateHash(hash)

    const retval = await readContract('verify_certificate', [
      hexToScBytes32(hash),
    ])
    const valid = parseResultBool(retval)

    let record = null
    if (valid) {
      try {
        const recVal = await readContract('get_certificate', [
          hexToScBytes32(hash),
        ])
        const parsed = parseGetCertificateResult(recVal)
        record = parsed.record || parseCertRecord(recVal)
      } catch {
        // best-effort
      }
    }

    res.json({ valid, record })
  } catch (err) {
    logError('certificates.verify', err, {
      path: '/verify/:hash',
      hash: req.params.hash,
    })
    res.status(400).json({ error: err.message })
  }
})

router.get('/owner/:owner', async (req, res) => {
  try {
    const { owner } = req.params
    validateStellarAddress(owner, 'owner')

    const CONTRACT_ID = process.env.CONTRACT_ID
    const latest = await rpc.getLatestLedger()
    const startLedger = Math.max(1, latest.sequence - 1000)

    const { events } = await rpc.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [CONTRACT_ID],
        },
      ],
      limit: 200,
    })

    const certs = []
    const seen = new Set()
    const ownerLower = owner.toLowerCase()

    for (const event of events || []) {
      if (!event.inSuccessfulContractCall) continue

      const parsed = parseCertRegEventValue(event.value)
      if (!parsed || parsed.owner.toLowerCase() !== ownerLower) continue
      if (seen.has(parsed.hashHex)) continue
      seen.add(parsed.hashHex)

      try {
        const recVal = await readContract('get_certificate', [
          hexToScBytes32(parsed.hashHex),
        ])
        const full = parseGetCertificateResult(recVal)
        const record =
          full.record ||
          parseCertRecord(recVal) || {
            owner: parsed.owner,
            certId: parsed.certId,
            hash: parsed.hashHex,
          }
        if (record && String(record.owner).toLowerCase() === ownerLower) {
          certs.push(record)
        }
      } catch {
        // skip
      }
    }

    res.json(certs)
  } catch (err) {
    logError('certificates.owner', err, {
      path: '/owner/:owner',
      owner: req.params.owner,
    })
    res.status(500).json({ error: err.message })
  }
})

router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params
    validateHash(hash)

    const retval = await readContract('get_certificate', [hexToScBytes32(hash)])
    const parsed = parseGetCertificateResult(retval)
    const record = parsed.record || parseCertRecord(retval)

    if (!record) {
      return res.status(404).json({ error: 'Certificate not found' })
    }
    res.json(record)
  } catch (err) {
    const status = err.message?.includes('not found') ? 404 : 400
    if (status !== 404) {
      logError('certificates.get', err, {
        path: '/:hash',
        hash: req.params.hash,
      })
    }
    res.status(status).json({ error: err.message })
  }
})

export default router
