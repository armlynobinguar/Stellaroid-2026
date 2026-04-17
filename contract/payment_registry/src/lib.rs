#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

/// Persistent storage keys for aggregate payment statistics.
#[contracttype]
pub enum DataKey {
    PaymentCount,
    TotalVolumeStroops,
}

#[contract]
pub struct PaymentRegistry;

#[contractimpl]
impl PaymentRegistry {
    /// Records a payment line in the registry (metadata + running totals).
    /// The payer must sign the transaction (`payer.require_auth()`).
    ///
    /// - Increments total payment count and cumulative volume (stroops).
    /// - Emits `pay_log` for indexers and real-time UIs.
    pub fn log_payment(
        env: Env,
        payer: Address,
        payee: Address,
        amount: i128,
        ref_id: Symbol,
    ) {
        payer.require_auth();

        let mut count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0u64);
        count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::PaymentCount, &count);

        let mut vol: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalVolumeStroops)
            .unwrap_or(0i128);
        vol += amount;
        env.storage()
            .persistent()
            .set(&DataKey::TotalVolumeStroops, &vol);

        env.events().publish(
            (symbol_short!("pay_log"), payer.clone()),
            (payee, amount, ref_id),
        );
    }

    /// Returns `(payment_count, total_volume_stroops)` for dashboards.
    pub fn get_stats(env: Env) -> (u64, i128) {
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0u64);
        let vol: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalVolumeStroops)
            .unwrap_or(0i128);
        (count, vol)
    }
}

#[cfg(test)]
mod test;
