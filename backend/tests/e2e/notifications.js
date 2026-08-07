async function run(state, api, assert, test) {
  if (!state.landlordToken || !state.tenantToken) {
    await test.skip(
      "Notifications",
      "missing landlord or tenant token — cannot continue"
    );
    return;
  }

  await test("Landlord can fetch unread notification count", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/notifications/unread-count",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Number(body?.data?.count || 0) >= 0, "expected non-negative count");
  });

  await test("Landlord can list notifications", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/notifications?limit=5",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected notifications array");
    if (body.data.length > 0) {
      state.notificationId = body.data[0]._id || body.data[0].id;
    }
  });

  await test("Landlord can mark notification as read", async () => {
    if (!state.notificationId) {
      await test.skip("Mark notification as read", "no notification id captured");
      return;
    }

    const { status, body } = await api(
      "PUT",
      `/api/v1/notifications/${state.notificationId}/read`,
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.notification?.isRead === true, "expected isRead true");
  });

  await test("Landlord can mark all notifications as read", async () => {
    const { status } = await api(
      "PUT",
      "/api/v1/notifications/read-all",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
  });

  await test("Tenant can save push subscription", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/notifications/push-subscription",
      {
        endpoint: "https://example.com/push/e2e",
        keys: { p256dh: "e2e-p256dh", auth: "e2e-auth" },
      },
      state.tenantToken
    );
    assert(status === 200 || status === 201, `expected 200 or 201, got ${status}`);
  });

  await test("Tenant can delete push subscription", async () => {
    const { status } = await api(
      "DELETE",
      "/api/v1/notifications/push-subscription",
      undefined,
      state.tenantToken
    );
    assert(status === 200 || status === 204, `expected 200 or 204, got ${status}`);
  });

  await test("Tenant can read notification preferences", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/notifications/preferences",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      "emailEnabled" in (body?.data || body),
      "expected emailEnabled field in preferences"
    );
    assert(
      "pushEnabled" in (body?.data || body),
      "expected pushEnabled field in preferences"
    );
    assert(
      "inAppEnabled" in (body?.data || body),
      "expected inAppEnabled field in preferences"
    );
  });

  await test("Tenant can update notification preferences", async () => {
    const { status, body } = await api(
      "PUT",
      "/api/v1/notifications/preferences",
      { emailEnabled: false },
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      (body?.data || body)?.emailEnabled === false,
      "expected emailEnabled false"
    );
  });

  await test("Tenant can restore notification preferences", async () => {
    const { status, body } = await api(
      "PUT",
      "/api/v1/notifications/preferences",
      { emailEnabled: true },
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      (body?.data || body)?.emailEnabled === true,
      "expected emailEnabled true"
    );
  });

  await test("Notifications require authentication", async () => {
    const { status } = await api("GET", "/api/v1/notifications");
    assert(status === 401, `expected 401, got ${status}`);
  });
}

module.exports = { run };
