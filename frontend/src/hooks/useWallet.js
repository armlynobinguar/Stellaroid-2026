import { useState, useCallback, useEffect } from 'react'
import {
  isConnected,
  getPublicKey,
  signTransaction,
  requestAccess,
} from '@stellar/freighter-api'
import { NETWORK_PASSPHRASE } from '../config/stellar.js'

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [networkMismatch, setNetworkMismatch] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const ok = await isConnected()
      if (!ok) {
        setPublicKey(null)
        return
      }
      const pk = await getPublicKey()
      setPublicKey(pk)
    } catch {
      setPublicKey(null)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    setNetworkMismatch(false)
    try {
      await requestAccess()
      const pk = await getPublicKey()
      setPublicKey(pk)
    } catch (e) {
      setError(e?.message || 'Could not connect to Freighter')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setError(null)
    setNetworkMismatch(false)
  }, [])

  const sign = useCallback(
    async (xdr) => {
      if (!publicKey) throw new Error('Wallet not connected')
      const { signedTxXdr, error: signErr } = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      })
      if (signErr) {
        if (
          String(signErr).toLowerCase().includes('network') ||
          String(signErr).toLowerCase().includes('passphrase')
        ) {
          setNetworkMismatch(true)
        }
        throw new Error(signErr.message || String(signErr))
      }
      return signedTxXdr
    },
    [publicKey],
  )

  return {
    publicKey,
    connecting,
    networkMismatch,
    error,
    connect,
    disconnect,
    sign,
    refresh,
  }
}
