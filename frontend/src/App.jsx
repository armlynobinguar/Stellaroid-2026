import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import WalletBar from './components/WalletBar'
import LandingPage from './pages/LandingPage'
import StudentPage from './pages/StudentPage'
import IssuerPage from './pages/IssuerPage'
import EmployerPage from './pages/EmployerPage'
import VerifyPage from './pages/VerifyPage'
import { useWallet } from './hooks/useWallet'

export default function App() {
  const { publicKey, connecting, networkMismatch, error, connect, disconnect, sign } =
    useWallet()
  const [page, setPage] = useState('home')

  function renderPage() {
    switch (page) {
      case 'student':
        return <StudentPage publicKey={publicKey} />
      case 'issuer':
        return <IssuerPage publicKey={publicKey} signFn={sign} />
      case 'employer':
        return <EmployerPage publicKey={publicKey} signFn={sign} />
      case 'verify':
        return <VerifyPage />
      default:
        return <LandingPage onNav={setPage} />
    }
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid rgba(245,200,66,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
          },
          success: {
            iconTheme: { primary: 'var(--green)', secondary: 'var(--void)' },
          },
          error: {
            iconTheme: { primary: 'var(--red)', secondary: 'var(--void)' },
          },
        }}
      />

      <WalletBar
        publicKey={publicKey}
        connecting={connecting}
        networkMismatch={networkMismatch}
        error={error}
        onConnect={connect}
        onDisconnect={disconnect}
        onNav={setPage}
      />

      {renderPage()}
    </>
  )
}
