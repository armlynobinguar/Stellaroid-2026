import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { verifyCertificate } from '../services/api'
import { hashFile, truncateAddress } from '../services/utils'

const s = {
  page: { paddingTop: '88px', minHeight: '100vh' },
  inner: { maxWidth: 700, margin: '0 auto', padding: '2rem' },
  heading: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: 'var(--gold)',
    marginBottom: '0.5rem',
  },
  sub: { fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' },
  box: {
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
    fontSize: '0.8rem',
    padding: '0.75rem 1rem',
    outline: 'none',
    width: '100%',
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
  dropZone: {
    border: '2px dashed rgba(245,200,66,0.2)',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' },
  line: { flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' },
}

function ResultCard({ result }) {
  if (!result) return null
  const valid = result.valid

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        border: `1px solid ${valid ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
        background: valid ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '2rem' }}>{valid ? '✅' : '❌'}</span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: valid ? 'var(--green)' : 'var(--red)',
              letterSpacing: '0.08em',
            }}
          >
            {valid ? 'CERTIFICATE VERIFIED' : 'CERTIFICATE NOT FOUND'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              marginTop: '0.2rem',
            }}
          >
            {valid
              ? 'This credential exists on the Stellar blockchain.'
              : 'No matching record found on-chain.'}
          </div>
        </div>
      </div>

      {valid && result.record && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Field label="Owner" value={truncateAddress(result.record.owner, 8, 8)} />
          <Field label="Issuer" value={truncateAddress(result.record.issuer, 8, 8)} />
          <Field label="Cert ID" value={result.record.certId} />
          <Field label="Rewarded" value={result.record.rewarded ? 'Yes ★' : 'No'} />
        </div>
      )}
    </motion.div>
  )
}

function Field({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.35rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

export default function VerifyPage() {
  const [hashInput, setHashInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleVerifyHash() {
    if (!hashInput.trim()) return toast.error('Enter a certificate hash')
    setLoading(true)
    setResult(null)
    try {
      const r = await verifyCertificate(hashInput.trim())
      setResult(r)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileVerify(e) {
    const f = e.target.files?.[0]
    if (!f) return
    toast.loading('Hashing file…', { id: 'hash' })
    const h = await hashFile(f)
    toast.dismiss('hash')
    setHashInput(h)
    setLoading(true)
    setResult(null)
    try {
      const r = await verifyCertificate(h)
      setResult(r)
      toast.success('Verification complete')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <motion.h1 style={s.heading} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          VERIFY CREDENTIAL
        </motion.h1>
        <p style={s.sub}>
          Anyone can verify a certificate instantly — no login required. Paste the certificate
          hash or upload the original document.
        </p>

        <div style={s.box}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={s.label}>Certificate Hash (SHA-256 hex)</label>
            <input
              style={s.input}
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="abcdef1234…"
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--gold)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(245,200,66,0.2)'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyHash()}
            />
          </div>

          <motion.button
            type="button"
            style={{ ...s.btn, background: 'var(--gold)', color: 'var(--void)', opacity: loading ? 0.6 : 1 }}
            onClick={handleVerifyHash}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'VERIFYING…' : 'VERIFY HASH ✦'}
          </motion.button>

          <div style={s.divider}>
            <div style={s.line} />
            <span>or verify by file</span>
            <div style={s.line} />
          </div>

          <label style={{ ...s.dropZone, display: 'block', cursor: 'pointer' }}>
            <input type="file" style={{ display: 'none' }} onChange={handleFileVerify} accept=".pdf,.png,.jpg,.jpeg" />
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>📂</span>
            Upload original document — hash is computed in-browser and verified on-chain
          </label>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <AnimatePresence mode="wait">
            {result && <ResultCard key={hashInput} result={result} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
