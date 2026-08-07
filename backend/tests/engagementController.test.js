const test = require("node:test");
const assert = require("node:assert/strict");

const engagementController = require("../controllers/engagementController");
const prisma = require("../utils/prisma");
const walletService = require("../utils/walletService");

const originalPrisma = {
  listingFindUnique: prisma.listing.findUnique,
  engagementFindFirst: prisma.engagement.findFirst,
  engagementFindMany: prisma.engagement.findMany,
  engagementCreate: prisma.engagement.create,
  engagementUpdate: prisma.engagement.update,
  notificationCreate: prisma.notification.create,
  transaction: prisma.$transaction,
};

const invokeController = (handler, req = {}) =>
  new Promise((resolve) => {
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
        resolve({ error: err, statusCode: res.statusCode, body: res.body });
        return;
      }

      resolve({ statusCode: res.statusCode, body: res.body });
    });
  });

test.afterEach(() => {
  prisma.listing.findUnique = originalPrisma.listingFindUnique;
  prisma.engagement.findFirst = originalPrisma.engagementFindFirst;
  prisma.engagement.findMany = originalPrisma.engagementFindMany;
  prisma.engagement.create = originalPrisma.engagementCreate;
  prisma.engagement.update = originalPrisma.engagementUpdate;
  prisma.notification.create = originalPrisma.notificationCreate;
  prisma.$transaction = originalPrisma.transaction;
});

