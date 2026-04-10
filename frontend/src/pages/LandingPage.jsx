import { motion } from 'framer-motion'
import { BELT_LEVELS } from '../config/stellar'

const s = {
  page: { paddingTop: '64px', minHeight: '100vh', position: 'relative', overflow: 'hidden' },
  stars: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,200,66,0.06) 0%, transparent 70%)',
  },
  hero: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '6rem 2rem 4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1.5rem',
  },
  tag: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    color: 'var(--gold)',
    textTransform: 'uppercase',
    padding: '0.35rem 1rem',
    border: '1px solid rgba(245,200,66,0.3)',
    background: 'rgba(245,200,66,0.05)',
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2.2rem, 5vw, 4rem)',
    fontWeight: 900,
    letterSpacing: '0.06em',
    lineHeight: 1.1,
    background: 'linear-gradient(135deg, #F5C842 0%, #fff8dc 50%, #F5C842 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sub: {
    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
    color: 'var(--text-muted)',
    lineHeight: 1.8,
    maxWidth: 580,
  },
  ctaRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '0.5rem',
  },
  ctaPrimary: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '0.9rem 2rem',
    background: 'var(--gold)',
    color: 'var(--void)',
    border: 'none',
    cursor: 'pointer',
    clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
  },
  ctaSecondary: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    padding: '0.9rem 2rem',
    background: 'transparent',
    color: 'var(--gold)',
    border: '1px solid rgba(245,200,66,0.4)',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1px',
    background: 'rgba(245,200,66,0.12)',
    maxWidth: 600,
    width: '100%',
    marginTop: '2rem',
  },
  stat: {
    background: 'var(--void)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    fontWeight: 900,
    color: 'var(--gold)',
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  beltsSection: { maxWidth: 900, margin: '0 auto', padding: '0 2rem 5rem' },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    color: 'var(--gold)',
    textTransform: 'uppercase',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  beltGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1px',
    background: 'rgba(245,200,66,0.1)',
  },
  beltCard: {
    background: 'var(--surface)',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
    textAlign: 'center',
  },
  beltEmoji: { fontSize: '1.8rem' },
  beltName: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  beltThreshold: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function LandingPage({ onNav }) {
  return (
    <div style={s.page}>
      <div style={s.stars} />

      <motion.div
        style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: 'var(--gold)', top: '30%', left: '10%' }}
        animate={{ x: [0, 40, 0], y: [0, -20, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: 'var(--gold)', top: '55%', right: '12%' }}
        animate={{ x: [0, -30, 0], y: [0, 25, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, delay: 2 }}
      />

      <motion.div style={s.hero} variants={container} initial="hidden" animate="visible">
        <motion.span style={s.tag} variants={item}>
          ✦ Built on Stellar · Soroban Smart Contracts · SEA
        </motion.span>

        <motion.h1 style={s.h1} variants={item}>
          EARN YOUR CREDENTIALS
          <br />
          ON-CHAIN
        </motion.h1>

        <motion.p style={s.sub} variants={item}>
          Stellaroid Earn lets Philippine, Vietnamese, and Indonesian students anchor
          verified credentials on Stellar — and unlock XLM rewards, financial access,
          and direct employer payments.
        </motion.p>

        <motion.div style={s.ctaRow} variants={item}>
          <motion.button
            style={s.ctaPrimary}
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => onNav('student')}
          >
            VIEW MY CREDENTIALS
          </motion.button>
          <motion.button
            style={s.ctaSecondary}
            whileHover={{ background: 'rgba(245,200,66,0.06)' }}
            type="button"
            onClick={() => onNav('verify')}
          >
            VERIFY A CERTIFICATE
          </motion.button>
        </motion.div>

        <motion.div style={s.statsRow} variants={item}>
          {[
            ['3', 'Countries'],
            ['∞', 'Certs'],
            ['< 5s', 'Verify Time'],
          ].map(([n, l]) => (
            <div key={l} style={s.stat}>
              <span style={s.statNum}>{n}</span>
              <span style={s.statLabel}>{l}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <div style={s.beltsSection}>
        <p style={s.sectionTitle}>BELT PROGRESSION SYSTEM</p>
        <div style={s.beltGrid}>
          {BELT_LEVELS.map((belt, i) => (
            <motion.div
              key={belt.id}
              style={s.beltCard}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ background: 'var(--surface-2)' }}
            >
              <motion.span
                style={s.beltEmoji}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              >
                {belt.emoji}
              </motion.span>
              <span style={{ ...s.beltName, color: belt.color }}>{belt.label}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                {belt.description}
              </span>
              <span style={s.beltThreshold}>
                {belt.threshold === 0 ? 'Start here' : `${belt.threshold}+ certs`}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
