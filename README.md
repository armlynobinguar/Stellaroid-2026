# Stellaroid Earn

> On-chain credential verification and learn-to-earn rewards for students and fresh graduates across Southeast Asia — powered by Stellar Soroban.

---

## 🧩 Problem

A graduating student in the Philippines cannot easily prove their credentials to employers or access financial opportunities. Manual credential verification delays hiring, creates fraud risk, and limits income access — especially for students from underserved universities and bootcamps.

## 💡 Solution

Using Stellar, **Stellaroid Earn** builds a transparent on-chain system where each certificate has a unique, traceable identity anchored to its rightful owner. Students unlock XLM-based rewards, job payouts, and financial access upon instant credential verification — removing the intermediary entirely.

---

## 🥋 Belt Progression (Level System)

Stellaroid Earn follows a belt-based learning path for developers and students onboarding to Web3:

| Belt | Level | Focus |
|------|-------|-------|
| ⚪ White Belt | Level 1 | Build wallets and submit your first on-chain transactions. |
| 🟡 Yellow Belt | Level 2 | Work with multi-wallet flows, smart contracts, and event handling. |
| 🟢 Green Belt | Level 3 | Ship the full-stack app: APIs, Freighter signing, rewards, and student UX. |

### ⚪ White Belt — Level 1 Features
- Generate a Stellar keypair (student wallet)
- Fund your wallet via Friendbot on Testnet
- Submit a basic XLM payment transaction using Stellar SDK
- View your wallet balance and transaction history on Stellar Expert

### 🟡 Yellow Belt — Level 2 Features
- Deploy the `stellaroid_earn` Soroban contract to Testnet
- Call `register_certificate()` to anchor a credential on-chain
- Call `verify_certificate()` and observe the emitted on-chain event
- Set up a Trustline for a custom school-issued credential token
- Trigger `link_payment()` from an employer wallet to a verified student

### 🟢 Green Belt — Level 3 Features
- Run the **Express + Soroban RPC** backend (`backend/`) with `CONTRACT_ID` and funded `BACKEND_SECRET` on Testnet
- **Issuer flow (React + Freighter):** build unsigned `register_certificate` XDR via `POST /api/certificates/build-register`, sign in Freighter, submit via `POST /api/certificates/register`
- **Student dashboard:** load XLM balance (Horizon), list on-chain credentials for the connected wallet (`GET /api/certificates/owner/:address` — event scan + `get_certificate`), and show **belt progression** (⚪→🟡→🟢 by credential count in the UI)
- **Public verification:** verify by hash or file hash against the contract (`GET /api/certificates/verify/:hash`)
- **Employer flow:** confirm a credential, then build/sign/submit `link_payment` (`POST /api/payments/build` + `POST /api/payments/submit`)
- **Learn-to-earn:** trigger `reward_student` from the backend after a cert is verified on-chain (`POST /api/rewards/trigger` — contract must hold XLM on the SAC)

---

## ✨ Stellar Features Used

| Feature | Purpose |
|---------|---------|
| **Soroban Smart Contracts** | Core credential registry, tamper detection, reward logic, and employer payment routing |
| **XLM Transfers** | Student rewards upon credential verification; employer direct payments |
| **Custom Tokens (Stellar Asset Contract)** | Optional school-issued credential assets representing course completions |
| **Trustlines** | Student wallet opts in to hold the school's credential token |

---

## 🎯 Target Users

- **Students & fresh graduates** in Philippines, Vietnam, and Indonesia seeking verifiable credentials
- **Universities & bootcamps** issuing tamper-proof on-chain certificates
- **Employers & DAOs** verifying skills before releasing payment

---

## 📦 Project Structure

```
Stellaroid-2026/
├── package.json        # Root scripts (Green Belt — run API + Vite together)
├── scripts/
│   ├── smoke-api.mjs           # Week 4: health + cert_count smoke test
│   └── trigger-reward.mjs      # Week 4: POST /api/rewards/trigger
├── backend/            # Express + Soroban RPC (REST API)
├── client/             # React + Vite + Freighter (web UI)
└── contract/           # Soroban Wasm crate (build & test from this directory)
    ├── rust-toolchain.toml # Pin Rust 1.81.x for Soroban Wasm
    ├── .cargo/config.toml  # Extra Wasm rustflags for Soroban VM compatibility
    ├── Cargo.toml
    ├── Cargo.lock
    └── src/
        ├── lib.rs      # Soroban smart contract (core logic)
        └── test.rs     # Unit tests (soroban_sdk::testutils)
```

