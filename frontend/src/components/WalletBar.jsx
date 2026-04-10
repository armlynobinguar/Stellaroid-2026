const bar = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1.25rem',
  background: 'rgba(10,11,16,0.92)',
  borderBottom: '1px solid var(--border)',
  backdropFilter: 'blur(10px)',
}

const navBtn = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.12em',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '0.35rem 0.6rem',
}

const connectBtn = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '0.55rem 1rem',
  background: 'var(--gold)',
  color: 'var(--void)',
  border: 'none',
  cursor: 'pointer',
  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
}

export default function WalletBar({
  publicKey,
  connecting,
  networkMismatch,
  error,
  onConnect,
  onDisconnect,
  onNav,
}) {
  return (
    <header style={bar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          style={{ ...navBtn, color: 'var(--gold)', fontWeight: 700 }}
          onClick={() => onNav('home')}
        >
          STELLAROID
        </button>
        <nav style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          <button type="button" style={navBtn} onClick={() => onNav('student')}>
            STUDENT
          </button>
          <button type="button" style={navBtn} onClick={() => onNav('issuer')}>
            ISSUER
          </button>
          <button type="button" style={navBtn} onClick={() => onNav('employer')}>
            EMPLOYER
          </button>
          <button type="button" style={navBtn} onClick={() => onNav('verify')}>
            VERIFY
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {networkMismatch && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--red)',
            }}
          >
            Wrong network
          </span>
        )}
        {error && !publicKey && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--red)',
              maxWidth: 180,
            }}
            title={error}
          >
            {error.slice(0, 40)}
            {error.length > 40 ? '…' : ''}
          </span>
        )}
        {publicKey ? (
          <>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
              }}
            >
              {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
            </span>
            <button
              type="button"
              style={{ ...connectBtn, background: 'transparent', color: 'var(--gold)', border: '1px solid rgba(245,200,66,0.35)' }}
              onClick={onDisconnect}
            >
              DISCONNECT
            </button>
          </>
        ) : (
          <button
            type="button"
            style={{ ...connectBtn, opacity: connecting ? 0.7 : 1 }}
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? '…' : 'CONNECT FREIGHTER'}
          </button>
        )}
      </div>
    </header>
  )
}
