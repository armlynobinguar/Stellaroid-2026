import { useState, useCallback, useEffect } from 'react'
import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
} from '@stellar/freighter-api'
import { NETWORK_PASSPHRASE } from '../config/stellar.js'

async function readPublicKey() {
  const { address, error } = await getAddress()
  if (error) throw new Error(error.message || String(error))
  return address || null
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [networkMismatch, setNetworkMismatch] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const conn = await isConnected()
      if (conn.error || !conn.isConnected) {
        setPublicKey(null)
        return
      }
      const pk = await readPublicKey()
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
      const res = await requestAccess()
      if (res.error) {
        throw new Error(res.error.message || String(res.error))
      }
      if (!res.address) {
        throw new Error('Freighter did not return an address')
      }
      setPublicKey(res.address)
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
