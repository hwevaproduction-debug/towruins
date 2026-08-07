async function run(state, api, assert, test) {
  if (!state.bookingId || !state.adminToken || !state.tenantToken) {
    await test.skip(
      "Reviews",
      "missing bookingId or adminToken or tenantToken — cannot continue"
    );
    return;
  }

  await test("Review submission fails for cancelled booking", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/reviews",
      {
        bookingId: state.bookingId,
        overallRating: 5,
        comment: "E2E review before settle",
      },
      state.tenantToken
    );
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("Admin can settle booking to completed", async () => {
    const { status, body } = await api(
      "PUT",
      `/api/v1/bookings/${state.bookingId}/settle`,
      {},
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.booking?.status === "COMPLETED",
      "expected completed booking"
    );
  });

  await test("Tenant can submit review for completed booking", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/reviews",
      {
        bookingId: state.bookingId,
        overallRating: 5,
        comment: "E2E review after settle",
      },
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.review?._id, "expected review id");
    state.reviewId = body.data.review._id;
  });

  await test("Duplicate review submission is rejected", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/reviews",
      {
        bookingId: state.bookingId,
        overallRating: 4,
        comment: "Duplicate review attempt",
      },
      state.tenantToken
    );
    assert(status === 409, `expected 409, got ${status}`);
  });

  await test("Accommodation reviews can be listed", async () => {
    if (!state.accommodationId) {
      await test.skip(
        "Accommodation reviews can be listed",
        "missing accommodationId"
      );
      return;
    }

    const { status, body } = await api(
      "GET",
      `/api/v1/accommodations/${state.accommodationId}/reviews`
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data), "expected reviews array");
  });

  await test("Provider can respond to review", async () => {
    if (!state.reviewId || !state.providerToken) {
      await test.skip(
        "Provider can respond to review",
        "missing reviewId or providerToken"
      );
      return;
    }

    const { status, body } = await api(
      "POST",
      `/api/v1/reviews/${state.reviewId}/response`,
      { providerResponse: "Thank you for your review!" },
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.review?.providerResponse === "Thank you for your review!",
      "expected providerResponse to be set"
    );
  });

  await test("Review endpoints require authentication", async () => {
    const { status } = await api("POST", "/api/v1/reviews", {
      bookingId: state.bookingId,
      overallRating: 5,
    });
    assert(status === 401, `expected 401, got ${status}`);
  });
}

module.exports = { run };