### 🟢 Green Belt — NPM scripts (Week 3–4)

From the **repository root** (requires Node 18+):

| Script | What it does |
|--------|----------------|
| `npm run setup` | Installs root `concurrently`, then `backend` + `client` dependencies |
| `npm run dev` | **Week 3:** runs **API** (`:4000`) and **Vite** (`:5173`) together — use with `backend/.env` + Freighter on Testnet |
| `npm run dev:api` | API only |
| `npm run dev:web` | Frontend only (proxies `/api` → `:4000`) |
| `npm run green-belt:week3` | Alias for `npm run dev` |
| `npm run green-belt:week4:smoke` | **Week 4:** hits `GET /health` and `GET /api/certificates/count` |
| `npm run green-belt:week4:reward -- <64-hex-hash>` | **Week 4:** calls `POST /api/rewards/trigger` (contract must hold XLM; cert must exist) |
| `npm run build:web` | Production build of the React app |
| `npm run build:contract` | `cd contract && stellar contract build` (Wasm output under `contract/target/`) |

Set `API_URL` if the API is not on `http://localhost:4000`. **Custom token + trustline** (stretch) still use Stellar Laboratory or CLI per Yellow Belt — not wrapped in npm here.

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust toolchain | **1.81.x** (pinned in `contract/rust-toolchain.toml`) | Run `cd contract && rustup show` — installs the pin when you enter the crate |
| Wasm target | **wasm32v1-none** (recommended) + wasm32-unknown-unknown | Installed via `contract/rust-toolchain.toml` when you `rustup` in `contract/` |
| Soroban CLI | ≥ 21.x | `cargo install --locked soroban-cli` |
| Stellar Account | Testnet funded | [Friendbot](https://friendbot.stellar.org) |

---

## 🔨 Build Instructions

```bash
# Clone the repository
git clone https://github.com/your-org/stellaroid-earn.git
cd stellaroid_earn

cd contract

# Build the Wasm contract (uses wasm32v1-none when using current Stellar CLI)
stellar contract build
# or: soroban contract build

# Output (typical): contract/target/wasm32v1-none/release/stellaroid_earn.wasm
```

---

## 🧪 Test Instructions

```bash
cd contract

# Run all 3 unit tests
cargo test

# Run with output visible (useful for debugging events)
cargo test -- --nocapture
```

Expected output:
```
test tests::test_register_and_reward_student       ... ok
test tests::test_duplicate_registration_rejected   ... ok
test tests::test_storage_reflects_correct_owner_and_hash ... ok

test result: ok. 3 passed; 0 failed
```

---

## 🚀 Testnet Deployment

### Build the `.wasm` (before deploy)

Use either:

```bash
cd contract

# Recommended — Stellar CLI applies the right target (usually wasm32v1-none)
stellar contract build
# or: soroban contract build
```

Or plain Cargo (same rustflags via **`contract/.cargo/config.toml`**):

```bash
cd contract
cargo clean
cargo build --target wasm32v1-none --release
# Legacy target (if needed): cargo build --target wasm32-unknown-unknown --release
```

If you still see **`reference-types not enabled`**, use **Rust 1.81** from `contract/rust-toolchain.toml` (`cd contract && rustup show`), then `cargo clean` and rebuild.

### 1. Configure Soroban CLI with a Testnet identity

```bash
soroban keys generate --global alice --network testnet
soroban keys fund alice --network testnet
```

### 2. Deploy the contract

```bash
stellar contract deploy \
  --wasm contract/target/wasm32v1-none/release/stellaroid_earn.wasm \
  --source my-key \
  --network testnet
```

(Equivalent: `soroban contract deploy` with the same `--wasm` path. Run from the **repository root**, or use an absolute path to the `.wasm` file.)

You'll receive a **Contract ID** — put it in `backend/.env` as `CONTRACT_ID` for the full-stack app.

### 3. Full-stack app (API + Vite + Freighter) on Testnet

Wire the **same wasm / contract** you deployed (`contract/target/wasm32v1-none/release/stellaroid_earn.wasm` → deploy → contract id).

| Step | Action |
|------|--------|
| **Reference contract** | `CABV3HJFEPCREHGVFTHETSCAGPVI4O4NTCBWS5ROH6ZCWOJHNKLOO2RS` — [Stellar Lab](https://lab.stellar.org/r/testnet/contract/CABV3HJFEPCREHGVFTHETSCAGPVI4O4NTCBWS5ROH6ZCWOJHNKLOO2RS) |
| **Backend** | `cp backend/.env.example backend/.env` → set **`BACKEND_SECRET`** (funded Testnet account). `CONTRACT_ID` is pre-filled to the reference deploy; override if you redeploy. |
| **Run** | Repo root: `npm run setup` then `npm run dev` → API **:4000**, UI **:5173** (`/api` proxied to the API). |
| **Freighter** | **Testnet** + passphrase `Test SDF Network ; September 2015` (matches `NETWORK_PASSPHRASE` / `client/src/config/stellar.js`). |
| **Issue credentials** | The **issuer** Freighter account must **exist on Testnet with XLM** (Friendbot). Otherwise `build-register` fails: Soroban needs a sequence number for the transaction source. |
| **Rewards / payments** | Pre-fund the **contract** with Testnet XLM on the SAC so `reward_student` and token transfers can succeed. |

---

## 🖥️ Sample CLI Invocations

### `register_certificate` — Issuer anchors a credential on-chain

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  register_certificate \
  --issuer GISSUER_WALLET_ADDRESS_HERE \
  --owner  GSTUDENT_WALLET_ADDRESS_HERE \
  --cert_id '"CS_THESIS_2025"' \
  --hash '{"bytes":"abababababababababababababababababababababababababababababababababab"}'
```

### `verify_certificate` — Employer verifies a student credential

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  verify_certificate \
  --hash '{"bytes":"abababababababababababababababababababababababababababababababababab"}'
```

Expected response: `true`

### `reward_student` — Distribute XLM reward to verified student

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  reward_student \
  --token_id $XLM_SAC_ADDRESS \
  --hash '{"bytes":"abababababababababababababababababababababababababababababababababab"}' \
  --reward_amount 50000000
```

### `link_payment` — Employer pays verified student directly

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source employer_wallet \
  --network testnet \
  -- \
  link_payment \
  --employer GEMPLOYER_WALLET_ADDRESS_HERE \
  --token_id $XLM_SAC_ADDRESS \
  --hash '{"bytes":"abababababababababababababababababababababababababababababababababab"}' \
  --amount 200000000
```

---

## 🗓️ Suggested MVP Timeline

| Week | Milestone |
|------|-----------|
| **Week 1** | ⚪ White Belt — Wallet creation, Friendbot funding, first XLM transactions |
| **Week 2** | 🟡 Yellow Belt — Contract deployment, `register_certificate`, `verify_certificate` live on Testnet |
| **Week 3** | 🟢 Green Belt — Employer `link_payment` flow, React + Vite + Freighter, REST API wiring → run `npm run setup` then `npm run green-belt:week3` (or `npm run dev`) |
| **Week 4** | 🟢 Green Belt — Student dashboard, public verify, `reward_student` trigger; custom token + Trustline for stretch demo → `npm run green-belt:week4:smoke`, `npm run green-belt:week4:reward -- <hash>` |
| **Week 5** | Security review, Testnet stress tests, Mainnet deployment preparation |

---

## 🔐 Contract Functions Reference

| Function | Caller | Description |
|----------|--------|-------------|
| `register_certificate` | Issuer | Anchors a credential hash + student wallet on-chain |
| `verify_certificate` | Anyone | Returns boolean validity, emits on-chain event |
| `reward_student` | Contract | Transfers XLM to student upon first verification |
| `link_payment` | Employer | Employer pays student's verified wallet directly |
| `get_certificate` | Anyone | Returns full CertRecord for a given hash |
| `cert_count` | Anyone | Returns total registered certificates |

---

## 📄 License

MIT License

Copyright (c) 2025 Stellaroid Earn Contributors

