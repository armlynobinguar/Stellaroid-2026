import { motion } from 'framer-motion'
import { BELT_LEVELS } from '../config/stellar'

function currentBelt(certCount) {
  let belt = BELT_LEVELS[0]
  for (const b of BELT_LEVELS) {
    if (certCount >= b.threshold) belt = b
  }
  return belt
}

function nextBelt(certCount) {
  for (const b of BELT_LEVELS) {
    if (certCount < b.threshold) return b
  }
  return null
}

export default function BeltBadge({ certCount }) {
  const belt = currentBelt(certCount)
  const next = nextBelt(certCount)
  const progress =
    next && next.threshold > belt.threshold
      ? Math.min(
          1,
          (certCount - belt.threshold) / (next.threshold - belt.threshold),
        )
      : 1

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        Belt rank
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <motion.span
          style={{ fontSize: '2rem' }}
          key={belt.id}
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
        >
          {belt.emoji}
        </motion.span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: belt.color,
            }}
          >
            {belt.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
            }}
          >
            {next
              ? `${certCount} / ${next.threshold} to ${next.label}`
              : 'Max rank'}
          </div>
        </div>
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--surface-2)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          style={{ height: '100%', background: 'var(--gold)' }}
        />
      </div>
    </div>
  )
}
