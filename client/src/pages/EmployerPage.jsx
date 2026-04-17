import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { verifyCertificate, buildPaymentTx, submitPayment } from '../services/api'
import { truncateAddress, xlmToStroops } from '../services/utils'

const s = {
  page: { paddingTop: '88px', minHeight: '100vh' },
  inner: { maxWidth: 720, margin: '0 auto', padding: '2rem' },
  heading: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: 'var(--gold)',
    marginBottom: '0.5rem',
  },
  sub: { fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' },
  form: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  input: {
    background: 'var(--surface-2)',
    border: '1px solid rgba(245,200,66,0.2)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    padding: '0.75rem 1rem',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  btn: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    padding: '1rem',
    border: 'none',
    cursor: 'pointer',
    clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
  },
  verifyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.9rem 1rem',
    background: 'rgba(34,197,94,0.07)',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 },
  verifyText: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text)' },
}

export default function EmployerPage({ publicKey, signFn }) {
  const [certHash, setCertHash] = useState('')
  const [amount, setAmount] = useState('')
  const [verified, setVerified] = useState(null)
  const [checking, setChecking] = useState(false)
  const [paying, setPaying] = useState(false)
  const [txHash, setTxHash] = useState(null)

  async function checkCert() {
    if (!certHash.trim()) return toast.error('Enter a certificate hash')
    setChecking(true)
    setVerified(null)
    try {
      const r = await verifyCertificate(certHash.trim())
      setVerified(r)
      if (!r.valid) toast.error('Certificate not found on-chain')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function handlePay() {
    if (!publicKey) return toast.error('Connect your Freighter wallet')
    if (!verified?.valid) return toast.error('Verify the certificate first')
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid XLM amount')

    setPaying(true)
    try {
      const stroops = xlmToStroops(amount)
      const xdr = await buildPaymentTx({
        employer: publicKey,
        hash: certHash.trim().replace(/^0x/i, ''),
        amount: stroops,
      })
      const signed = await signFn(xdr)
      const res = await submitPayment({ signedXdr: signed })
      setTxHash(res.txHash)
      toast.success(`Paid ${amount} XLM to verified student!`)
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <motion.h1 style={s.heading} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          EMPLOYER PAYMENT
        </motion.h1>
        <p style={s.sub}>
          Verify a student&apos;s credential on-chain and release payment directly to their
          Stellar wallet — no manual document checks, no bank delays.
        </p>

        <motion.div style={s.form} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={s.label}>Step 1 — Certificate Hash</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                style={{ ...s.input, flex: 1 }}
                value={certHash}
                onChange={(e) => {
                  setCertHash(e.target.value)
                  setVerified(null)
                }}
                placeholder="64-char SHA-256 hex…"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--gold)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(245,200,66,0.2)'
                }}
              />
              <motion.button
                type="button"
                style={{
                  ...s.btn,
                  background: 'rgba(245,200,66,0.15)',
                  color: 'var(--gold)',
                  padding: '0 1.25rem',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(245,200,66,0.3)',
                }}
                onClick={checkCert}
                disabled={checking}
                whileTap={{ scale: 0.97 }}
              >
                {checking ? '…' : 'CHECK'}
              </motion.button>
            </div>
          </div>

          {verified?.valid && (
            <motion.div
              style={s.verifyRow}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div style={s.dot} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ ...s.verifyText, color: 'var(--green)', fontWeight: 600 }}>
                  ✓ Verified on Stellar
                </span>
                <span style={s.verifyText}>
                  Owner: {truncateAddress(verified.record?.owner, 8, 8)} &nbsp;·&nbsp;{' '}
                  {verified.record?.certId}
                </span>
              </div>
            </motion.div>
          )}

          {verified && !verified.valid && (
            <div
              style={{
                ...s.verifyRow,
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--red)' }}>
                ✗ No certificate found for this hash
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={s.label}>Step 2 — Payment Amount (XLM)</label>
            <input
              style={s.input}
              type="number"
              min="0"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 20"
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--gold)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(245,200,66,0.2)'
              }}
            />
          </div>

          <motion.button
            type="button"
            style={{
              ...s.btn,
              background: verified?.valid ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
              color: verified?.valid ? 'var(--void)' : 'var(--text-muted)',
              opacity: paying ? 0.6 : 1,
              cursor: verified?.valid ? 'pointer' : 'not-allowed',
            }}
            onClick={handlePay}
            disabled={paying || !verified?.valid}
            whileTap={verified?.valid ? { scale: 0.98 } : {}}
          >
            {paying ? 'SIGNING PAYMENT…' : `PAY ${amount || '0'} XLM TO VERIFIED STUDENT ✦`}
          </motion.button>

          {txHash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--green)',
                wordBreak: 'break-all',
                padding: '0.75rem',
                background: 'rgba(34,197,94,0.05)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              Payment submitted ✓
              <br />
              TX: {txHash}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
