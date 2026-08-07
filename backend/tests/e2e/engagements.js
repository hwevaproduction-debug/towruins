async function run(state, api, assert, test) {
  await test("Landlord cannot create tenant engagement", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/engagements",
      { listingId: state.listingId, message: "I am interested." },
      state.landlordToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("Tenant creates listing engagement", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/engagements",
      {
        listingId: state.listingId,
        message: "I would like to view this property.",
      },
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.engagement?.id, "expected engagement id");
    assert(body.data.engagement.status === "PENDING", "expected pending engagement");
    state.engagementId = body.data.engagement.id;
  });

  await test("Duplicate pending engagement is rejected", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/engagements",
      {
        listingId: state.listingId,
        message: "Sending the same enquiry again.",
      },
      state.tenantToken
    );
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("Tenant sees own pending engagement with hidden contact details", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/engagements/mine",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(Array.isArray(body?.data), "expected body.data array");
    const engagement = body.data.find((item) => item.id === state.engagementId);
    assert(engagement, "expected created engagement");
    assert(engagement.status === "PENDING", "expected pending status");
    assert(engagement.listing?.phoneNumber === null, "expected phone hidden while pending");
  });

  await test("Landlord receives engagement notification", async () => {
    const unread = await api(
      "GET",
      "/api/v1/notifications/unread-count",
      undefined,
      state.landlordToken
    );
    assert(unread.status === 200, `expected 200, got ${unread.status}`);
    assert(Number(unread.body?.data?.count || 0) >= 1, "expected unread notification");

    const { status, body } = await api(
      "GET",
      "/api/v1/notifications?limit=10",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(Array.isArray(body?.data), "expected notifications array");
    assert(
      body.data.some((notification) => notification.event === "engagement.new"),
      "expected engagement.new notification"
    );
  });

  await test("Landlord sees incoming engagement", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/engagements/incoming",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(Array.isArray(body?.data), "expected body.data array");
    assert(
      body.data.some((engagement) => engagement.id === state.engagementId),
      "incoming engagement not found"
    );
  });

  await test("Tenant cannot approve engagement", async () => {
    const { status } = await api(
      "PATCH",
      `/api/v1/engagements/${state.engagementId}`,
      { action: "approve" },
      state.tenantToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("Landlord approves engagement", async () => {
    const { status, body } = await api(
      "PATCH",
      `/api/v1/engagements/${state.engagementId}`,
      { action: "approve" },
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.engagement?.status === "APPROVED", "expected approved status");
  });

  await test("Approved engagement reveals listing contact details to tenant", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/engagements/mine",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    const engagement = body?.data?.find((item) => item.id === state.engagementId);
    assert(engagement?.status === "APPROVED", "expected approved engagement");
    assert(engagement.listing?.phoneNumber, "expected phone visible after approval");
  });

  await test("Tenant receives approval notification and can mark all read", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/notifications?limit=10",
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(
      body?.data?.some((notification) => notification.event === "engagement.approved"),
      "expected engagement.approved notification"
    );

    const readAll = await api(
      "PUT",
      "/api/v1/notifications/read-all",
      undefined,
      state.tenantToken
    );
    assert(readAll.status === 200, `expected 200, got ${readAll.status}`);
  });
}

module.exports = { run };
