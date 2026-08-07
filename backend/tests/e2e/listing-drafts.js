async function run(state, api, assert, test) {
  await test("Tenant cannot create listing draft", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/listing-drafts",
      { data: { name: "Tenant Draft" } },
      state.tenantToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("Landlord creates listing draft", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/listing-drafts",
      {
        data: {
          name: "Draft E2E Listing",
          monthlyRent: 650,
          province: "Harare",
          totalRooms: 3,
        },
      },
      state.landlordToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.draft?.id, "expected draft id");
    state.listingDraftId = body.data.draft.id;
  });

  await test("Landlord lists own drafts", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/listing-drafts/mine",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(Array.isArray(body?.data), "expected body.data array");
    assert(
      body.data.some((draft) => draft.id === state.listingDraftId),
      "created draft not found"
    );
  });

  await test("Landlord gets draft by id", async () => {
    const { status, body } = await api(
      "GET",
      `/api/v1/listing-drafts/${state.listingDraftId}`,
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(body?.data?.draft?.id === state.listingDraftId, "expected matching draft id");
  });

  await test("Landlord updates listing draft", async () => {
    const { status, body } = await api(
      "PUT",
      `/api/v1/listing-drafts/${state.listingDraftId}`,
      { data: { name: "Updated Draft E2E Listing", monthlyRent: 700 } },
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.draft?.data?.name === "Updated Draft E2E Listing",
      "expected updated draft data"
    );
  });

  await test("Tenant cannot list landlord drafts", async () => {
    const { status } = await api(
      "GET",
      "/api/v1/listing-drafts/mine",
      undefined,
      state.tenantToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("Landlord deletes listing draft", async () => {
    const { status } = await api(
      "DELETE",
      `/api/v1/listing-drafts/${state.listingDraftId}`,
      undefined,
      state.landlordToken
    );
    assert(status === 204, `expected 204, got ${status}`);
  });
}

module.exports = { run };
