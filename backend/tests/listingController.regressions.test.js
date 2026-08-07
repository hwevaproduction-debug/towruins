const test = require("node:test");
const assert = require("node:assert/strict");

const listingController = require("../controllers/listingController");
const prisma = require("../utils/prisma");
const { applyListingLifecycle, normalizeListingPayload } = listingController.__testables;

const originalListing = {
  ...prisma.listing,
};
const originalSavedSearch = {
  ...prisma.savedSearch,
};

const assertPublicContactFieldsAbsent = (listing) => {
  assert.equal(Object.prototype.hasOwnProperty.call(listing, "phoneNumber"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(listing, "address"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(listing, "addressLine"), false);
  if (
    listing.location &&
    typeof listing.location === "object" &&
    !Array.isArray(listing.location)
  ) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(listing.location, "addressLine"),
      false
    );
  }
};

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
    };

    handler(req, res, (err) => {
      if (err) {
        resolve({ error: err });
      } else {
        reject(new Error("Expected controller to resolve or error"));
      }
    });
  });

test.afterEach(() => {
  prisma.listing.count = originalListing.count;
  prisma.listing.create = originalListing.create;
  prisma.listing.findUnique = originalListing.findUnique;
  prisma.listing.findMany = originalListing.findMany;
  prisma.listing.update = originalListing.update;
  prisma.listing.updateMany = originalListing.updateMany;
  prisma.savedSearch.findMany = originalSavedSearch.findMany;
  prisma.savedSearch.update = originalSavedSearch.update;
});

test("getListing hides pending payment listings from non-owners", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_1",
    userId: "owner_1",
    status: "pending_payment",
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_1" },
    user: { id: "tenant_1", role: "tenant", isPremium: false },
  });

  assert.equal(result.error.statusCode, 404);
  assert.equal(result.error.message, "No listing found with that ID");
});

test("getListings defaults to createdAt ascending order", async () => {
  let capturedArgs;
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    capturedArgs = args;
    return [];
  };

  const result = await invokeController(listingController.getListings, {
    query: {},
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(capturedArgs.orderBy, { createdAt: "asc" });
});

test("getListings respects createdAt sort query for public listings endpoint", async () => {
  let capturedArgs;
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    capturedArgs = args;
    return [];
  };

  const result = await invokeController(listingController.getListings, {
    query: { sort: "createdAt_desc" },
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(capturedArgs.orderBy, { createdAt: "desc" });
});

test("normalizeListingPayload maps legacy price and strips non-Prisma fields", () => {
  const payload = normalizeListingPayload({
    name: "Legacy listing",
    regularPrice: 25000,
    discountedPrice: 0,
    user: "user_1",
    userRef: "user_1",
    userId: "user_1",
    location: {
      province: "Mashonaland East",
      city: "Marondera",
      addressLine: "12 Main Road",
      coordinates: { lat: -18.18, lng: 31.55 },
    },
  });

  assert.equal(payload.monthlyRent, 25000);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "regularPrice"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "discountedPrice"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "user"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "userRef"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "userId"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "location"), false);
  assert.equal(payload.province, "Mashonaland East");
  assert.equal(payload.city, "Marondera");
  assert.equal(payload.addressLine, "12 Main Road");
  assert.equal(payload.lat, -18.18);
  assert.equal(payload.lng, 31.55);
});

test("buildListingCreateData strips legacy price aliases before Prisma create", () => {
  const { buildListingCreateData } = listingController.__testables;

  const data = buildListingCreateData({
    name: "Legacy listing",
    description: "A nice place",
    address: "12 Main Road",
    phoneNumber: "+263771234567",
    regularPrice: "25000",
    discountedPrice: 0,
    user: "user_1",
    userRef: "user_1",
    userId: "user_1",
    bathrooms: "1",
    totalRooms: "2",
    furnished: false,
    type: "rent",
    offer: false,
    studentAccommodation: true,
    imageUrls: ["https://example.com/listing.jpg"],
    location: {
      province: "Mashonaland East",
      city: "Marondera",
      addressLine: "12 Main Road",
      coordinates: { lat: -18.18, lng: 31.55 },
    },
  });

  assert.equal(data.monthlyRent, 25000);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "regularPrice"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "discountedPrice"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "user"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "userRef"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "userId"), false);
  assert.equal(data.province, "Mashonaland East");
  assert.equal(data.city, "Marondera");
  assert.equal(data.addressLine, "12 Main Road");
  assert.equal(data.lat, -18.18);
  assert.equal(data.lng, 31.55);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "paymentDeadline"), false);
});

