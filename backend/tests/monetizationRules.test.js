const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const paymentController = require("../controllers/paymentController");
const webhookController = require("../controllers/webhookController");
const listingController = require("../controllers/listingController");
const uploadController = require("../controllers/uploadController");
const { createListingValidators } = require("../middleware/listingValidators");
const validate = require("../middleware/validate");
const prisma = require("../utils/prisma");
const { isPremiumTenant } = require("../utils/monetization");
const walletService = require("../utils/walletService");

const originalPrisma = {
  bookingFindUnique: prisma.booking.findUnique,
  bookingUpdate: prisma.booking.update,
  listingFindMany: prisma.listing.findMany,
  listingFindUnique: prisma.listing.findUnique,
  listingUpdate: prisma.listing.update,
  listingUpdateMany: prisma.listing.updateMany,
  paymentCreate: prisma.payment.create,
  paymentFindFirst: prisma.payment.findFirst,
  paymentUpdate: prisma.payment.update,
  paymentUpdateMany: prisma.payment.updateMany,
  transaction: prisma.$transaction,
  userFindUnique: prisma.user.findUnique,
  userUpdate: prisma.user.update,
  webhookEventCreate: prisma.webhookEvent.create,
  deductTokens: walletService.deductTokens,
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

const invokeWebhookHandler = (handler, req) =>
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

    handler(req, res);
  });

const runValidationChain = async (validators, body) => {
  const req = { body };

  for (const validator of validators) {
    await validator.run(req);
  }

  return new Promise((resolve) => {
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

    validate(req, res, () => resolve({ statusCode: 200, body: null }));
  });
};

test.afterEach(() => {
  prisma.booking.findUnique = originalPrisma.bookingFindUnique;
  prisma.booking.update = originalPrisma.bookingUpdate;
  prisma.listing.findMany = originalPrisma.listingFindMany;
  prisma.listing.findUnique = originalPrisma.listingFindUnique;
  prisma.listing.update = originalPrisma.listingUpdate;
  prisma.listing.updateMany = originalPrisma.listingUpdateMany;
  prisma.payment.create = originalPrisma.paymentCreate;
  prisma.payment.findFirst = originalPrisma.paymentFindFirst;
  prisma.payment.update = originalPrisma.paymentUpdate;
  prisma.payment.updateMany = originalPrisma.paymentUpdateMany;
  prisma.$transaction = originalPrisma.transaction;
  prisma.user.findUnique = originalPrisma.userFindUnique;
  prisma.user.update = originalPrisma.userUpdate;
  prisma.webhookEvent.create = originalPrisma.webhookEventCreate;
  walletService.deductTokens = originalPrisma.deductTokens;
  delete process.env.PAYMENT_PROVIDER;
});

test("listing routes keep browse/view public and publish landlord-only", async () => {
  const listingRoutes = require("../routes/listingRoutes");
  const authController = require("../controllers/authController");

  const stack = listingRoutes.stack;
  const routeLayers = stack.filter((layer) => layer.route);

  const publicListLayer = routeLayers.find(
    (layer) => layer.route.path === "/" && layer.route.methods.get
  );
  const publicDetailLayer = routeLayers.find(
    (layer) => layer.route.path === "/listing/:id" && layer.route.methods.get
  );
  const publicLegacyLayer = routeLayers.find(
    (layer) => layer.route.path === "/:id" && layer.route.methods.get
  );
  const createLayer = routeLayers.find(
    (layer) => layer.route.path === "/" && layer.route.methods.post
  );
  const updateLayer = routeLayers.find(
    (layer) => layer.route.path === "/:id" && layer.route.methods.put
  );
  const pendingPaymentTransitionLayer = routeLayers.find(
    (layer) =>
      layer.route.path === "/:id/transition-to-pending-payment" &&
      layer.route.methods.post
  );
  const reviveLayer = routeLayers.find(
    (layer) => layer.route.path === "/:id/revive" && layer.route.methods.put
  );
  const protectIndex = stack.findIndex(
    (layer) => layer.handle === authController.protect
  );

  assert.ok(publicListLayer);
  assert.ok(publicDetailLayer);
  assert.ok(publicLegacyLayer);
  assert.ok(createLayer);
  assert.ok(updateLayer);
  assert.ok(pendingPaymentTransitionLayer);
  assert.equal(reviveLayer, undefined);
  assert.ok(protectIndex > -1);

  const publicListHandlers = publicListLayer.route.stack.map((layer) => layer.handle);
  const publicDetailHandlers = publicDetailLayer.route.stack.map(
    (layer) => layer.handle
  );

  assert.ok(publicListHandlers.includes(authController.optionalAuth));
  assert.ok(publicDetailHandlers.includes(authController.optionalAuth));

  const publicListIndex = stack.indexOf(publicListLayer);
  const publicDetailIndex = stack.indexOf(publicDetailLayer);
  const createIndex = stack.indexOf(createLayer);

  assert.ok(publicListIndex > -1 && publicListIndex < protectIndex);
  assert.ok(publicDetailIndex > -1 && publicDetailIndex < protectIndex);
  assert.ok(createIndex > -1 && protectIndex < createIndex);
});

