import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { hashFile } from '../services/utils'
import { buildRegisterTx, registerCertificate } from '../services/api'

const s = {
  page: { paddingTop: '88px', minHeight: '100vh' },
  inner: { maxWidth: 760, margin: '0 auto', padding: '2rem' },
  heading: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: 'var(--gold)',
    marginBottom: '0.5rem',
  },
  sub: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '2rem',
    lineHeight: 1.7,
  },
  form: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
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
  dropZone: {
    border: '2px dashed rgba(245,200,66,0.2)',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
  },
  hashPreview: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    color: 'var(--gold)',
    background: 'rgba(245,200,66,0.06)',
    padding: '0.75rem 1rem',
    wordBreak: 'break-all',
    border: '1px solid rgba(245,200,66,0.15)',
  },
  submitBtn: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    padding: '1rem',
    background: 'var(--gold)',
    color: 'var(--void)',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
    transition: 'opacity 0.2s',
  },
  success: {
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.3)',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  successTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    color: 'var(--green)',
    letterSpacing: '0.1em',
  },
}

export default function IssuerPage({ publicKey, signFn }) {
  const [owner, setOwner] = useState('')
  const [certId, setCertId] = useState('')
  const [file, setFile] = useState(null)
  const [hash, setHash] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleFileDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (!f) return
    setFile(f)
    const h = await hashFile(f)
    setHash(h)
    toast.success('File hashed — ready to register')
  }

  async function handleSubmit() {
    if (!publicKey) return toast.error('Connect your Freighter wallet first')
    if (!owner || !certId || !hash) return toast.error('Fill in all fields')

    setLoading(true)
    try {
      const xdr = await buildRegisterTx({
        issuer: publicKey,
        owner,
        certId,
        fileHash: hash,
      })
      const signedXdr = await signFn(xdr)
      const res = await registerCertificate({ signedXdr, fileHash: hash })
      setResult(res)
      toast.success('Certificate registered on-chain!')
    } catch (err) {
      const apiMsg = err?.response?.data?.error
      toast.error(apiMsg || err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <motion.h1 style={s.heading} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          ISSUE CREDENTIAL
        </motion.h1>
        <p style={s.sub}>
          Register a tamper-proof certificate on Stellar. The document hash is anchored to
          the student&apos;s wallet — permanent and verifiable by anyone.
        </p>

        {result ? (
          <motion.div
            style={s.success}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span style={s.successTitle}>✦ CERTIFICATE REGISTERED ON-CHAIN</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              TX: {result.txHash}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Hash: {result.certHash?.slice(0, 40)}…
            </span>
            <button
              type="button"
              style={{ ...s.submitBtn, marginTop: '0.5rem', padding: '0.7rem' }}
              onClick={() => {
                setResult(null)
                setHash('')
                setFile(null)
                setOwner('')
                setCertId('')
              }}
            >
              Issue Another
            </button>
          </motion.div>
        ) : (
          <motion.div
            style={s.form}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div style={s.fieldGroup}>
              <label style={s.label}>Issuer Wallet (you)</label>
              <div style={{ ...s.input, color: 'var(--text-muted)', opacity: 0.7 }}>
                {publicKey || 'Connect wallet…'}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Student Wallet Address</label>
              <input
                style={s.input}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="G…"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--gold)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(245,200,66,0.2)'
                }}
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Certificate ID</label>
              <input
                style={s.input}
                value={certId}
                onChange={(e) =>
                  setCertId(e.target.value.toUpperCase().replace(/\s/g, '_').slice(0, 32))
                }
                placeholder="e.g. CS_THESIS_2025"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--gold)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(245,200,66,0.2)'
                }}
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Certificate Document (PDF / Image)</label>
              <div
                style={{ ...s.dropZone, borderColor: dragging ? 'var(--gold)' : undefined }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('fileInput')?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  id="fileInput"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileDrop}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <span style={{ fontSize: '2rem' }}>📄</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {file ? file.name : 'Drop certificate file here or click to browse'}
                </span>
                {file && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: 'var(--green)',
                    }}
                  >
                    SHA-256 computed ✓
                  </span>
                )}
              </div>
            </div>

            {hash && (
              <div style={s.fieldGroup}>
                <label style={s.label}>Document Hash (SHA-256)</label>
                <div style={s.hashPreview}>{hash}</div>
              </div>
            )}

            <motion.button
              type="button"
              style={{ ...s.submitBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'SIGNING & SUBMITTING…' : 'REGISTER ON-CHAIN ✦'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
