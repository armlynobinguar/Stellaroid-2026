# 🌟 Stellaroid Earn

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
stellaroid_earn/
├── Cargo.toml          # Build config and dependencies
└── src/
    ├── lib.rs          # Soroban smart contract (core logic)
    └── test.rs         # 3 unit tests using soroban_sdk::testutils
```

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust toolchain | stable (≥ 1.78) | `curl https://sh.rustup.rs -sSf \| sh` |
| Wasm target | wasm32-unknown-unknown | `rustup target add wasm32-unknown-unknown` |
| Soroban CLI | ≥ 21.x | `cargo install --locked soroban-cli` |
| Stellar Account | Testnet funded | [Friendbot](https://friendbot.stellar.org) |

---

## 🔨 Build Instructions

```bash
# Clone the repository
git clone https://github.com/your-org/stellaroid-earn.git
cd stellaroid_earn

# Build the Wasm contract
soroban contract build

# Output: target/wasm32-unknown-unknown/release/stellaroid_earn.wasm
```

---

## 🧪 Test Instructions

```bash
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

### 1. Configure Soroban CLI with a Testnet identity

```bash
soroban keys generate --global alice --network testnet
soroban keys fund alice --network testnet
```

### 2. Deploy the contract

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellaroid_earn.wasm \
  --source alice \
  --network testnet
```

You'll receive a **Contract ID** — save it as `$CONTRACT_ID`.

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
| **Week 3** | Employer `link_payment` flow, frontend integration (React + Freighter wallet) |
| **Week 4** | Custom credential token issuance, Trustline setup, end-to-end demo |
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

