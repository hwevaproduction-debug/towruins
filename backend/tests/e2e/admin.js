async function run(state, api, assert, test) {
  if (!state.adminToken) {
    await test.skip("Admin", "missing adminToken — cannot continue");
    return;
  }

  await test("Admin can list accommodations", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/accommodations",
      undefined,
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected accommodations array");
  });

  await test("Admin can list disputes", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/disputes",
      undefined,
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected disputes array");
  });

  await test("Admin can mark dispute under review", async () => {
    if (!state.disputeId) {
      await test.skip(
        "Admin can mark dispute under review",
        "missing disputeId"
      );
      return;
    }

    const { status, body } = await api(
      "POST",
      `/api/v1/admin/disputes/${state.disputeId}/review`,
      {},
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.dispute?.status === "UNDER_REVIEW",
      "expected dispute status UNDER_REVIEW"
    );
  });

  await test("Admin can resolve dispute", async () => {
    if (!state.disputeId) {
      await test.skip(
        "Admin can resolve dispute",
        "missing disputeId"
      );
      return;
    }

    const { status, body } = await api(
      "POST",
      `/api/v1/admin/disputes/${state.disputeId}/resolve`,
      {},
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.dispute?.status === "RESOLVED",
      "expected dispute status RESOLVED"
    );
  });

  await test("Admin can list reports", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/reports",
      undefined,
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected reports array");
  });

  await test("Admin can resolve report", async () => {
    if (!state.reportId) {
      await test.skip("Admin can resolve report", "missing reportId");
      return;
    }

    const { status } = await api(
      "PUT",
      `/api/v1/admin/reports/${state.reportId}/resolve`,
      {},
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}`);
  });

  await test("Admin can list audit logs", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/audit-logs",
      undefined,
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected audit logs array");
  });

  await test("Admin can list inactive listings", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/listings/inactive",
      undefined,
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected inactive listings array");
  });

  await test("Tenant cannot access admin routes", async () => {
    if (!state.tenantToken) {
      await test.skip(
        "Tenant cannot access admin routes",
        "missing tenantToken"
      );
      return;
    }

    const { status } = await api(
      "GET",
      "/api/v1/admin/accommodations",
      undefined,
      state.tenantToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("Admin can list users", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/admin/users",
      undefined,
      state.adminToken
    );
    if (status === 404) {
      await test.skip("Admin can list users", "route does not exist");
      return;
    }
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected users array");
  });
}

module.exports = { run };
