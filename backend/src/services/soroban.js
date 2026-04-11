import {
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  Contract,
  nativeToScVal,
  Address,
  xdr,
} from '@stellar/stellar-sdk'

const RPC_URL = process.env.SOROBAN_RPC || 'https://soroban-testnet.stellar.org'
const NETWORK_PASS =
  process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015'
const XLM_SAC =
  process.env.XLM_SAC ||
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'

export const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false })

/** Lazily built so importing this module does not throw before server.js validates env. */
let _contract
export function getContract() {
  const id = process.env.CONTRACT_ID?.trim()
  if (!id) throw new Error('CONTRACT_ID is not set in .env')
  if (!_contract) _contract = new Contract(id)
  return _contract
}

export function getBackendKeypair() {
  const secret = String(process.env.BACKEND_SECRET ?? '').trim()
  if (!secret) throw new Error('BACKEND_SECRET not set in .env')
  return Keypair.fromSecret(secret)
}

export function hexToScBytes32(hexStr) {
  const clean = hexStr.replace(/^0x/i, '')
  if (clean.length !== 64) {
    throw new Error(`Hash must be 64 hex chars, got ${clean.length}`)
  }
  const bytes = Buffer.from(clean, 'hex')
  return xdr.ScVal.scvBytes(bytes)
}

export function addressToScVal(addr) {
  return new Address(addr).toScVal()
}

export function symbolToScVal(str) {
  return xdr.ScVal.scvSymbol(str)
}

export function i128ToScVal(value) {
  return nativeToScVal(BigInt(value), { type: 'i128' })
}

function assertNoRestore(sim) {
  if (SorobanRpc.Api.isSimulationRestore(sim)) {
    throw new Error(
      'A ledger entry needs restoration before this call can succeed. Fund and run a restore transaction first.',
    )
  }
}

/** StellaroidEarn `ContractError` variants from `src/lib.rs` (simulation HostError text). */
function explainContractSimulationError(message) {
  if (!message || typeof message !== 'string') return message
  const hints = {
    1: 'DuplicateCertificate — this SHA-256 hash is already registered on this contract. Use a new file/hash or a different contract id.',
    2: 'CertificateNotFound — no record for that hash.',
    3: 'TamperDetected — stored hash mismatch.',
    4: 'AlreadyRewarded — reward was already claimed for this certificate.',
    5: 'Unauthorized — caller is not the certificate owner.',
  }
  const m = message.match(/Error\(Contract,\s*#(\d+)\)/)
  if (m) {
    const hint = hints[Number(m[1])]
    if (hint) return `${message} → ${hint}`
  }
  return message
}

export async function buildTx(sourceAddress, method, args) {
  let account
  try {
    account = await rpc.getAccount(sourceAddress)
  } catch (e) {
    const hint = e?.message || String(e)
    throw new Error(
      `Issuer account not found on this network (${hint}). ` +
        'Open the issuer address in Freighter on Testnet and fund it with Friendbot so it exists before registering.',
    )
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASS,
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(300)
    .build()

  let simResult
  try {
    simResult = await rpc.simulateTransaction(tx)
  } catch (e) {
    throw new Error(`RPC simulateTransaction failed: ${e?.message || String(e)}`)
  }

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    const detail = explainContractSimulationError(simResult.error)
    throw new Error(`Simulation failed: ${detail}`)
  }
  assertNoRestore(simResult)

  let preparedTx
  try {
    preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build()
  } catch (e) {
    throw new Error(`assembleTransaction failed: ${e?.message || String(e)}`)
  }
  return preparedTx.toXDR()
}

export async function signAndSubmit(xdrStr) {
  const kp = getBackendKeypair()
  const tx = TransactionBuilder.fromXDR(xdrStr, NETWORK_PASS)
  tx.sign(kp)
  return submitSigned(tx.toXDR())
}

export async function submitSigned(signedXdr) {
  let tx
  try {
    tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASS)
  } catch (e) {
    throw new Error(
      `Invalid signed transaction XDR or wrong NETWORK_PASSPHRASE in backend/.env (must match Freighter, usually "Test SDF Network ; September 2015" on Testnet): ${e?.message || String(e)}`,
    )
  }

  const send = await rpc.sendTransaction(tx)

  if (send.status === 'ERROR') {
    let detail = 'unknown'
    try {
      detail = send.errorResult?.result?.()?.toString?.() || send.errorResult?.toString?.() || detail
    } catch {
      /* ignore */
    }
    throw new Error(`Submit error: ${detail}`)
  }

  const txHash = send.hash
  let getResult
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    try {
      getResult = await rpc.getTransaction(txHash)
    } catch (e) {
      const msg = e?.message || String(e)
      // SDK <14 cannot parse Protocol 23+ TransactionMeta (see stellar/js-stellar-sdk#1185).
      if (/Bad union switch/i.test(msg)) {
        throw new Error(
          'Soroban RPC returned transaction metadata this SDK cannot parse (usually fixed by ' +
            '`cd backend && npm install` so @stellar/stellar-sdk is v14+. ' +
            `Detail: ${msg}`,
        )
      }
      throw e
    }
    if (getResult.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) break
  }

  if (!getResult || getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    throw new Error(`Transaction not found after submit: ${txHash}`)
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    let why = txHash
    try {
      if (getResult.resultXdr) why += ` — ${getResult.resultXdr.toString?.() || ''}`
    } catch {
      /* ignore */
    }
    throw new Error(`Transaction failed on-chain: ${why}`)
  }

  return {
    txHash,
    resultXdr: getResult.returnValue?.toXDR?.('base64') ?? null,
  }
}

