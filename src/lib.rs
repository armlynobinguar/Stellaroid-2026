#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    token, symbol_short,
    Address, BytesN, Env, Symbol,
};

// ─────────────────────────────────────────────
//  Storage Keys
// ─────────────────────────────────────────────

/// Identifies a certificate record in persistent storage.
/// Keyed by the 32-byte SHA-256 hash of the certificate document.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Maps cert_hash → CertRecord
    Certificate(BytesN<32>),
    /// Tracks total certificates registered (used for event indexing)
    CertCount,
}

// ─────────────────────────────────────────────
//  Data Structures
// ─────────────────────────────────────────────

/// On-chain certificate record stored for each registered credential.
#[contracttype]
#[derive(Clone)]
pub struct CertRecord {
    /// The wallet address of the credential owner (student/graduate)
    pub owner: Address,
    /// The issuing institution's wallet address
    pub issuer: Address,
    /// Human-readable certificate identifier (e.g. "CS-THESIS-2025")
    pub cert_id: Symbol,
    /// SHA-256 hash of the off-chain certificate document for tamper detection
    pub hash: BytesN<32>,
    /// Whether the student has already received their XLM reward for this cert
    pub rewarded: bool,
}

// ─────────────────────────────────────────────
//  Error Codes
// ─────────────────────────────────────────────

#[contracterror]
#[derive(Clone, PartialEq)]
pub enum ContractError {
    /// A certificate with this hash already exists — duplicate registration
    DuplicateCertificate = 1,
    /// No certificate found for the supplied hash
    CertificateNotFound = 2,
    /// Stored hash does not match the supplied hash — tamper detected
    TamperDetected = 3,
    /// Student already rewarded for this certificate
    AlreadyRewarded = 4,
    /// Caller is not the registered owner of the certificate
    Unauthorized = 5,
}

// ─────────────────────────────────────────────
//  Contract
// ─────────────────────────────────────────────

#[contract]
pub struct StellaroidEarn;

#[contractimpl]
impl StellaroidEarn {

    // ─────────────────────────────────────────
    //  register_certificate
    // ─────────────────────────────────────────

    /// Registers a new on-chain credential.
    ///
    /// - Validates that the same hash has not been registered before (duplicate guard).
    /// - Stores the CertRecord in persistent storage so the hash is permanently anchored
    ///   to the owner wallet — enabling tamper detection on any future lookup.
    /// - Emits a `cert_registered` event so off-chain indexers can track issuance.
    ///
    /// # Arguments
    /// * `issuer`  – The institution issuing the credential (must sign the transaction).
    /// * `owner`   – The student wallet that will own the credential.
    /// * `cert_id` – A short human-readable identifier for the certificate.
    /// * `hash`    – SHA-256 hash of the certificate document.
    pub fn register_certificate(
        env: Env,
        issuer: Address,
        owner: Address,
        cert_id: Symbol,
        hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        // Only the issuer signs this transaction — they vouch for the credential.
        issuer.require_auth();

        let key = DataKey::Certificate(hash.clone());

        // ── Duplicate guard ───────────────────────────────────────────────────
        // If a record already exists for this hash, the same document is being
        // registered twice.  Reject to prevent credential inflation.
        if env.storage().persistent().has(&key) {
            return Err(ContractError::DuplicateCertificate);
        }

        // ── Persist the record ────────────────────────────────────────────────
        let record = CertRecord {
            owner: owner.clone(),
            issuer: issuer.clone(),
            cert_id: cert_id.clone(),
            hash: hash.clone(),
            rewarded: false,
        };
        env.storage().persistent().set(&key, &record);

        // ── Increment global counter ──────────────────────────────────────────
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::CertCount)
            .unwrap_or(0u64);
        env.storage()
            .persistent()
            .set(&DataKey::CertCount, &(count + 1));

        // ── Emit event ────────────────────────────────────────────────────────
        // Emitting cert_registered lets frontend UIs and indexers react without
        // polling contract state.
        env.events().publish(
            (symbol_short!("cert_reg"), issuer),
            (owner, cert_id, hash),
        );