test("tenant saved searches no longer require premium middleware", async () => {
  const file = fs.readFileSync(
    path.join(__dirname, "..", "routes", "savedSearchRoutes.js"),
    "utf8"
  );

  assert.ok(!file.includes("requirePremium"));
});

test("landlord can activate a listing with TR tokens", async () => {
  let deductArgs = null;
  let updateArgs = null;

  prisma.$transaction = async (callback) =>
    callback({
      listing: { update: prisma.listing.update },
      user: { update: prisma.user.update },
    });
  walletService.deductTokens = async (...args) => {
    deductArgs = args;
    return 95;
  };

  prisma.listing.findUnique = async () => ({
    id: "listing_1",
    name: "Listing One",
    userId: "u_1",
    status: "pending_payment",
  });

  prisma.listing.update = async (args) => {
    updateArgs = args;
    return {
      id: args.where.id,
      status: args.data.status,
      paymentDeadline: args.data.paymentDeadline ?? null,
      earlyAccessUntil: args.data.earlyAccessUntil ?? null,
    };
  };

  const result = await invokeController(paymentController.initiateListingFee, {
    user: { _id: "u_1" },
    body: { listingId: "listing_1" },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.data.listing.status, "active");
  assert.equal(result.body.data.tokenBalance, 95);
  assert.equal(result.body.data.tokenCost, 5);
  assert.deepEqual(deductArgs?.slice(2, 4), ["listing_activation", "Listing activation for Listing One"]);
  assert.deepEqual(updateArgs, {
    where: { id: "listing_1" },
    data: { status: "active", paymentDeadline: null },
  });
});

test("landlord can restore an inactive listing with TR tokens", async () => {
  let deductArgs = null;
  let updateArgs = null;

  prisma.$transaction = async (callback) =>
    callback({
      listing: { update: prisma.listing.update },
      user: { update: prisma.user.update },
    });
  walletService.deductTokens = async (...args) => {
    deductArgs = args;
    return 90;
  };

  prisma.listing.findUnique = async () => ({
    id: "listing_inactive",
    name: "Listing Inactive",
    userId: "u_1",
    status: "inactive",
  });

  prisma.listing.update = async (args) => {
    updateArgs = args;
    return {
      id: args.where.id,
      status: args.data.status,
      paymentDeadline: args.data.paymentDeadline ?? null,
      earlyAccessUntil: args.data.earlyAccessUntil ?? null,
    };
  };

  const result = await invokeController(paymentController.initiateListingFee, {
    user: { _id: "u_1" },
    body: { listingId: "listing_inactive" },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.data.listing.status, "active");
  assert.equal(result.body.data.tokenBalance, 90);
  assert.equal(result.body.data.tokenCost, 5);
  assert.equal(deductArgs?.[2], "listing_activation");
  assert.deepEqual(updateArgs, {
    where: { id: "listing_inactive" },
    data: { status: "active", paymentDeadline: null },
  });
});

test("landlord cannot spend TR tokens on an already-active listing", async () => {
  let deductCalled = false;
  prisma.listing.findUnique = async () => ({
    id: "listing_active",
    name: "Listing Active",
    userId: "u_1",
    status: "active",
    paymentDeadline: null,
  });

  walletService.deductTokens = async () => {
    deductCalled = true;
    return 85;
  };

  const result = await invokeController(paymentController.initiateListingFee, {
    user: { _id: "u_1" },
    body: { listingId: "listing_active" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "Listing is already active");
  assert.equal(deductCalled, false);
});

test("landlord can transition active listing to pending payment", async () => {
  let updateArgs = null;

  prisma.listing.findUnique = async () => ({
    id: "listing_active",
    userId: "u_1",
    status: "active",
    paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
  });

  prisma.listing.update = async (args) => {
    updateArgs = args;
    return {
      id: "listing_active",
      userId: "u_1",
      status: "pending_payment",
    };
  };

  const result = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_active" },
      user: { id: "u_1" },
    }
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.data.status, "pending_payment");
  assert.deepEqual(updateArgs, {
    where: { id: "listing_active" },
    data: { status: "pending_payment" },
  });
});

test("listing transition rejects non-active listings", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_pending",
    userId: "u_1",
    status: "pending_payment",
    paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
  });

  const result = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_pending" },
      user: { id: "u_1" },
    }
  );

  assert.equal(result.error.statusCode, 400);
  assert.equal(
    result.error.message,
    "Only active listings can be transitioned to pending payment."
  );
});

