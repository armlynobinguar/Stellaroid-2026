#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env, Symbol,
    };

    use crate::{PaymentRegistry, PaymentRegistryClient};

    fn setup() -> (Env, PaymentRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, PaymentRegistry);
        let client = PaymentRegistryClient::new(&env, &id);
        (env, client)
    }

    #[test]
    fn log_payment_updates_stats() {
        let (env, client) = setup();
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let ref_id = Symbol::new(&env, "INV001");

        client.log_payment(&payer, &payee, &1_000_000, &ref_id);

        let (count, vol) = client.get_stats();
        assert_eq!(count, 1);
        assert_eq!(vol, 1_000_000);
    }

    #[test]
    fn get_stats_starts_at_zero() {
        let (_env, client) = setup();
        let (count, vol) = client.get_stats();
        assert_eq!(count, 0);
        assert_eq!(vol, 0);
    }
}
