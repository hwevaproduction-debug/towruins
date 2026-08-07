async function run(state, api, assert, test) {
  await test("Terms of use is accessible publicly", async () => {
    const { status, body } = await api("GET", "/api/v1/legal-docs/terms-of-use");
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  });

  await test("Privacy policy is accessible publicly", async () => {
    const { status, body } = await api("GET", "/api/v1/legal-docs/privacy-policy");
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  });

  await test("Nonexistent legal doc returns null data", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/legal-docs/nonexistent-slug-xyz-e2e"
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data === null, "expected null data for nonexistent slug");
  });
}

module.exports = { run };
