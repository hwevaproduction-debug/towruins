const isoDate = (date) => date.toISOString().slice(0, 10);
const daysFromNow = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
};

const hasProviderPrerequisites = (state) =>
  Boolean(state.adminEmail && state.adminPassword) &&
  process.env.SKIP_EMAIL_VERIFICATION === "true";

async function run(state, api, assert, test) {
  const checkIn = daysFromNow(45);
  const checkOut = daysFromNow(47);
  const blockStart = daysFromNow(90);
  const blockEnd = daysFromNow(91);

  await test("Public stays search endpoint responds", async () => {
    const { status, body } = await api("GET", "/api/v1/stays?limit=1");
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Array.isArray(body?.data?.stays), "expected data.stays array");
  });

  await test("Pricing quote validates required fields", async () => {
    const { status } = await api("POST", "/api/v1/pricing/quote", {});
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("Accommodation management route requires authentication", async () => {
    const { status } = await api("GET", "/api/v1/accommodations/mine");
    assert(status === 401, `expected 401, got ${status}`);
  });

  if (!hasProviderPrerequisites(state)) {
    await test.skip(
      "Provider stay lifecycle",
      "set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and SKIP_EMAIL_VERIFICATION=true"
    );
    return;
  }

  await test("Admin login for provider approval", async () => {
    const { status, body } = await api("POST", "/api/v1/users/login", {
      email: state.adminEmail,
      password: state.adminPassword,
    });
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.token, "expected admin token");
    state.adminToken = body.token;
  });

  await test("Provider registers accommodation business", async () => {
    const { status, body } = await api("POST", "/api/v1/providers/register", {
      username: state.providerUsername,
      email: state.providerEmail,
      password: state.password,
      phoneNumber: state.providerPhoneNumber,
      nationalId: state.providerNationalId,
      providerProfile: {
        businessName: `E2E Stay ${Date.now()}`,
        businessType: "HOTEL",
        registrationNumber: `E2E-${Date.now()}`,
        contactPhone: state.providerPhoneNumber,
        address: "100 E2E Avenue",
        description: "Temporary stay created by the e2e suite.",
        location: {
          province: "Harare",
          city: "Harare",
          addressLine: "100 E2E Avenue",
        },
      },
    });
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.user?._id, "expected provider id");
    state.providerId = body.data.user._id;
  });

  await test("Provider login succeeds", async () => {
    const { status, body } = await api("POST", "/api/v1/users/login", {
      email: state.providerEmail,
      password: state.password,
    });
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.token, "expected provider token");
    state.providerToken = body.token;
  });

  await test("Provider can read own accommodation shell", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/accommodations/mine",
      undefined,
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.accommodation?._id, "expected accommodation id");
    state.accommodationId = body.data.accommodation._id;
  });

  await test("Admin approves provider verification", async () => {
    const { status, body } = await api(
      "PUT",
      `/api/v1/providers/${state.providerId}/verify`,
      { verificationStatus: "approved", verificationNotes: "Approved by e2e" },
      state.adminToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  });

  await test("Provider publishes accommodation profile", async () => {
    const { status, body } = await api(
      "PATCH",
      `/api/v1/accommodations/${state.accommodationId}`,
      {
        name: "E2E Published Stay",
        description: "Published temporary stay from e2e.",
        contactPhone: state.providerPhoneNumber,
        province: "Harare",
        city: "Harare",
        addressLine: "100 E2E Avenue",
        timezone: "Africa/Harare",
        type: "HOTEL",
        isPublished: true,
      },
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.accommodation?.isPublished === true, "expected published accommodation");
  });

  await test("Provider configures accommodation policies", async () => {
    const cancellation = await api(
      "PUT",
      `/api/v1/accommodations/${state.accommodationId}/cancellation-policy`,
      {
        policyType: "FLEXIBLE",
        freeCancellationHours: 24,
        refundPercentage: 100,
      },
      state.providerToken
    );
    assert(cancellation.status === 200, `expected 200, got ${cancellation.status}`);

    const checkInRules = await api(
      "PUT",
      `/api/v1/accommodations/${state.accommodationId}/checkin-rules`,
      {
        checkInFrom: "14:00",
        checkInUntil: "22:00",
        checkOutBy: "10:00",
        selfCheckIn: true,
        selfCheckInMethod: "Lockbox",
      },
      state.providerToken
    );
    assert(checkInRules.status === 200, `expected 200, got ${checkInRules.status}`);

    const tax = await api(
      "PUT",
      `/api/v1/accommodations/${state.accommodationId}/tax`,
      {
        label: "VAT",
        percentage: 0,
        isInclusive: false,
        appliesTo: "SUBTOTAL",
      },
      state.providerToken
    );
    assert(tax.status === 200, `expected 200, got ${tax.status}`);
  });

  await test("Provider adds accommodation image", async () => {
    const { status, body } = await api(
      "POST",
      `/api/v1/accommodations/${state.accommodationId}/images`,
      {
        url: "https://example.com/e2e-accommodation.jpg",
        altText: "E2E accommodation",
        isCover: true,
        sortOrder: 0,
      },
      state.providerToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.accommodationImage?._id, "expected accommodation image id");
    state.accommodationImageId = body.data.accommodationImage._id;
  });

  await test("Provider creates room", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/rooms",
      {
        accommodationId: state.accommodationId,
        name: "E2E Double Room",
        description: "A test room for stay booking e2e.",
        roomType: "DOUBLE",
        capacity: 2,
        basePricePerNight: 75,
        status: "AVAILABLE",
        bookingMode: "REQUEST",
        maxAdvanceBookingDays: 180,
        minNights: 1,
      },
      state.providerToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.room?._id, "expected room id");
    state.roomId = body.data.room._id;
  });

  await test("Provider manages room media, fees, rates, and blocks", async () => {
    const roomImage = await api(
      "POST",
      `/api/v1/rooms/${state.roomId}/images`,
      {
        url: "https://example.com/e2e-room.jpg",
        altText: "E2E room",
        isCover: true,
        sortOrder: 0,
      },
      state.providerToken
    );
    assert(roomImage.status === 201, `expected 201, got ${roomImage.status}`);
    state.roomImageId = roomImage.body?.data?.roomImage?._id;

    const roomFee = await api(
      "POST",
      `/api/v1/rooms/${state.roomId}/fees`,
      {
        feeType: "CLEANING",
        label: "Cleaning",
        amount: 5,
        currency: "USD",
        isPerStay: true,
        isOptional: false,
      },
      state.providerToken
    );
    assert(roomFee.status === 201, `expected 201, got ${roomFee.status}`);
    state.roomFeeId = roomFee.body?.data?.roomFee?._id;

    const seasonalRate = await api(
      "POST",
      `/api/v1/rooms/${state.roomId}/seasonal-rates`,
      {
        label: "E2E Standard Rate",
        rateType: "SEASONAL",
        pricePerNight: 80,
        daysOfWeek: [],
        minNightsToApply: 1,
        priority: 1,
      },
      state.providerToken
    );
    assert(seasonalRate.status === 201, `expected 201, got ${seasonalRate.status}`);
    state.seasonalRateId = seasonalRate.body?.data?.seasonalRate?._id;

    const block = await api(
      "POST",
      `/api/v1/rooms/${state.roomId}/blocks`,
      {
        startDate: blockStart,
        endDate: blockEnd,
        reason: "E2E maintenance",
      },
      state.providerToken
    );
    assert(block.status === 201, `expected 201, got ${block.status}`);
    state.roomBlockId = block.body?.data?.availabilityBlock?._id;

    const listBlocks = await api(
      "GET",
      `/api/v1/rooms/${state.roomId}/blocks`,
      undefined,
      state.providerToken
    );
    assert(listBlocks.status === 200, `expected 200, got ${listBlocks.status}`);
    assert(
      listBlocks.body?.data?.availabilityBlocks?.some(
        (item) => item._id === state.roomBlockId
      ),
      "expected created availability block"
    );

    const deleteBlock = await api(
      "DELETE",
      `/api/v1/rooms/${state.roomId}/blocks/${state.roomBlockId}`,
      undefined,
      state.providerToken
    );
    assert(deleteBlock.status === 204, `expected 204, got ${deleteBlock.status}`);
  });

  await test("Public room detail is available", async () => {
    const { status, body } = await api("GET", `/api/v1/rooms/public/${state.roomId}`);
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.room?._id === state.roomId, "expected public room id");
  });

  await test("Public stay search finds provider room", async () => {
    const query = [
      "location=Harare",
      "businessType=HOTEL",
      "roomType=DOUBLE",
      "guests=1",
      `checkIn=${encodeURIComponent(checkIn)}`,
      `checkOut=${encodeURIComponent(checkOut)}`,
      "sort=price_asc",
    ].join("&");
    const { status, body } = await api("GET", `/api/v1/stays?${query}`);
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.stays?.some((stay) => stay._id === state.roomId),
      "expected created room in stay search"
    );
  });

  await test("Provider public stays endpoint returns room", async () => {
    const { status, body } = await api("GET", `/api/v1/stays/${state.providerId}`);
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.rooms?.some((room) => room._id === state.roomId),
      "expected provider room"
    );
  });

  await test("Room availability and calendar respond", async () => {
    const availability = await api(
      "GET",
      `/api/v1/rooms/${state.roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=1`
    );
    assert(availability.status === 200, `expected 200, got ${availability.status}`);
    assert(availability.body?.data?.isAvailable === true, "expected room available");

    const calendarDate = new Date(`${checkIn}T00:00:00.000Z`);
    const calendar = await api(
      "GET",
      `/api/v1/rooms/${state.roomId}/calendar?year=${calendarDate.getUTCFullYear()}&month=${
        calendarDate.getUTCMonth() + 1
      }`
    );
    assert(calendar.status === 200, `expected 200, got ${calendar.status}`);
    assert(Array.isArray(calendar.body?.data?.unavailableDates), "expected calendar dates");
  });

  await test("Pricing quote can be generated for room", async () => {
    const { status, body } = await api("POST", "/api/v1/pricing/quote", {
      roomId: state.roomId,
      checkIn,
      checkOut,
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
    });
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(Number(body?.data?.quote?.grandTotal || 0) > 0, "expected positive quote total");
  });

  await test("Tenant creates stay booking request", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/bookings",
      {
        roomId: state.roomId,
        checkIn,
        checkOut,
        adultCount: 1,
        childCount: 0,
        infantCount: 0,
        specialRequests: "E2E booking request",
      },
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.booking?._id, "expected booking id");
    state.bookingId = body.data.booking._id;
    assert(
      ["PENDING_CONFIRMATION", "PENDING_PAYMENT"].includes(body.data.booking.status),
      `unexpected booking status ${body.data.booking.status}`
    );
  });

  await test("Tenant and provider can read booking", async () => {
    const tenantBooking = await api(
      "GET",
      `/api/v1/bookings/${state.bookingId}`,
      undefined,
      state.tenantToken
    );
    assert(tenantBooking.status === 200, `expected 200, got ${tenantBooking.status}`);

    const providerBooking = await api(
      "GET",
      "/api/v1/bookings/provider",
      undefined,
      state.providerToken
    );
    assert(providerBooking.status === 200, `expected 200, got ${providerBooking.status}`);
    assert(
      providerBooking.body?.data?.bookings?.some((booking) => booking._id === state.bookingId),
      "expected provider booking list to include booking"
    );
  });

  await test("Tenant submits guest info", async () => {
    const { status, body } = await api(
      "POST",
      `/api/v1/bookings/${state.bookingId}/guest-info`,
      {
        fullName: "E2E Guest",
        phone: "+263771234567",
        nationalId: "63-111-22-33C",
        estimatedArrivalTime: "16:00",
        additionalNotes: "E2E guest notes",
      },
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.guestInfo?._id, "expected guest info id");
  });

  await test("Provider confirms booking request", async () => {
    const { status, body } = await api(
      "POST",
      `/api/v1/bookings/${state.bookingId}/confirm`,
      {},
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      ["CONFIRMED", "PENDING_PAYMENT"].includes(body?.data?.booking?.status),
      `unexpected status ${body?.data?.booking?.status}`
    );
  });

  await test("Provider analytics include booking surface", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/providers/me/analytics",
      undefined,
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data && typeof body.data.bookingCount === "number", "expected analytics data");
  });

  await test("Tenant can initiate booking payment", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/bookings/initiate-payment",
      {
        bookingId: state.bookingId,
        phone: "+263771234567",
        idempotencyKey: `e2e-booking-${state.bookingId}`,
      },
      state.tenantToken
    );
    assert(status === 200 || status === 201, `expected 200 or 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.transactionRef, "expected payment transactionRef");
    state.bookingPaymentRef = body.data.transactionRef;
  });

  await test("Tenant can preview cancellation", async () => {
    const { status, body } = await api(
      "GET",
      `/api/v1/bookings/${state.bookingId}/cancellation-preview`,
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data, "expected cancellation preview data");
  });

  await test("Tenant can raise booking dispute", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/disputes",
      {
        bookingId: state.bookingId,
        reason: "other",
        description: "E2E dispute for booking flow coverage.",
      },
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.dispute?._id, "expected dispute id");
    state.disputeId = body.data.dispute._id;
  });

  await test("Tenant can cancel booking", async () => {
    const { status, body } = await api(
      "POST",
      `/api/v1/bookings/${state.bookingId}/cancel`,
      { reason: "E2E cancellation" },
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.booking?.status === "CANCELLED", "expected cancelled booking");
  });

  await test("Provider can create promotion", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/promotions",
      {
        accommodationId: state.accommodationId,
        name: "E2E Promo",
        discountType: "PERCENTAGE",
        discountValue: 10,
        startDate: daysFromNow(1),
        endDate: daysFromNow(30),
        isActive: true,
      },
      state.providerToken
    );
    assert(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.promotion?._id || body?.data?.promotion?.id,
      "expected promotion id"
    );
    state.promotionId = body?.data?.promotion?._id || body?.data?.promotion?.id;
  });

  await test("Provider can generate promotion coupons", async () => {
    if (!state.promotionId) {
      await test.skip(
        "Provider can generate promotion coupons",
        "missing promotionId"
      );
      return;
    }

    const { status, body } = await api(
      "POST",
      `/api/v1/promotions/${state.promotionId}/coupons`,
      { count: 1, prefix: "E2E" },
      state.providerToken
    );
    assert(status === 200 || status === 201, `expected 200 or 201, got ${status}`);
    const coupons = body?.data?.coupons || [];
    if (coupons.length > 0) {
      state.couponId = coupons[0]._id || coupons[0].id;
    }
  });

  await test("Pricing quote works without coupon", async () => {
    const { status, body } = await api(
      "POST",
      "/api/v1/pricing/quote",
      {
        roomId: state.roomId,
        checkIn: daysFromNow(45),
        checkOut: daysFromNow(47),
        adultCount: 1,
        childCount: 0,
        infantCount: 0,
      },
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      Number(body?.data?.quote?.grandTotal || 0) > 0,
      "expected positive grand total"
    );
  });

  await test("Provider analytics include net payout", async () => {
    const { status, body } = await api(
      "GET",
      "/api/v1/providers/me/analytics",
      undefined,
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      Number(body?.data?.netPayout || 0) >= 0,
      "expected non-negative netPayout"
    );
  });

  await test("Provider can update room name", async () => {
    const { status, body } = await api(
      "PATCH",
      `/api/v1/rooms/${state.roomId}`,
      { name: "E2E Double Room Updated" },
      state.providerToken
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.room?.name === "E2E Double Room Updated",
      "expected updated room name"
    );
  });
}

module.exports = { run };