test("createListing only sends Prisma-safe fields", async () => {
  prisma.listing.count = async () => 0;

  let receivedData;
  prisma.listing.create = async ({ data }) => {
    receivedData = data;
    return {
      id: "listing_6",
      ...data,
    };
  };

  prisma.savedSearch.findMany = async () => [];

  const result = await invokeController(listingController.createListing, {
    user: { id: "user_1" },
    body: {
      name: "Legacy listing",
      description: "A nice place",
      address: "12 Main Road",
      phoneNumber: "+263771234567",
      regularPrice: 25000,
      monthlyRent: 25000,
      bathrooms: 1,
      bedrooms: null,
      totalRooms: 2,
      furnished: false,
      type: "rent",
      offer: false,
      studentAccommodation: true,
      imageUrls: ["https://example.com/listing.jpg"],
      location: {
        province: "Mashonaland East",
        city: "Marondera",
        addressLine: "12 Main Road",
        coordinates: { lat: -18.18, lng: 31.55 },
      },
    },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(receivedData.userId, "user_1");
  assert.equal(receivedData.status, "active");
  assert.equal(receivedData.monthlyRent, 25000);
  assert.equal(Object.prototype.hasOwnProperty.call(receivedData, "regularPrice"), false);
});

test("getListing hides early access listings from non-premium users and preserves location shape", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_2",
    userId: "owner_1",
    status: "early_access",
    province: "Harare",
    city: "Borrowdale",
    addressLine: "1 Samora Machel Ave",
  });

  const blocked = await invokeController(listingController.getListing, {
    params: { id: "listing_2" },
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(blocked.error.statusCode, 404);

  const allowed = await invokeController(listingController.getListing, {
    params: { id: "listing_2" },
    user: {
      id: "tenant_2",
      role: "tenant",
      premiumExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  });

  assert.equal(allowed.statusCode, 200);
  assert.deepEqual(allowed.body.data.location, {
    province: "Harare",
    city: "Borrowdale",
    country: "Zimbabwe",
  });
  assert.equal(allowed.body.data.province, "Harare");
  assertPublicContactFieldsAbsent(allowed.body.data);
});

test("getListing strips landlord contact fields from public detail responses", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_public_detail",
    userId: "owner_1",
    status: "active",
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
    address: "12 King George Road, Avondale",
    phoneNumber: "+263771234567",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_public_detail" },
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data);
});

test("getListing keeps landlord contact fields for the owner", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_owner_detail",
    userId: "owner_1",
    status: "active",
    province: "Harare",
    city: "Avondale",
    address: "12 King George Road, Avondale",
    phoneNumber: "+263771234567",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_owner_detail" },
    user: { id: "owner_1", role: "landlord" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.address, "12 King George Road, Avondale");
  assert.equal(result.body.data.phoneNumber, "+263771234567");
});

test("updateListing rejects lifecycle-managed fields", async () => {
  let updateCalled = false;

  prisma.listing.findUnique = async () => ({
    id: "listing_3",
    userId: "owner_1",
  });
  prisma.listing.update = async () => {
    updateCalled = true;
    return {};
  };

  const result = await invokeController(listingController.updateListing, {
    params: { id: "listing_3" },
    user: { id: "owner_1" },
    body: { status: "inactive", name: "Renamed listing" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(
    result.error.message,
    "Listing lifecycle fields cannot be updated from this endpoint."
  );
  assert.equal(updateCalled, false);
});

test("applyListingLifecycle only expires active listings based on expiresAt", async () => {
  const calls = [];
  prisma.listing.updateMany = async (args) => {
    calls.push(args);
    return { count: 0 };
  };

  await applyListingLifecycle();

  assert.equal(
    calls.some((call) => call.data?.status === "pending_payment"),
    false
  );
  assert.deepEqual(
    calls.map((call) => call.data?.status),
    ["active", "expired"]
  );
});

test("transitionListingToPendingPayment enforces active status and valid payment window", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_4",
    userId: "owner_1",
    status: "inactive",
    paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
  });

  const inactiveResult = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_4" },
      user: { id: "owner_1" },
    }
  );

  assert.equal(inactiveResult.error.statusCode, 400);
  assert.equal(
    inactiveResult.error.message,
    "Only active listings can be transitioned to pending payment."
  );

  prisma.listing.findUnique = async () => ({
    id: "listing_4",
    userId: "owner_1",
    status: "active",
    paymentDeadline: new Date(Date.now() - 60 * 60 * 1000),
  });

  const expiredResult = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_4" },
      user: { id: "owner_1" },
    }
  );

  assert.equal(expiredResult.error.statusCode, 400);
  assert.equal(
    expiredResult.error.message,
    "Only listings still within the payment window can be transitioned to pending payment."
  );
});

test("public listing responses rebuild the legacy location object without street address", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_5",
      province: "Bulawayo",
      city: "Suburbs",
      addressLine: "22 Main Street",
      address: "22 Main Street, Bulawayo",
      phoneNumber: "+263771234567",
      status: "active",
    },
  ];

  const result = await invokeController(listingController.getListings, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data[0].location, {
    province: "Bulawayo",
    city: "Suburbs",
    country: "Zimbabwe",
  });
  assert.equal(result.body.data[0].province, "Bulawayo");
  assertPublicContactFieldsAbsent(result.body.data[0]);
});

test("getHomeHighlighted strips landlord contact fields from public listing cards", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_home_highlighted",
      status: "active",
      address: "7 Borrowdale Road",
      phoneNumber: "+263772345678",
    },
  ];

  const result = await invokeController(listingController.getHomeHighlighted, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data[0]);
});

test("getHomeGroupedByLocation strips landlord contact fields from public grouped listings", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_grouped",
      name: "Grouped listing",
      province: "Harare",
      imageUrls: ["grouped.jpg"],
      createdAt: new Date("2025-01-02T00:00:00.000Z"),
      status: "active",
      address: "9 Samora Machel Avenue",
      phoneNumber: "+263773456789",
    },
  ];

  const result = await invokeController(listingController.getHomeGroupedByLocation, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data[0].listings[0]);
});
