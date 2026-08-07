async function run(state, api, assert, test) {
  await test("Unauthenticated user cannot submit report", async () => {
    const { status } = await api("POST", "/api/v1/reports", {
      targetType: "Listing",
      targetId: state.listingId,
      reason: "fraud",
      description: "Suspicious listing",
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test("Tenant submits listing report", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/reports",
      {
        targetType: "Listing",
        targetId: state.listingId,
        reason: "fraud",
        description: "The listing details should be reviewed.",
      },
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.report?._id, "expected report id");
    state.reportId = body.data.report._id;
  });

  await test("Invalid report reason is rejected", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/reports",
      {
        targetType: "Listing",
        targetId: state.listingId,
        reason: "not-a-valid-reason",
        description: "Invalid reason should fail.",
      },
      state.tenantToken
    );
    assert(status === 400, `expected 400, got ${status}`);
  });

  if (process.env.E2E_TEST_LEADS !== "true") {
    await test.skip(
      "Property interest lead submission",
      "set E2E_TEST_LEADS=true to exercise the email-sending lead flow"
    );
    return;
  }

  await test("Property interest lead can be submitted", async () => {
    const { status, body } = await api("POST", "/api/v1/leads/property-interest", {
      fullName: "E2E Property Owner",
      email: `owner_${Date.now()}@test.creapy.com`,
      phone: "+263771234567",
      propertyType: "Apartment",
      location: "Harare",
      description: "A test property lead from the e2e suite.",
      referral: "e2e",
    });
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.status === "success", "expected success response");
  });
}

module.exports = { run };