        Ok(())
    }

    // ─────────────────────────────────────────
    //  verify_certificate
    // ─────────────────────────────────────────

    /// Verifies whether a certificate is authentic and untampered.
    ///
    /// - Looks up the stored record by hash.
    /// - Compares the stored hash against the supplied hash (tamper check).
    /// - Emits a `cert_verified` event (true/false) for audit trail purposes.
    ///
    /// Returns `true` if the certificate is valid, `false` if not found or
    /// returns an error if tampering is detected (stored hash mismatch).
    pub fn verify_certificate(
        env: Env,
        hash: BytesN<32>,
    ) -> Result<bool, ContractError> {
        let key = DataKey::Certificate(hash.clone());

        // ── Not found → verification fails ───────────────────────────────────
        if !env.storage().persistent().has(&key) {
            // Emit a negative verification event so employers can log the attempt.
            env.events().publish(
                (symbol_short!("cert_vrfy"),),
                (hash, false),
            );
            return Ok(false);
        }

        let record: CertRecord = env.storage().persistent().get(&key).unwrap();

        // ── Tamper detection ──────────────────────────────────────────────────
        // The key IS the hash, so a mismatch here would indicate storage
        // corruption or a malicious record substitution attempt.
        if record.hash != hash {
            return Err(ContractError::TamperDetected);
        }

        // ── Emit positive verification event ─────────────────────────────────
        env.events().publish(
            (symbol_short!("cert_vrfy"),),
            (hash, true),
        );

        Ok(true)
    }

    // ─────────────────────────────────────────
    //  reward_student
    // ─────────────────────────────────────────

    /// Transfers an XLM reward to the student upon successful credential verification.
    ///
    /// - Only callable once per certificate (idempotency guard via `rewarded` flag).
    /// - Uses the Soroban token interface to transfer XLM from the contract's own
    ///   balance to the student's wallet — the contract must be pre-funded with XLM.
    /// - Marks the certificate as `rewarded = true` to prevent double payouts.
    ///
    /// # Arguments
    /// * `token_id`     – Address of the XLM Stellar Asset Contract (SAC).
    /// * `hash`         – Hash identifying the verified certificate.
    /// * `reward_amount`– Amount of XLM stroops to transfer (1 XLM = 10_000_000 stroops).
    pub fn reward_student(
        env: Env,
        token_id: Address,
        hash: BytesN<32>,
        reward_amount: i128,
    ) -> Result<(), ContractError> {
        let key = DataKey::Certificate(hash.clone());

        // ── Certificate must exist ────────────────────────────────────────────
        if !env.storage().persistent().has(&key) {
            return Err(ContractError::CertificateNotFound);
        }

        let mut record: CertRecord = env.storage().persistent().get(&key).unwrap();

        // ── Idempotency guard ─────────────────────────────────────────────────
        // Prevents a student from claiming the reward multiple times for the
        // same certificate (e.g. through replay attacks or re-submissions).
        if record.rewarded {
            return Err(ContractError::AlreadyRewarded);
        }

        // ── XLM transfer via Stellar Asset Contract ───────────────────────────
        // token::Client wraps the SAC and lets us call transfer() just like
        // any other Soroban token.  The contract itself is the sender, so
        // it must hold enough XLM before this call succeeds.
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(
            &env.current_contract_address(),
            &record.owner,
            &reward_amount,
        );

        // ── Mark as rewarded & persist ────────────────────────────────────────
        record.rewarded = true;
        env.storage().persistent().set(&key, &record);

        // ── Emit reward event ─────────────────────────────────────────────────
        env.events().publish(
            (symbol_short!("rewarded"),),
            (record.owner, hash, reward_amount),
        );

        Ok(())
    }

    // ─────────────────────────────────────────
    //  link_payment
    // ─────────────────────────────────────────

    /// Employer-triggered direct payment to a verified student wallet.
    ///
    /// This function implements the "Financial Access" theme of Stellaroid Earn:
    /// employers can pay students (gig workers, interns, contractors) directly
    /// to their on-chain verified wallet, removing the need for manual bank
    /// transfers and document checks.
    ///
    /// - The employer must sign the transaction.
    /// - The certificate must exist and be verified before payment is released.
    /// - Transfers `amount` XLM stroops from `employer` to the student's wallet.
    ///
    /// # Arguments
    /// * `employer`  – Employer wallet (must sign; funds come from here).
    /// * `token_id`  – XLM SAC address.
    /// * `hash`      – Certificate hash identifying the target student.
    /// * `amount`    – Payment amount in stroops.
    pub fn link_payment(
        env: Env,
        employer: Address,
        token_id: Address,
        hash: BytesN<32>,
        amount: i128,
    ) -> Result<(), ContractError> {
        // ── Employer must sign ────────────────────────────────────────────────
        employer.require_auth();

        let key = DataKey::Certificate(hash.clone());

        // ── Certificate must be registered ────────────────────────────────────
        if !env.storage().persistent().has(&key) {
            return Err(ContractError::CertificateNotFound);
        }

        let record: CertRecord = env.storage().persistent().get(&key).unwrap();

        // ── Transfer payment from employer → verified student wallet ──────────
        // By requiring the certificate to exist, we implicitly confirm the
        // student's identity has been verified on-chain before any payment flows.
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer_from(
            &env.current_contract_address(),
            &employer,
            &record.owner,
            &amount,
        );

        // ── Emit payment event ────────────────────────────────────────────────
        env.events().publish(
            (symbol_short!("payment"),),
            (employer, record.owner, hash, amount),
        );

        Ok(())
    }

    // ─────────────────────────────────────────
    //  Getter helpers
    // ─────────────────────────────────────────

    /// Returns the full CertRecord for a given certificate hash.
    /// Useful for frontend dashboards to display certificate details.
    pub fn get_certificate(
        env: Env,
        hash: BytesN<32>,
    ) -> Result<CertRecord, ContractError> {
        let key = DataKey::Certificate(hash);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::CertificateNotFound)
    }

    /// Returns the total number of certificates registered on this contract.
    pub fn cert_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::CertCount)
            .unwrap_or(0u64)
    }
}
