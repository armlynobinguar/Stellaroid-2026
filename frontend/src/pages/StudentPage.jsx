import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BeltBadge from '../components/BeltBadge'
import { getCertsByOwner, getBalance } from '../services/api'
import { truncateAddress } from '../services/utils'

const s = {
  page: { paddingTop: '88px', minHeight: '100vh', background: 'var(--void)' },
  inner: { maxWidth: 1100, margin: '0 auto', padding: '2rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '1.5rem',
    alignItems: 'start',
  },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.18em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  xlmBig: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 900,
    color: 'var(--gold)',
    letterSpacing: '0.05em',
  },
  heading: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    letterSpacing: '0.15em',
    color: 'var(--gold)',
    textTransform: 'uppercase',
    marginBottom: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    border: '1px dashed rgba(245,200,66,0.15)',
  },
  certCard: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  certLeft: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  certId: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--text)',
  },
  certHash: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    padding: '0.25rem 0.6rem',
    borderRadius: 2,
  },
  verifiedBadge: {
    background: 'rgba(34,197,94,0.15)',
    color: 'var(--green)',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  rewardedBadge: {
    background: 'rgba(245,200,66,0.12)',
    color: 'var(--gold)',
    border: '1px solid rgba(245,200,66,0.3)',
  },
  noWallet: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
  },
}

export default function StudentPage({ publicKey }) {
  const [certs, setCerts] = useState([])
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) return
    setLoading(true)
    Promise.all([
      getCertsByOwner(publicKey).then(setCerts).catch(() => setCerts([])),
      getBalance(publicKey)
        .then((d) => setBalance(d.xlm))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [publicKey])

  if (!publicKey) {
    return (
      <div style={s.page}>
        <div style={{ ...s.inner, ...s.noWallet }}>
          <span style={{ fontSize: '3rem' }}>✦</span>
          <p>Connect your Freighter wallet to view your credentials.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <motion.h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: 'var(--gold)',
            marginBottom: '1.5rem',
          }}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          STUDENT DASHBOARD
        </motion.h1>

        <div style={s.grid}>
          <div style={s.sidebar}>
            <motion.div
              style={s.card}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span style={s.label}>XLM Balance</span>
              <span style={s.xlmBig}>{balance !== null ? `${balance} XLM` : '—'}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                }}
              >
                {truncateAddress(publicKey, 6, 6)}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <BeltBadge certCount={certs.length} />
            </motion.div>

            <motion.div
              style={s.card}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span style={s.label}>Stats</span>
              <StatRow label="Total Credentials" value={certs.length} />
              <StatRow label="Rewarded" value={certs.filter((c) => c.rewarded).length} />
              <StatRow
                label="Pending Reward"
                value={certs.filter((c) => !c.rewarded).length}
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p style={s.heading}>My Credentials</p>

            {loading && <div style={s.emptyState}>Loading credentials…</div>}

            {!loading && certs.length === 0 && (
              <div style={s.emptyState}>
                No credentials found for this wallet.
                <br />
                Ask your institution to issue your first certificate.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <AnimatePresence>
                {certs.map((cert, i) => (
                  <motion.div
                    key={cert.hash}
                    style={s.certCard}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ borderColor: 'rgba(245,200,66,0.4)' }}
                  >
                    <div style={s.certLeft}>
                      <span style={s.certId}>{cert.certId}</span>
                      <span style={s.certHash}>{cert.hash?.slice(0, 24)}…</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Issued by {truncateAddress(cert.issuer)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        alignItems: 'flex-end',
                      }}
                    >
                      <span style={{ ...s.badge, ...s.verifiedBadge }}>✓ ON-CHAIN</span>
                      {cert.rewarded && (
                        <span style={{ ...s.badge, ...s.rewardedBadge }}>★ REWARDED</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.4rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--gold)',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}
