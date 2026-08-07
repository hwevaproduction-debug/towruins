const test = require("node:test");
const assert = require("node:assert/strict");

const listingController = require("../controllers/listingController");
const prisma = require("../utils/prisma");

const originalListing = {
  findMany: prisma.listing.findMany,
  updateMany: prisma.listing.updateMany,
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
      if (err) reject(err);
    });
  });

test.afterEach(() => {
  prisma.listing.findMany = originalListing.findMany;
  prisma.listing.updateMany = originalListing.updateMany;
});

test("matchesSavedSearch matches flat province, city, and address line locations", () => {
  const { matchesSavedSearch } = listingController.__testables;
  const listing = {
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
    monthlyRent: 650,
    bedrooms: 2,
    totalRooms: 4,
    amenities: {},
  };

  assert.equal(
    matchesSavedSearch({ criteria: { location: "Avondale" } }, listing),
    true
  );
  assert.equal(
    matchesSavedSearch({ criteria: { location: "King George" } }, listing),
    true
  );
  assert.equal(
    matchesSavedSearch({ criteria: { location: "Harare" } }, listing),
    true
  );
});

test("matchesSavedSearch applies rent, room, bedroom, and amenity criteria", () => {
  const { matchesSavedSearch } = listingController.__testables;
  const listing = {
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
    monthlyRent: 650,
    bedrooms: 2,
    totalRooms: 4,
    amenities: { solar: true, parking: true },
  };

  assert.equal(
    matchesSavedSearch({
      criteria: {
        minRent: 500,
        maxRent: 800,
        minBedrooms: 2,
        minTotalRooms: 4,
        amenities: { solar: true },
      },
    }, listing),
    true
  );
  assert.equal(
    matchesSavedSearch({ criteria: { amenities: { borehole: true } } }, listing),
    false
  );
});

test("getListings uses Prisma-compatible location filters", async () => {
  let capturedArgs = null;
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    capturedArgs = args;
    return [];
  };

  const result = await invokeController(listingController.getListings, {
    query: { location: "Harare" },
  });

  assert.equal(capturedArgs.where.status, "active");
  assert.deepEqual(capturedArgs.where.AND, [
    {
      province: { contains: "Harare", mode: "insensitive" },
    },
  ]);
  assert.equal(result.statusCode, 200);
});

test("getListings applies city and neighborhood discovery filters", async () => {
  let capturedArgs = null;
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    capturedArgs = args;
    return [];
  };

  const result = await invokeController(listingController.getListings, {
    query: { city: "Harare", neighborhood: "Borrowdale" },
  });

  assert.deepEqual(capturedArgs.where.AND, [
    {
      OR: [
        { province: { contains: "Harare", mode: "insensitive" } },
        { city: { contains: "Harare", mode: "insensitive" } },
      ],
    },
    {
      OR: [
        { city: { contains: "Borrowdale", mode: "insensitive" } },
        { addressLine: { contains: "Borrowdale", mode: "insensitive" } },
      ],
    },
  ]);
  assert.equal(result.statusCode, 200);
});

test("getHomeGroupedByLocation groups current flat province locations", async () => {
  let capturedArgs = null;
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    capturedArgs = args;
    return [
      {
        id: "listing_1",
        name: "Avondale Room",
        province: "Harare",
        imageUrls: ["room.jpg"],
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
        status: "active",
      },
    ];
  };

  const result = await invokeController(
    listingController.getHomeGroupedByLocation,
    {
      query: {},
    }
  );

  assert.deepEqual(capturedArgs.where, {
    status: "active",
    province: { not: "" },
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data, [
    {
      location: "Harare",
      listings: [
        {
          _id: "listing_1",
          name: "Avondale Room",
          monthlyRent: undefined,
          bedrooms: undefined,
          totalRooms: undefined,
          amenities: undefined,
          status: "active",
          studentAccommodation: undefined,
          createdAt: new Date("2025-01-02T00:00:00.000Z"),
          location: "Harare",
          image: "room.jpg",
        },
      ],
    },
  ]);
});