test("tenant can activate premium membership with TR tokens", async () => {
  let deductArgs = null;

  prisma.$transaction = async (callback) =>
    callback({
      listing: { update: prisma.listing.update },
      user: { update: prisma.user.update },
    });
  walletService.deductTokens = async (...args) => {
    deductArgs = args;
    return 70;
  };
  prisma.user.findUnique = async () => ({
    id: "u_2",
    premiumExpiry: null,
  });
  prisma.user.update = async (args) => ({
    id: args.where.id,
    premiumExpiry: args.data.premiumExpiry,
  });

  const result = await invokeController(paymentController.initiateTenantPremium, {
    user: { _id: "u_2" },
    body: {},
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.data.user._id, "u_2");
  assert.equal(result.body.data.tokenBalance, 70);
  assert.equal(result.body.data.tokenCost, 10);
  assert.equal(deductArgs?.[2], "premium_access");
});

test("listing uploads remain landlord-only even in tenant-payer mode", async () => {
  process.env.TOKEN_PAYER_ROLE = "TENANT";

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: {
      folder: "listings",
      contentType: "image/png",
    },
    user: { _id: "tenant_1", role: "tenant" },
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.status, "fail");
  assert.equal(result.body.message, "Landlord role required to publish listings");
});

test("retryPayment blocks legacy non-booking payments from provider retries", async () => {
  prisma.payment.findUnique = async () => ({
    id: "pay_legacy",
    userId: "u_2",
    status: "failed",
    retryCount: 0,
    lastRetryAt: null,
    type: "listing_fee",
  });

  const result = await invokeController(paymentController.retryPayment, {
    params: { id: "pay_legacy" },
    user: { id: "u_2" },
    body: {},
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "Provider retry/status is only available for booking payments");
});

test("webhook rejects legacy non-booking payments without applying side effects", async () => {
  const paymentProvider = require("../utils/paymentProvider");
  const provider = paymentProvider.getProviderByName("paynow");
  const originalVerifyWebhook = provider.verifyWebhook;

  let listingUpdateCalled = false;
  let userUpdateCalled = false;

  provider.verifyWebhook = async () => ({
    valid: true,
    transactionRef: "tx_legacy",
    status: "paid",
    amountPaid: 10,
  });

  prisma.payment.updateMany = async () => ({ count: 1 });
  prisma.payment.update = async () => ({
    id: "pay_legacy",
    transactionRef: "tx_legacy",
    type: "premium_subscription",
  });
  prisma.payment.findFirst = async () => ({
    id: "pay_legacy",
    transactionRef: "tx_legacy",
    type: "premium_subscription",
  });
  prisma.listing.update = async () => {
    listingUpdateCalled = true;
    return {};
  };
  prisma.user.findUnique = async () => ({ id: "u_2", premiumExpiry: null });
  prisma.user.update = async () => {
    userUpdateCalled = true;
    return {};
  };
  prisma.webhookEvent.create = async () => ({ id: "we_legacy" });

  const result = await invokeWebhookHandler(webhookController.handlePaynowWebhook, {
    body: { reference: "tx_legacy", status: "paid" },
  });

  provider.verifyWebhook = originalVerifyWebhook;

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "manual_migration_required");
  assert.equal(listingUpdateCalled, false);
  assert.equal(userUpdateCalled, false);
});

test("webhook ignores payments with invalid hash", async () => {
  const paymentProvider = require("../utils/paymentProvider");
  const provider = paymentProvider.getProviderByName("paynow");
  const originalVerifyWebhook = provider.verifyWebhook;
  provider.verifyWebhook = async () => ({ valid: false, transactionRef: "tx_1" });

  const result = await invokeWebhookHandler(webhookController.handlePaynowWebhook, {
    body: { reference: "tx_1", status: "paid" },
  });

  provider.verifyWebhook = originalVerifyWebhook;

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "ignored");
  assert.equal(result.body.reason, "invalid hash");
});

test("webhook marks failed payments as failed without granting access", async () => {
  const paymentProvider = require("../utils/paymentProvider");
  const provider = paymentProvider.getProviderByName("paynow");
  const originalVerifyWebhook = provider.verifyWebhook;

  let updateArgs = null;

  provider.verifyWebhook = async () => ({
    valid: true,
    transactionRef: "tx_failed",
    status: "failed",
  });

  prisma.payment.updateMany = async (args) => {
    updateArgs = args;
    return { count: 1 };
  };

  const result = await invokeWebhookHandler(webhookController.handlePaynowWebhook, {
    body: { reference: "tx_failed", status: "failed" },
  });

  provider.verifyWebhook = originalVerifyWebhook;

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "ok");
  if (updateArgs) {
    assert.deepEqual(updateArgs, {
      where: { transactionRef: "tx_failed" },
      data: { status: "failed" },
    });
  }
});