export async function readContract(method, args) {
  const kp = getBackendKeypair()
  const account = await rpc.getAccount(kp.publicKey())
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASS,
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(60)
    .build()

  const sim = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Read simulation failed: ${sim.error}`)
  }
  assertNoRestore(sim)

  return sim.result?.retval ?? null
}

/** Result<bool, E> or bare bool from verify_certificate simulation. */
export function parseResultBool(scVal) {
  if (!scVal) return false
  if (scVal.switch().name === 'scvBool') return scVal.b()

  if (scVal.switch().name === 'scvVec') {
    const items = scVal.vec()
    if (!items?.length) return false
    const tag = items[0]
    const isOk =
      tag.switch().name === 'scvU32' &&
      tag.u32() === 0 &&
      items.length >= 2 &&
      items[1].switch().name === 'scvBool'
    if (isOk) return items[1].b()
    return false
  }

  return false
}

export function parseCertRecord(scVal) {
  if (!scVal || scVal.switch().name !== 'scvMap') return null

  const map = {}
  for (const entry of scVal.map()) {
    const k = entry.key().sym().toString()
    const v = entry.val()
    switch (k) {
      case 'owner':
      case 'issuer':
        map[k] = Address.fromScVal(v).toString()
        break
      case 'cert_id':
        map.certId = v.sym().toString()
        break
      case 'hash':
        map.hash = Buffer.from(v.bytes()).toString('hex')
        break
      case 'rewarded':
        map.rewarded = v.switch().name === 'scvBool' && v.b()
        break
      default:
        break
    }
  }
  return Object.keys(map).length ? map : null
}

/** get_certificate → Result<CertRecord, ContractError> */
export function parseGetCertificateResult(scVal) {
  if (!scVal) return { found: false }

  if (scVal.switch().name === 'scvMap') {
    const rec = parseCertRecord(scVal)
    if (rec) return { found: true, record: rec }
  }

  if (scVal.switch().name === 'scvVec') {
    const items = scVal.vec()
    if (!items?.length) return { found: false }
    const tag = items[0]
    const tagName = tag.switch().name
    const variant =
      tagName === 'scvU32'
        ? tag.u32()
        : tagName === 'scvSymbol'
          ? tag.sym().toString()
          : null

    const isOk =
      variant === 0 ||
      variant === 'Ok' ||
      (typeof variant === 'string' && variant.toLowerCase() === 'ok')

    if (isOk && items[1]) {
      const rec = parseCertRecord(items[1])
      if (rec) return { found: true, record: rec }
    }

    return { found: false, errVariant: variant }
  }

  return { found: false, rawType: scVal.switch().name }
}

export function parseU64(scVal) {
  if (!scVal || scVal.switch().name !== 'scvU64') return 0
  const u = scVal.u64()
  return typeof u.toBigInt === 'function'
    ? Number(u.toBigInt())
    : Number(u.toString())
}

export function parseBool(scVal) {
  if (!scVal || scVal.switch().name !== 'scvBool') return false
  return scVal.b()
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Parse cert_reg event value: (owner, cert_id, hash). */
export function parseCertRegEventValue(valueScVal) {
  if (!valueScVal || valueScVal.switch().name !== 'scvVec') return null
  const vec = valueScVal.vec()
  if (!vec || vec.length < 3) return null
  try {
    const owner = Address.fromScVal(vec[0]).toString()
    const hashVal = vec[2]
    if (hashVal.switch().name !== 'scvBytes') return null
    const certId =
      vec[1].switch().name === 'scvSymbol' ? vec[1].sym().toString() : ''
    return {
      owner,
      certId,
      hashHex: Buffer.from(hashVal.bytes()).toString('hex'),
    }
  } catch {
    return null
  }
}

export { NETWORK_PASS, XLM_SAC, RPC_URL }