test("createEngagement creates a fresh engagement after previous declined requests", async () => {
  let createArgs = null;
  let notificationArgs = null;
  let updateCalled = false;

  prisma.listing.findUnique = async () => ({
    id: "listing-1",
    userId: "landlord-1",
    name: "Borrowdale Cottage",
  });
  prisma.engagement.findFirst = async (args) => {
    assert.deepEqual(args.where, {
      listingId: "listing-1",
      tenantId: "tenant-1",
      status: { in: ["PENDING", "APPROVED", "CHARGED"] },
    });
    return null;
  };
  prisma.engagement.create = async (args) => {
    createArgs = args;
    return {
      id: "engagement-2",
      listingId: "listing-1",
      tenantId: "tenant-1",
      ...args.data,
      status: "PENDING",
    };
  };
  prisma.engagement.update = async () => {
    updateCalled = true;
    throw new Error("should not update declined engagement");
  };
  prisma.notification.create = async (args) => {
    notificationArgs = args;
    return { id: "notification-1", ...args.data };
  };

  const result = await invokeController(engagementController.createEngagement, {
    user: { id: "tenant-1", role: "tenant", username: "Tenant One" },
    body: {
      listingId: "listing-1",
      message: "Please reconsider my application.",
    },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(updateCalled, false);
  assert.deepEqual(createArgs, {
    data: {
      listingId: "listing-1",
      tenantId: "tenant-1",
      landlordId: "landlord-1",
      message: "Please reconsider my application.",
    },
  });
  assert.equal(notificationArgs.data.userId, "landlord-1");
  assert.deepEqual(notificationArgs.data.metadata, {
    engagementId: "engagement-2",
    listingId: "listing-1",
  });
  assert.equal(result.body.data.engagement.status, "PENDING");
});

test("createEngagement still rejects duplicate non-declined engagements", async () => {
  let updateCalled = false;
  let notificationCalled = false;

  prisma.listing.findUnique = async () => ({
    id: "listing-1",
    userId: "landlord-1",
    name: "Borrowdale Cottage",
  });
  prisma.engagement.findFirst = async (args) => ({
    id: "engagement-1",
    listingId: args.where.listingId,
    tenantId: args.where.tenantId,
    status: "PENDING",
  });
  prisma.engagement.update = async () => {
    updateCalled = true;
    throw new Error("should not update duplicate pending engagement");
  };
  prisma.notification.create = async () => {
    notificationCalled = true;
    throw new Error("should not notify on rejected duplicate");
  };

  const result = await invokeController(engagementController.createEngagement, {
    user: { id: "tenant-1", role: "tenant", username: "Tenant One" },
    body: {
      listingId: "listing-1",
      message: "Please send contact details.",
    },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 400);
  assert.equal(updateCalled, false);
  assert.equal(notificationCalled, false);
});

test("respondToEngagement does not charge tokens for already approved engagements", async () => {
  let deductCalled = false;
  let notificationCalled = false;
  const originalDeductTokens = walletService.deductTokens;

  prisma.listing.findUnique = async () => ({
    id: "listing-1",
    userId: "landlord-1",
    name: "Borrowdale Cottage",
  });
  prisma.engagement.findUnique = async () => ({
    id: "engagement-1",
    listingId: "listing-1",
    tenantId: "tenant-1",
    landlordId: "landlord-1",
    status: "APPROVED",
    listing: { id: "listing-1", name: "Borrowdale Cottage" },
    tenant: { id: "tenant-1" },
  });
  prisma.$transaction = async (callback) =>
    callback({
      engagement: {
        updateMany: async () => ({ count: 0 }),
        findUnique: async () => ({
          id: "engagement-1",
          listingId: "listing-1",
          tenantId: "tenant-1",
          landlordId: "landlord-1",
          status: "APPROVED",
          listing: { id: "listing-1", name: "Borrowdale Cottage" },
          tenant: { id: "tenant-1" },
        }),
      },
      notification: {
        create: async () => {
          notificationCalled = true;
        },
      },
    });
  walletService.deductTokens = async () => {
    deductCalled = true;
    throw new Error("should not deduct tokens for a repeated approval");
  };

  let result;
  try {
    result = await invokeController(engagementController.respondToEngagement, {
      params: { id: "engagement-1" },
      user: { id: "landlord-1", role: "landlord" },
      body: { action: "approve" },
    });
  } finally {
    walletService.deductTokens = originalDeductTokens;
  }

  assert.equal(result.error.statusCode, 409);
  assert.equal(deductCalled, false);
  assert.equal(notificationCalled, false);
});

test("respondToEngagement sends a single approval notification with valid prisma payload", async () => {
  const originalDeductTokens = walletService.deductTokens;
  let notificationCalls = [];

  prisma.engagement.findUnique = async () => ({
    id: "engagement-1",
    listingId: "listing-1",
    tenantId: "tenant-1",
    landlordId: "landlord-1",
    status: "PENDING",
    listing: { id: "listing-1", name: "Borrowdale Cottage" },
    tenant: { id: "tenant-1" },
  });
  prisma.$transaction = async (callback) =>
    callback({
      engagement: {
        update: async () => ({
          id: "engagement-1",
          listingId: "listing-1",
          tenantId: "tenant-1",
          landlordId: "landlord-1",
          status: "APPROVED",
          listing: { id: "listing-1", name: "Borrowdale Cottage" },
          tenant: { id: "tenant-1" },
        }),
      },
      notification: {
        create: async (args) => {
          notificationCalls.push(args);
          return { id: "notification-1" };
        },
      },
    });
  walletService.deductTokens = async () => 5;

  const result = await invokeController(engagementController.respondToEngagement, {
    params: { id: "engagement-1" },
    user: { id: "landlord-1", role: "landlord" },
    body: { action: "approve" },
  });

  walletService.deductTokens = originalDeductTokens;

  assert.equal(result.statusCode, 200);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].data.event, "engagement.approved");
  assert.equal(notificationCalls[0].data.userId, "tenant-1");
});

test("getMyEngagements hides listing contact details until approval", async () => {
  prisma.engagement.findMany = async (args) => {
    assert.deepEqual(args.where, { tenantId: "tenant-1" });
    assert.deepEqual(args.orderBy, { createdAt: "desc" });

    return [
      {
        id: "pending-engagement",
        status: "PENDING",
        listing: {
          id: "listing-1",
          name: "Pending Listing",
          address: "123 Secret Street",
          phoneNumber: "+263771234567",
          city: "Harare",
          province: "Harare",
        },
      },
      {
        id: "approved-engagement",
        status: "APPROVED",
        listing: {
          id: "listing-2",
          name: "Approved Listing",
          address: "456 Shared Road",
          phoneNumber: "+263779999999",
          city: "Bulawayo",
          province: "Bulawayo",
        },
      },
      {
        id: "declined-engagement",
        status: "DECLINED",
        listing: {
          id: "listing-3",
          name: "Declined Listing",
          address: "789 Hidden Avenue",
          phoneNumber: "+263778888888",
          city: "Mutare",
          province: "Manicaland",
        },
      },
    ];
  };

  const result = await invokeController(engagementController.getMyEngagements, {
    user: { id: "tenant-1", role: "tenant" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data[0].listing.address, null);
  assert.equal(result.body.data[0].listing.phoneNumber, null);
  assert.equal(result.body.data[1].listing.address, "456 Shared Road");
  assert.equal(result.body.data[1].listing.phoneNumber, "+263779999999");
  assert.equal(result.body.data[2].listing.address, null);
  assert.equal(result.body.data[2].listing.phoneNumber, null);
});