test("isPremiumTenant returns true only for active premium expiry", () => {
  assert.equal(
    isPremiumTenant({ premiumExpiry: new Date(Date.now() + 86400000) }),
    true
  );
  assert.equal(Boolean(isPremiumTenant({ premiumExpiry: null })), false);
  assert.equal(
    isPremiumTenant({ premiumExpiry: new Date(Date.now() - 1000) }),
    false
  );
});

test("webhook idempotency returns ok on duplicate webhook payloads", async () => {
  const paymentProvider = require("../utils/paymentProvider");
  const provider = paymentProvider.getProviderByName("paynow");
  const originalVerifyWebhook = provider.verifyWebhook;

  let updateManyCalls = 0;

  provider.verifyWebhook = async () => ({
    valid: true,
    transactionRef: "tx_idem",
    status: "paid",
  });

  prisma.payment.updateMany = async () => {
    updateManyCalls += 1;
    return { count: updateManyCalls === 1 ? 1 : 0 };
  };
  prisma.payment.findFirst = async () => ({
    id: "pay_idem",
    transactionRef: "tx_idem",
    type: "noop",
  });
  prisma.listing.update = async () => {
    throw new Error("unexpected listing side effect");
  };
  prisma.user.findUnique = async () => {
    throw new Error("unexpected user lookup");
  };
  prisma.user.update = async () => {
    throw new Error("unexpected user update");
  };
  prisma.webhookEvent.create = async () => ({ id: "we_1" });

  const req = {
    body: { reference: "tx_idem", status: "paid" },
  };

  const first = await invokeWebhookHandler(webhookController.handlePaynowWebhook, req);
  const second = await invokeWebhookHandler(webhookController.handlePaynowWebhook, req);

  provider.verifyWebhook = originalVerifyWebhook;
  prisma.webhookEvent.create = originalPrisma.webhookEventCreate;

  assert.equal(first.statusCode, 200);
  assert.equal(first.body.status, "ok");
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.status, "ok");
  assert.equal(second.body.reason, "already processed");
  assert.equal(updateManyCalls, 2);
});

test("getListings applies early_access visibility for premium users only", async () => {
  const findCalls = [];

  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async (args) => {
    findCalls.push(args);
    return [];
  };

  await invokeController(listingController.getListings, {
    query: {},
    user: { premiumExpiry: new Date(Date.now() + 86400000) },
  });

  await invokeController(listingController.getListings, {
    query: {},
  });

  assert.deepEqual(findCalls[0].where.status, { in: ["active", "early_access"] });
  assert.equal(findCalls[1].where.status, "active");
});

test("promoteExpiredEarlyAccess transitions expired listings to active", async () => {
  const updateCalls = [];
  prisma.listing.updateMany = async (args) => {
    updateCalls.push(args);
    return { count: 1 };
  };
  prisma.listing.findMany = async () => [];

  await invokeController(listingController.getListings, { query: {} });

  assert.equal(updateCalls.length > 0, true);
  assert.deepEqual(updateCalls[0].where.status, "early_access");
  assert.equal(updateCalls[0].where.earlyAccessUntil.lt instanceof Date, true);
  assert.deepEqual(updateCalls[0].data, { status: "active" });
});

test("create listing validators reject sale listings", async () => {
  const result = await runValidationChain(createListingValidators, {
    name: "Sample",
    description: "desc",
    address: "addr",
    location: "Kampala",
    type: "sale",
    monthlyRent: 1000,
    bedrooms: 2,
    totalRooms: 3,
    bathrooms: 1,
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body.errors, [
    { field: "type", message: "Only rental listings are supported" },
  ]);
});

test("create listing validators accept rent listings", async () => {
  const result = await runValidationChain(createListingValidators, {
    name: "Sample",
    description: "desc",
    address: "addr",
    location: "Kampala",
    type: "rent",
    monthlyRent: 1000,
    bedrooms: 2,
    totalRooms: 3,
    bathrooms: 1,
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body, null);
});

test("create listing validators accept omitted type", async () => {
  const result = await runValidationChain(createListingValidators, {
    name: "Sample",
    description: "desc",
    address: "addr",
    location: "Kampala",
    monthlyRent: 1000,
    bedrooms: 2,
    totalRooms: 3,
    bathrooms: 1,
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body, null);
});

test("create listing validators accept null bedrooms when total rooms is provided", async () => {
  const result = await runValidationChain(createListingValidators, {
    name: "Sample",
    description: "desc",
    address: "addr",
    location: "Kampala",
    monthlyRent: 1000,
    bedrooms: null,
    totalRooms: 3,
    bathrooms: 1,
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body, null);
});
