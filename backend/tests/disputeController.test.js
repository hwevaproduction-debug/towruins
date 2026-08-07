const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../utils/prisma");
const notificationService = require("../utils/notificationService");

const originalPrisma = {
  bookingFindUnique: prisma.booking.findUnique,
  disputeFindFirst: prisma.dispute.findFirst,
  disputeCreate: prisma.dispute.create,
  disputeFindUnique: prisma.dispute.findUnique,
  disputeUpdate: prisma.dispute.update,
  auditLogCreate: prisma.auditLog.create,
};
const originalEnqueue = notificationService.enqueue;

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
  prisma.booking.findUnique = originalPrisma.bookingFindUnique;
  prisma.dispute.findFirst = originalPrisma.disputeFindFirst;
  prisma.dispute.create = originalPrisma.disputeCreate;
  prisma.dispute.findUnique = originalPrisma.disputeFindUnique;
  prisma.dispute.update = originalPrisma.disputeUpdate;
  prisma.auditLog.create = originalPrisma.auditLogCreate;
  notificationService.enqueue = originalEnqueue;
});

test("raiseDispute creates dispute when user is party to booking", async () => {
  const disputeController = require("../controllers/disputeController");
  let createArgs = null;

  prisma.booking.findUnique = async () => ({
    id: "booking_1",
    guestId: "guest_1",
    providerId: "provider_1",
    room: {
      providerId: "provider_1",
      accommodation: { ownerId: "provider_1" },
    },
  });
  prisma.dispute.findFirst = async () => null;
  prisma.dispute.create = async (args) => {
    createArgs = args;
    return { id: "dispute_1", ...args.data };
  };

  const result = await invokeController(disputeController.raiseDispute, {
    body: {
      bookingId: "booking_1",
      reason: "refund",
      description: "Refund requested",
    },
    user: { id: "guest_1" },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(createArgs.data.raisedByRole, "guest");
  assert.equal(createArgs.data.raisedBy, "guest_1");
});

test("raiseDispute rejects when user is not party to booking", async () => {
  const disputeController = require("../controllers/disputeController");

  prisma.booking.findUnique = async () => ({
    id: "booking_1",
    guestId: "guest_1",
    providerId: "provider_1",
    room: {
      providerId: "provider_1",
      accommodation: { ownerId: "provider_1" },
    },
  });

  const result = await invokeController(disputeController.raiseDispute, {
    body: {
      bookingId: "booking_1",
      reason: "refund",
      description: "Refund requested",
    },
    user: { id: "other_user" },
  });

  assert.equal(result.error.statusCode, 403);
});

test("raiseDispute rejects duplicate open dispute for same booking", async () => {
  const disputeController = require("../controllers/disputeController");

  prisma.booking.findUnique = async () => ({
    id: "booking_1",
    guestId: "guest_1",
    providerId: "provider_1",
    room: {
      providerId: "provider_1",
      accommodation: { ownerId: "provider_1" },
    },
  });
  prisma.dispute.findFirst = async () => ({ id: "dispute_existing" });

  const result = await invokeController(disputeController.raiseDispute, {
    body: {
      bookingId: "booking_1",
      reason: "refund",
      description: "Refund requested",
    },
    user: { id: "guest_1" },
  });

  assert.equal(result.error.statusCode, 409);
});

test("resolveDispute requires resolution text", async () => {
  const adminController = require("../controllers/adminController");

  const result = await invokeController(adminController.resolveDispute, {
    params: { id: "dispute_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "resolution is required");
});

test("markDisputeUnderReview sets status UNDER_REVIEW and writes audit log", async () => {
  const adminController = require("../controllers/adminController");
  let updateArgs = null;
  let auditArgs = null;

  prisma.dispute.findUnique = async () => ({
    id: "dispute_1",
    status: "OPEN",
    booking: null,
  });
  prisma.dispute.update = async (args) => {
    updateArgs = args;
    return { id: "dispute_1", ...args.data, booking: null };
  };
  prisma.auditLog.create = async ({ data }) => {
    auditArgs = data;
    return { id: "audit_1", ...data };
  };

  const result = await invokeController(adminController.markDisputeUnderReview, {
    params: { id: "dispute_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateArgs.data.status, "UNDER_REVIEW");
  assert.equal(result.body.data.dispute.status, "UNDER_REVIEW");
  assert.equal(auditArgs.adminId, "admin_1");
  assert.equal(auditArgs.action, "dispute.under_review");
  assert.equal(auditArgs.targetType, "Dispute");
  assert.equal(auditArgs.targetId, "dispute_1");
  assert.deepEqual(auditArgs.metadata, { previousStatus: "OPEN" });
});

test("resolveDispute sets status RESOLVED and resolvedAt", async () => {
  const adminController = require("../controllers/adminController");
  let updateArgs = null;

  prisma.dispute.findUnique = async () => ({
    id: "dispute_1",
    status: "OPEN",
    booking: {
      id: "booking_1",
      guest: { id: "guest_1", email: "guest@example.com" },
      providerUser: { id: "provider_1", email: "host@example.com" },
      room: null,
    },
  });
  prisma.dispute.update = async (args) => {
    updateArgs = args;
    return {
      id: "dispute_1",
      ...args.data,
      booking: {
        id: "booking_1",
        guest: { id: "guest_1", email: "guest@example.com" },
        providerUser: { id: "provider_1", email: "host@example.com" },
        room: null,
      },
    };
  };
  prisma.auditLog.create = async ({ data }) => ({ id: "audit_1", ...data });
  notificationService.enqueue = async () => ({ count: 2 });

  const result = await invokeController(adminController.resolveDispute, {
    params: { id: "dispute_1" },
    body: { resolution: "Refund approved" },
    user: { id: "admin_1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateArgs.data.status, "RESOLVED");
  assert.equal(updateArgs.data.resolvedBy, "admin_1");
  assert.equal(updateArgs.data.resolvedAt instanceof Date, true);
});

test("closeDispute sets status CLOSED", async () => {
  const adminController = require("../controllers/adminController");
  let updateArgs = null;

  prisma.dispute.findUnique = async () => ({
    id: "dispute_1",
    status: "OPEN",
    booking: null,
  });
  prisma.dispute.update = async (args) => {
    updateArgs = args;
    return { id: "dispute_1", ...args.data, booking: null };
  };
  prisma.auditLog.create = async ({ data }) => ({ id: "audit_1", ...data });

  const result = await invokeController(adminController.closeDispute, {
    params: { id: "dispute_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateArgs.data.status, "CLOSED");
});
