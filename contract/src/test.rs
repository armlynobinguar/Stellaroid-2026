#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Events},
        token,
        Address, BytesN, Env, Symbol,
    };

    use crate::{StellaroidEarn, StellaroidEarnClient, ContractError};

    // ─────────────────────────────────────────────────────────────────────────
    //  Shared test helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// Creates a deterministic 32-byte hash from a u8 seed.
    fn mock_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    /// Deploys the Stellaroid Earn contract and returns (env, client).
    fn setup() -> (Env, StellaroidEarnClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, StellaroidEarn);
        let client = StellaroidEarnClient::new(&env, &contract_id);
        (env, client)
    }

    /// Deploys the contract + a mock XLM SAC pre-funded to the contract address.
    /// Returns (env, client, xlm_id, xlm_client).
    fn setup_with_token(
        mint_amount: i128,
    ) -> (
        Env,
        StellaroidEarnClient<'static>,
        Address,
        token::Client<'static>,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, StellaroidEarn);
        let client = StellaroidEarnClient::new(&env, &contract_id);

        let admin      = Address::generate(&env);
        let xlm_id     = env.register_stellar_asset_contract(admin.clone());
        let xlm_admin  = token::StellarAssetClient::new(&env, &xlm_id);
        let xlm_client = token::Client::new(&env, &xlm_id);

        xlm_admin.mint(&client.address, &mint_amount);

        (env, client, xlm_id, xlm_client)
    }

    // =========================================================================
    //  GROUP 1 — register_certificate
    // =========================================================================

    // ── Test 1: Happy path ────────────────────────────────────────────────────
    /// A certificate is successfully registered and the student receives an XLM reward.
    #[test]
    fn test_register_and_reward_student() {
        let (env, client, xlm_id, xlm_client) = setup_with_token(1_000_000_000);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0xAB);
        let cert_id = Symbol::new(&env, "CS_THESIS_2025");

        client
            .register_certificate(&issuer, &student, &cert_id, &hash)
            .unwrap();

        let record = client.get_certificate(&hash).unwrap();
        assert_eq!(record.owner, student);
        assert_eq!(record.hash,  hash);
        assert!(!record.rewarded);

        let reward: i128 = 50_000_000; // 5 XLM
        client.reward_student(&xlm_id, &hash, &reward).unwrap();

        assert_eq!(xlm_client.balance(&student), reward);

        let updated = client.get_certificate(&hash).unwrap();
        assert!(updated.rewarded, "rewarded flag must be set after payout");
    }

    // ── Test 2: Duplicate rejection ───────────────────────────────────────────
    /// A duplicate certificate registration is rejected with DuplicateCertificate.
    #[test]
    fn test_duplicate_registration_rejected() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0xCD);
        let cert_id = Symbol::new(&env, "BOOTCAMP_CERT");

        client
            .register_certificate(&issuer, &student, &cert_id, &hash)
            .unwrap();

        let second = client.try_register_certificate(&issuer, &student, &cert_id, &hash);
        let err    = second.unwrap_err().unwrap();
        assert_eq!(err, ContractError::DuplicateCertificate);
        assert_eq!(client.cert_count(), 1u64);
    }

    // ── Test 3: State verification ────────────────────────────────────────────
    /// Storage correctly reflects owner, issuer, hash, cert_id, and rewarded flag.
    #[test]
    fn test_storage_reflects_correct_owner_and_hash() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0xEF);
        let cert_id = Symbol::new(&env, "GRAD_CERT_IT");

        client
            .register_certificate(&issuer, &student, &cert_id, &hash)
            .unwrap();

        let record = client.get_certificate(&hash).unwrap();
        assert_eq!(record.owner,   student);
        assert_eq!(record.issuer,  issuer);
        assert_eq!(record.hash,    hash);
        assert_eq!(record.cert_id, cert_id);
        assert!(!record.rewarded);
        assert_eq!(client.cert_count(), 1u64);
    }

    // ── Test 4: Multiple unique certificates ──────────────────────────────────
    /// Multiple different certificates from the same issuer are all stored correctly.
    #[test]
    fn test_multiple_certificates_registered_independently() {
        let (env, client) = setup();

        let issuer   = Address::generate(&env);
        let student1 = Address::generate(&env);
        let student2 = Address::generate(&env);
        let student3 = Address::generate(&env);

        let certs = vec![
            (mock_hash(&env, 0x01), student1.clone(), Symbol::new(&env, "CERT_A")),
            (mock_hash(&env, 0x02), student2.clone(), Symbol::new(&env, "CERT_B")),
            (mock_hash(&env, 0x03), student3.clone(), Symbol::new(&env, "CERT_C")),
        ];

        for (hash, student, cert_id) in &certs {
            client
                .register_certificate(&issuer, student, cert_id, hash)
                .unwrap();
        }

        assert_eq!(client.cert_count(), 3u64, "All three certs must be stored");

        for (hash, student, cert_id) in &certs {
            let rec = client.get_certificate(hash).unwrap();
            assert_eq!(&rec.owner,   student);
            assert_eq!(&rec.cert_id, cert_id);
        }
    }

    // ── Test 5: Different issuers, same student ───────────────────────────────
    /// Two different institutions can each issue a credential to the same student.
    #[test]
    fn test_different_issuers_same_student() {
        let (env, client) = setup();

        let university = Address::generate(&env);
        let bootcamp   = Address::generate(&env);
        let student    = Address::generate(&env);

        let hash_uni  = mock_hash(&env, 0xAA);
        let hash_boot = mock_hash(&env, 0xBB);

        client
            .register_certificate(
                &university, &student,
                &Symbol::new(&env, "CS_DEGREE"), &hash_uni,
            )
            .unwrap();

        client
            .register_certificate(
                &bootcamp, &student,
                &Symbol::new(&env, "WEB3_CERT"), &hash_boot,
            )
            .unwrap();

        assert_eq!(client.cert_count(), 2u64);

        let rec1 = client.get_certificate(&hash_uni).unwrap();
        let rec2 = client.get_certificate(&hash_boot).unwrap();
        assert_eq!(rec1.issuer, university);
        assert_eq!(rec2.issuer, bootcamp);
        assert_eq!(rec1.owner,  student);
        assert_eq!(rec2.owner,  student);
    }

    // ── Test 6: Registration emits cert_reg event ─────────────────────────────
    /// register_certificate emits a cert_registered event that indexers can consume.
    #[test]
    fn test_registration_emits_event() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x11);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let events = env.events().all();
        assert!(!events.is_empty(), "At least one event must be emitted on registration");
    }

    // =========================================================================
    //  GROUP 2 — verify_certificate
    // =========================================================================

    // ── Test 7: Valid cert returns true ───────────────────────────────────────
    /// verify_certificate returns true for a registered, untampered certificate.
    #[test]
    fn test_verify_returns_true_for_valid_cert() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x10);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let result = client.verify_certificate(&hash).unwrap();
        assert!(result, "verify_certificate must return true for a registered cert");
    }

    // ── Test 8: Unknown hash returns false ────────────────────────────────────
    /// verify_certificate returns false for a hash that was never registered.
    #[test]
    fn test_verify_returns_false_for_unknown_hash() {
        let (env, client) = setup();

        let unknown = mock_hash(&env, 0xFF);
        let result  = client.verify_certificate(&unknown).unwrap();
        assert!(!result, "Unknown cert hash must verify as false, not error");
    }

    // ── Test 9: Verify emits an on-chain event ────────────────────────────────
    /// verify_certificate emits events on both true and false results.
    #[test]
    fn test_verify_emits_event() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x20);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        client.verify_certificate(&hash).unwrap();

        let events = env.events().all();
        // Events include cert_reg + cert_vrfy — at least 2 must exist.
        assert!(
            events.len() >= 2,
            "At least a cert_reg and cert_vrfy event must be emitted"
        );
    }

    // ── Test 10: Sequential verifications remain stable ───────────────────────
    /// Calling verify_certificate multiple times returns consistent results.
    #[test]
    fn test_verify_is_idempotent() {
        let (env, client) = setup();

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x30);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        for _ in 0..5 {
            let result = client.verify_certificate(&hash).unwrap();
            assert!(result, "verify_certificate must return true on every call");
        }
    }

    // ── Test 11: Verify false does not mutate state ───────────────────────────
    /// Calling verify_certificate on an unknown hash must not create a record.
    #[test]
    fn test_verify_false_does_not_create_record() {
        let (env, client) = setup();

        let ghost = mock_hash(&env, 0x55);

        // Verify on unknown hash — returns false.
        let result = client.verify_certificate(&ghost).unwrap();
        assert!(!result);

        // Attempting to get the record must still fail — no ghost record created.
        let get_result = client.try_get_certificate(&ghost);
        assert!(get_result.is_err(), "verify false must not create a storage record");

        // Count must still be zero.
        assert_eq!(client.cert_count(), 0u64);
    }

    // =========================================================================
    //  GROUP 3 — reward_student
    // =========================================================================

    // ── Test 12: Double reward is rejected ────────────────────────────────────
    /// Calling reward_student twice on the same certificate returns AlreadyRewarded.
    #[test]
    fn test_double_reward_rejected() {
        let (env, client, xlm_id, _xlm_client) = setup_with_token(1_000_000_000);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x40);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        client.reward_student(&xlm_id, &hash, &10_000_000).unwrap();

        let second = client.try_reward_student(&xlm_id, &hash, &10_000_000);
        let err    = second.unwrap_err().unwrap();
        assert_eq!(err, ContractError::AlreadyRewarded);
    }

    // ── Test 13: Reward on non-existent cert fails ────────────────────────────
    /// reward_student on an unregistered hash returns CertificateNotFound.
    #[test]
    fn test_reward_nonexistent_cert_fails() {
        let (env, client, xlm_id, _) = setup_with_token(1_000_000_000);

        let ghost_hash = mock_hash(&env, 0x99);
        let result = client.try_reward_student(&xlm_id, &ghost_hash, &5_000_000);
        let err    = result.unwrap_err().unwrap();
        assert_eq!(err, ContractError::CertificateNotFound);
    }

    // ── Test 14: Reward amount is exact ──────────────────────────────────────
    /// The student receives exactly the requested reward amount — no rounding.
    #[test]
    fn test_reward_exact_amount_transferred() {
        let (env, client, xlm_id, xlm_client) = setup_with_token(1_000_000_000);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x50);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let reward: i128 = 12_345_678; // odd amount to catch rounding bugs
        client.reward_student(&xlm_id, &hash, &reward).unwrap();

        assert_eq!(
            xlm_client.balance(&student), reward,
            "Student balance must equal reward amount exactly"
        );
    }

    // ── Test 15: Contract balance decreases after reward ─────────────────────
    /// The contract's XLM balance is reduced by exactly the reward amount.
    #[test]
    fn test_contract_balance_decreases_after_reward() {
        let initial: i128 = 1_000_000_000;
        let (env, client, xlm_id, xlm_client) = setup_with_token(initial);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x60);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let reward: i128 = 100_000_000; // 10 XLM
        client.reward_student(&xlm_id, &hash, &reward).unwrap();

        let contract_balance = xlm_client.balance(&client.address);
        assert_eq!(
            contract_balance,
            initial - reward,
            "Contract balance must decrease by exactly the reward amount"
        );
    }

    // ── Test 16: Multiple students each receive independent rewards ───────────
    /// Rewarding multiple students does not affect each other's balances.
    #[test]
    fn test_multiple_students_rewarded_independently() {
        let initial: i128 = 5_000_000_000;
        let (env, client, xlm_id, xlm_client) = setup_with_token(initial);

        let issuer  = Address::generate(&env);
        let reward  = 50_000_000i128;
        let n       = 5usize;

        let students: Vec<(BytesN<32>, Address)> = (0u8..n as u8)
            .map(|i| (mock_hash(&env, i + 1), Address::generate(&env)))
            .collect();

        for (hash, student) in &students {
            client
                .register_certificate(
                    &issuer, student,
                    &Symbol::new(&env, "CERT"), hash,
                )
                .unwrap();
            client.reward_student(&xlm_id, hash, &reward).unwrap();
        }

        for (_, student) in &students {
            assert_eq!(
                xlm_client.balance(student), reward,
                "Every student must receive their own reward independently"
            );
        }

        let expected = initial - (reward * n as i128);
        assert_eq!(xlm_client.balance(&client.address), expected);
    }

    // ── Test 17: rewarded flag persists after reward ──────────────────────────
    /// The CertRecord.rewarded field is persistently set to true after reward.
    #[test]
    fn test_rewarded_flag_persists_in_storage() {
        let (env, client, xlm_id, _) = setup_with_token(500_000_000);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0x61);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        assert!(!client.get_certificate(&hash).unwrap().rewarded);

        client.reward_student(&xlm_id, &hash, &10_000_000).unwrap();

        assert!(
            client.get_certificate(&hash).unwrap().rewarded,
            "rewarded must be true in persistent storage after reward"
        );
    }

    // =========================================================================
    //  GROUP 4 — link_payment (employer-triggered)
    // =========================================================================

    // ── Test 18: Employer payment to verified student succeeds ────────────────
    /// link_payment transfers XLM from employer to the verified student wallet.
    #[test]
    fn test_employer_payment_to_verified_student() {
        let (env, client) = setup();

        let issuer   = Address::generate(&env);
        let student  = Address::generate(&env);
        let employer = Address::generate(&env);
        let hash     = mock_hash(&env, 0x70);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let admin      = Address::generate(&env);
        let xlm_id     = env.register_stellar_asset_contract(admin.clone());
        let xlm_admin  = token::StellarAssetClient::new(&env, &xlm_id);
        let xlm_client = token::Client::new(&env, &xlm_id);

        let payment: i128 = 200_000_000;
        xlm_admin.mint(&employer, &payment);

        client
            .link_payment(&employer, &xlm_id, &hash, &payment)
            .unwrap();

        assert_eq!(xlm_client.balance(&student),  payment);
        assert_eq!(xlm_client.balance(&employer), 0i128);
    }

    // ── Test 19: Payment to unregistered cert fails ───────────────────────────
    /// link_payment on an unknown hash returns CertificateNotFound.
    #[test]
    fn test_employer_payment_unknown_cert_fails() {
        let (env, client) = setup();

        let employer   = Address::generate(&env);
        let ghost_hash = mock_hash(&env, 0x88);
        let admin      = Address::generate(&env);
        let xlm_id     = env.register_stellar_asset_contract(admin);

        let result = client.try_link_payment(&employer, &xlm_id, &ghost_hash, &100_000_000);
        let err    = result.unwrap_err().unwrap();
        assert_eq!(err, ContractError::CertificateNotFound);
    }

    // ── Test 20: Partial payment / installments accumulate ────────────────────
    /// link_payment can be called multiple times for the same student.
    #[test]
    fn test_employer_partial_payments_accumulate() {
        let (env, client) = setup();

        let issuer   = Address::generate(&env);
        let student  = Address::generate(&env);
        let employer = Address::generate(&env);
        let hash     = mock_hash(&env, 0x7A);

        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "CERT"), &hash)
            .unwrap();

        let admin      = Address::generate(&env);
        let xlm_id     = env.register_stellar_asset_contract(admin.clone());
        let xlm_admin  = token::StellarAssetClient::new(&env, &xlm_id);
        let xlm_client = token::Client::new(&env, &xlm_id);

        let total: i128 = 600_000_000;
        xlm_admin.mint(&employer, &total);

        let installment: i128 = 200_000_000;
        for _ in 0..3 {
            client.link_payment(&employer, &xlm_id, &hash, &installment).unwrap();
        }

        assert_eq!(xlm_client.balance(&student), total);
    }

    // =========================================================================
    //  GROUP 5 — cert_count & general edge cases
    // =========================================================================

    // ── Test 21: cert_count starts at zero ────────────────────────────────────
    #[test]
    fn test_cert_count_starts_at_zero() {
        let (_env, client) = setup();
        assert_eq!(client.cert_count(), 0u64);
    }

    // ── Test 22: cert_count increments correctly ──────────────────────────────
    #[test]
    fn test_cert_count_increments_correctly() {
        let (env, client) = setup();
        let issuer = Address::generate(&env);

        for i in 0u8..10 {
            let student = Address::generate(&env);
            let hash    = mock_hash(&env, i);
            client
                .register_certificate(
                    &issuer, &student,
                    &Symbol::new(&env, "CERT"), &hash,
                )
                .unwrap();
            assert_eq!(client.cert_count(), (i as u64) + 1);
        }
    }

    // ── Test 23: get_certificate on unknown hash returns error ────────────────
    #[test]
    fn test_get_certificate_unknown_returns_error() {
        let (env, client) = setup();
        let unknown = mock_hash(&env, 0x00);
        let result  = client.try_get_certificate(&unknown);
        let err     = result.unwrap_err().unwrap();
        assert_eq!(err, ContractError::CertificateNotFound);
    }

    // ── Test 24: Two different seeds produce distinct hashes ──────────────────
    /// Sanity check that mock_hash never accidentally produces collisions.
    #[test]
    fn test_mock_hash_seeds_are_distinct() {
        let env = Env::default();
        for a in 0u8..10 {
            for b in (a + 1)..10 {
                assert_ne!(
                    mock_hash(&env, a),
                    mock_hash(&env, b),
                    "Seeds {a} and {b} must produce distinct hashes"
                );
            }
        }
    }

    // ── Test 25: Duplicate attempt after reward does not create second record ──
    /// Even after reward is issued, a duplicate registration is still rejected.
    #[test]
    fn test_duplicate_rejected_even_after_reward() {
        let (env, client, xlm_id, _) = setup_with_token(1_000_000_000);

        let issuer  = Address::generate(&env);
        let student = Address::generate(&env);
        let hash    = mock_hash(&env, 0xD1);
        let cert_id = Symbol::new(&env, "DUP_TEST");

        client
            .register_certificate(&issuer, &student, &cert_id, &hash)
            .unwrap();
        client.reward_student(&xlm_id, &hash, &5_000_000).unwrap();

        // Try to register the same cert again after reward.
        let dup = client.try_register_certificate(&issuer, &student, &cert_id, &hash);
        assert_eq!(dup.unwrap_err().unwrap(), ContractError::DuplicateCertificate);
    }

    // ── Test 26: Full end-to-end flow ─────────────────────────────────────────
    /// Register → Verify → Reward → Employer Pay in one integrated test.
    #[test]
    fn test_full_end_to_end_flow() {
        let initial: i128 = 1_000_000_000;
        let (env, client, xlm_id, xlm_client) = setup_with_token(initial);

        let issuer   = Address::generate(&env);
        let student  = Address::generate(&env);
        let employer = Address::generate(&env);
        let hash     = mock_hash(&env, 0xE2);

        // Step 1: Register
        client
            .register_certificate(&issuer, &student, &Symbol::new(&env, "FULL_CERT"), &hash)
            .unwrap();

        // Step 2: Verify
        assert!(client.verify_certificate(&hash).unwrap());

        // Step 3: Reward
        let reward: i128 = 50_000_000;
        client.reward_student(&xlm_id, &hash, &reward).unwrap();
        assert_eq!(xlm_client.balance(&student), reward);

        // Step 4: Employer pays
        let xlm_admin = token::StellarAssetClient::new(&env, &xlm_id);
        let pay: i128 = 150_000_000;
        xlm_admin.mint(&employer, &pay);
        client.link_payment(&employer, &xlm_id, &hash, &pay).unwrap();

        // Student has both reward + employer payment
        assert_eq!(xlm_client.balance(&student), reward + pay);

        // Step 5: Certificate still valid after all transactions
        assert!(client.verify_certificate(&hash).unwrap());
    }
}
