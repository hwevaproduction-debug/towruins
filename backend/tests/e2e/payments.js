async function run(state, api, assert, test) {
  await test('Initiate listing fee', async () => {
    const { status, body } = await api(
      'POST',
      '/api/v1/payments/listing-fee',
      { listingId: state.listingId, earlyAccess: true },
      state.landlordToken
    );
    assert(status === 201, `expected 201, got ${status}`);
    assert(body && body.data && body.data.listing, 'expected listing data');
    assert(
      body.data.listing.status === 'early_access',
      `expected early_access, got ${JSON.stringify(body.data.listing)}`
    );
  });

  await test('early_access listing hidden from non-premium tenant', async () => {
    const { status } = await api(
      'GET',
      `/api/v1/listings/listing/${state.listingId}`,
      undefined,
      state.tenantToken
    );
    assert(status === 404, `expected 404, got ${status}`);
  });

  await test('Initiate tenant premium', async () => {
    const { status, body } = await api(
      'POST',
      '/api/v1/payments/tenant-premium',
      {},
      state.tenantToken
    );
    assert(status === 201, `expected 201, got ${status}`);
    assert(body && body.data && body.data.user, 'expected tenant user data');
  });

  await test('early_access listing visible to premium tenant', async () => {
    const { status, body } = await api(
      'GET',
      `/api/v1/listings/listing/${state.listingId}`,
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(body && body.data && body.data.status === 'early_access', `expected early_access, got ${JSON.stringify(body)}`);
  });

  await test('Wallet transactions capture listing and premium token debits', async () => {
    const landlordWallet = await api(
      'GET',
      '/api/v1/users/wallet/transactions?limit=20',
      undefined,
      state.landlordToken
    );
    assert(landlordWallet.status === 200, `expected 200, got ${landlordWallet.status}`);
    assert(Array.isArray(landlordWallet.body?.data?.transactions), 'expected landlord wallet transactions array');
    assert(
      landlordWallet.body.data.transactions.some((item) => item.reason === 'listing_activation'),
      'expected listing_activation wallet transaction'
    );

    const { status, body } = await api(
      'GET',
      '/api/v1/users/wallet/transactions?limit=20',
      undefined,
      state.tenantToken
    );
    assert(status === 200, `expected 200, got ${status}`);
    assert(Array.isArray(body?.data?.transactions), 'expected wallet transactions array');
    assert(
      body.data.transactions.some((item) => item.reason === 'premium_access'),
      'expected premium_access wallet transaction'
    );
  });

  await test('Tenant cannot initiate listing fee', async () => {
    const { status } = await api(
      'POST',
      '/api/v1/payments/listing-fee',
      { listingId: state.listingId },
      state.tenantToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test('Landlord cannot initiate tenant premium', async () => {
    const { status } = await api(
      'POST',
      '/api/v1/payments/tenant-premium',
      {},
      state.landlordToken
    );
    assert(status === 403, `expected 403, got ${status}`);
  });
}

module.exports = { run };
