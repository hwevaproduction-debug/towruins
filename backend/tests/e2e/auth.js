const LANDLORD_PHONE_NUMBER = '+263771234567';
const LANDLORD_NATIONAL_ID = '63-123-45-67A';

async function run(state, api, assert, test) {
  await test('Health check', async () => {
    const { status, body } = await api('GET', '/');
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.status === 'ok', `expected body.status=ok, got ${JSON.stringify(body)}`);
  });

  await test('Landlord signup', async () => {
    const { status, body } = await api('POST', '/api/v1/users/signup', {
      username: state.landlordUsername || 'landlord_e2e',
      email: state.landlordEmail,
      password: state.password,
      role: 'landlord',
      phoneNumber: state.landlordPhoneNumber || LANDLORD_PHONE_NUMBER,
      nationalId: state.landlordNationalId || LANDLORD_NATIONAL_ID,
    });
    assert(status === 201, `expected 201, got ${status}`);
    if (body && body.token) {
      state.landlordToken = body.token;
      state.landlordSignupState = 'token';
      state.landlordTokenFromSignup = true;
    } else {
      const validPendingStatuses = ['pending_verification', 'pending_phone_verification'];
      assert(
        body && validPendingStatuses.includes(body.status),
        `expected pending_verification or pending_phone_verification, got ${JSON.stringify(body)}`
      );
      state.landlordSignupState = body.status;
    }
    assert(body.data && body.data.user && body.data.user._id, 'expected landlord user id');
    state.landlordId = body.data.user._id;
  });

  await test('Tenant signup', async () => {
    const { status, body } = await api('POST', '/api/v1/users/signup', {
      username: state.tenantUsername || 'tenant_e2e',
      email: state.tenantEmail,
      password: state.password,
      role: 'tenant',
    });
    assert(status === 201, `expected 201, got ${status}`);
    if (body && body.token) {
      state.tenantToken = body.token;
      state.tenantSignupState = 'token';
    } else {
      assert(
        body && body.status === 'pending_verification',
        `expected pending_verification, got ${JSON.stringify(body)}`
      );
      state.tenantSignupState = body.status;
    }
    assert(body.data && body.data.user && body.data.user._id, 'expected tenant user id');
    state.tenantId = body.data.user._id;
  });

  await test('Duplicate email rejected', async () => {
    const { status } = await api('POST', '/api/v1/users/signup', {
      username: `${state.landlordUsername || 'landlord_e2e'}_dup`,
      email: state.landlordEmail,
      password: state.password,
      role: 'landlord',
      phoneNumber: state.landlordPhoneNumber || LANDLORD_PHONE_NUMBER,
      nationalId: state.landlordNationalId || LANDLORD_NATIONAL_ID,
    });
    assert(status === 400 || status === 409, `expected 400 or 409, got ${status}`);
  });

  await test('Landlord signup stores token or pending verification state', async () => {
    assert(state.landlordId, 'expected landlord id after signup');
    assert(
      state.landlordSignupState === 'token' ||
        state.landlordSignupState === 'pending_verification' ||
        state.landlordSignupState === 'pending_phone_verification',
      'expected landlord signup state to be captured'
    );
  });

  await test('Tenant signup stores token or pending verification state', async () => {
    assert(state.tenantId, 'expected tenant id after signup');
    assert(
      state.tenantSignupState === 'token' || state.tenantSignupState === 'pending_verification',
      'expected tenant signup state to be captured'
    );
  });

  await test('Landlord login succeeds', async () => {
    if (state.landlordTokenFromSignup) {
      assert(state.landlordSignupState === 'token', 'expected landlord token from signup');
      return;
    }

    const { status, body } = await api('POST', '/api/v1/users/login', {
      email: state.landlordEmail,
      password: state.password,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.token, 'expected login token');
    state.landlordToken = body.token;
  });

  await test('Tenant login succeeds', async () => {
    const { status, body } = await api('POST', '/api/v1/users/login', {
      email: state.tenantEmail,
      password: state.password,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.token, 'expected login token');
    state.tenantToken = body.token;
  });

  await test('Landlord login refreshes token', async () => {
    if (state.landlordTokenFromSignup) {
      assert(state.landlordSignupState === 'token', 'expected landlord token from signup');
      return;
    }

    const { status, body } = await api('POST', '/api/v1/users/login', {
      email: state.landlordEmail,
      password: state.password,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.token, 'expected login token');
    state.landlordToken = body.token;
  });

  await test('Tenant login refreshes token', async () => {
    const { status, body } = await api('POST', '/api/v1/users/login', {
      email: state.tenantEmail,
      password: state.password,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.token, 'expected login token');
    state.tenantToken = body.token;
  });

  await test('Wrong password rejected', async () => {
    const { status } = await api('POST', '/api/v1/users/login', {
      email: state.landlordEmail,
      password: 'wrongpass',
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('GET /me with token', async () => {
    const { status, body } = await api('GET', '/api/v1/users/me', undefined, state.landlordToken);
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.data && body.data.user && body.data.user._id, 'expected authenticated user id');
  });

  await test('GET /me without token', async () => {
    const { status } = await api('GET', '/api/v1/users/me');
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('Protected listing route without token', async () => {
    const { status } = await api('POST', '/api/v1/listings', {
      name: 'Unauthorized Listing',
      address: '123 Test Street',
      description: 'Should fail',
      monthlyRent: 500,
      bedrooms: 1,
      totalRooms: 1,
      bathrooms: 1,
      furnished: false,
      amenities: { solar: false },
      imageUrls: ['https://example.com/img.jpg'],
      phoneNumber: '+263771234567',
      type: 'rent',
      offer: false,
      location: 'TestCity',
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('Protected saved-search route without token', async () => {
    const { status } = await api('POST', '/api/v1/saved-searches', {
      name: 'Unauthorized Search',
      criteria: {},
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test("GET /users/check-availability with unused email", async () => {
    const uniqueEmail = `newunique_${Date.now()}@test.creapy.com`;
    const { status, body } = await api(
      "GET",
      `/api/v1/users/check-availability?email=${encodeURIComponent(uniqueEmail)}`
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(
      body?.data?.emailAvailable ?? body?.emailAvailable === true,
      "expected email to be available"
    );
  });

  await test("GET /users/check-availability with existing landlord email", async () => {
    const { status, body } = await api(
      "GET",
      `/api/v1/users/check-availability?email=${encodeURIComponent(state.landlordEmail)}`
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.emailAvailable === false || body?.emailAvailable === false, "expected email to be unavailable");
  });

  await test("GET /users/check-availability with existing landlord username", async () => {
    const { status, body } = await api(
      "GET",
      `/api/v1/users/check-availability?username=${encodeURIComponent(state.landlordUsername)}`
    );
    assert(status === 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body?.data?.usernameAvailable === false || body?.usernameAvailable === false, "expected username to be unavailable");
  });

  await test("Landlord can request password reset", async () => {
    const { status } = await api("POST", "/api/v1/users/forgot-password", {
      email: state.landlordEmail,
    });
    assert(status === 200, `expected 200, got ${status}`);
  });

  await test("Forgot password does not reveal user existence", async () => {
    const { status } = await api("POST", "/api/v1/users/forgot-password", {
      email: "nonexistent_e2e@test.creapy.com",
    });
    assert(status === 200, `expected 200, got ${status}`);
  });

  await test("Landlord can resend email verification", async () => {
    const { status } = await api(
      "POST",
      "/api/v1/users/resend-verification",
      undefined,
      state.landlordToken
    );
    assert(status === 200, `expected 200, got ${status}`);
  });

  if (!state.landlordToken || !state.tenantToken) {
    throw new Error('Auth group: missing landlord or tenant token — cannot continue');
  }
}

module.exports = { run };
