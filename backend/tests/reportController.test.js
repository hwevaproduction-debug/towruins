const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../utils/prisma");
const notificationService = require("../utils/notificationService");

const originalPrisma = {
  reportCreate: prisma.report.create,
  reportFindUnique: prisma.report.findUnique,
  reportUpdate: prisma.report.update,
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
  prisma.report.create = originalPrisma.reportCreate;
  prisma.report.findUnique = originalPrisma.reportFindUnique;
  prisma.report.update = originalPrisma.reportUpdate;
  prisma.auditLog.create = originalPrisma.auditLogCreate;
  notificationService.enqueue = originalEnqueue;
});

test("submitReport creates report with valid targetType and reason", async () => {
  const reportController = require("../controllers/reportController");
  let createArgs = null;

  prisma.report.create = async (args) => {
    createArgs = args;
    return { id: "report_1", ...args.data };
  };

  const result = await invokeController(reportController.submitReport, {
    body: {
      targetType: "Accommodation",
      targetId: "acc_1",
      reason: "fraud",
      description: "Suspicious listing",
    },
    user: { id: "user_1" },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(createArgs.data.reporterId, "user_1");
  assert.equal(createArgs.data.targetType, "Accommodation");
  assert.equal(createArgs.data.reason, "fraud");
});

test("submitReport rejects invalid targetType", async () => {
  const reportController = require("../controllers/reportController");

  const result = await invokeController(reportController.submitReport, {
    body: {
      targetType: "Booking",
      targetId: "booking_1",
      reason: "fraud",
    },
    user: { id: "user_1" },
  });

  assert.equal(result.error.statusCode, 400);
});

test("submitReport rejects invalid reason", async () => {
  const reportController = require("../controllers/reportController");

  const result = await invokeController(reportController.submitReport, {
    body: {
      targetType: "Review",
      targetId: "review_1",
      reason: "duplicate",
    },
    user: { id: "user_1" },
  });

  assert.equal(result.error.statusCode, 400);
});

test("resolveReport requires resolution text", async () => {
  const adminController = require("../controllers/adminController");

  const result = await invokeController(adminController.resolveReport, {
    params: { id: "report_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "resolution is required");
});

test("dismissReport requires resolution text", async () => {
  const adminController = require("../controllers/adminController");

  const result = await invokeController(adminController.dismissReport, {
    params: { id: "report_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "resolution is required");
});

test("resolveReport sets status RESOLVED and notifies reporter", async () => {
  const adminController = require("../controllers/adminController");
  let updateArgs = null;
  let notificationEvent = null;

  prisma.report.findUnique = async () => ({
    id: "report_1",
    status: "OPEN",
    reporter: { id: "user_1", email: "user@example.com" },
  });
  prisma.report.update = async (args) => {
    updateArgs = args;
    return {
      id: "report_1",
      ...args.data,
      reporter: { id: "user_1", email: "user@example.com" },
    };
  };
  prisma.auditLog.create = async ({ data }) => ({ id: "audit_1", ...data });
  notificationService.enqueue = async (event) => {
    notificationEvent = event;
    return { count: 1 };
  };

  const result = await invokeController(adminController.resolveReport, {
    params: { id: "report_1" },
    body: { resolution: "Action taken" },
    user: { id: "admin_1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateArgs.data.status, "RESOLVED");
  assert.equal(updateArgs.data.resolvedBy, "admin_1");
  assert.equal(updateArgs.data.resolvedAt instanceof Date, true);
  assert.equal(notificationEvent, "report.resolved");
});
