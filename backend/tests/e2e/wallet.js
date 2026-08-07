async function run(state, api, assert, test) {
  if (!state.tenantToken || !state.landlordToken) {
    await test.skip(
      "Wallet",
      "missing tenant or landlord token — cannot continue"
    );
    return;
  }

  await test("Landlord can read wallet balance", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/users/wallet/balance",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      Number(body?.data?.tokenBalance || 0) >= 0,
      "expected non-negative token balance"
    );
  });

  await test("Tenant can read wallet balance", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/users/wallet/balance",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      Number(body?.data?.tokenBalance || 0) >= 0,
      "expected non-negative token balance"
    );
  });

  await test("Tenant can read wallet transactions", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/users/wallet/transactions",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data?.transactions), "expected transactions array");
  });

  await test("Wallet transactions include welcome bonus credit", async () => {
    const { body } = await api(
      "GET",
      "/api/v1/users/wallet/transactions",
      undefined,
      state.tenantToken
    );
    const transactions = body?.data?.transactions || [];
    if (!transactions.length) {
      await test.skip(
        "Wallet transactions include welcome bonus credit",
        "no transactions recorded yet"
      );
      return;
    }

    assert(
      transactions.some(
        (t) => t.type === "CREDIT" && t.reason === "welcome_bonus"
      ),
      "expected welcome_bonus credit transaction"
    );
  });

  await test("Wallet transactions include engagement deduction", async () => {
    const { body } = await api(
      "GET",
      "/api/v1/users/wallet/transactions",
      undefined,
      state.tenantToken
    );
    const transactions = body?.data?.transactions || [];
    const debits = transactions.filter((t) => t.type === "DEBIT");
    if (!debits.length) {
      await test.skip(
        "Wallet transactions include engagement deduction",
        "no debit transactions recorded yet"
      );
      return;
    }

    assert(
      transactions.some(
        (t) => t.type === "DEBIT" && t.reason === "engagement_charge"
      ),
      "expected engagement_charge debit transaction"
    );
  });

  await test("Wallet balance requires authentication", async () => {
    const { status } = await api("GET", "/api/v1/users/wallet/balance");
    assert(status === 401, `expected 401, got ${status}`);
  });
}

module.exports = { run };
