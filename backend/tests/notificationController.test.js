const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../utils/prisma");
const notificationController = require("../controllers/notificationController");
const originalWarn = console.warn;

const originalNotification = prisma.notification
  ? {
      count: prisma.notification.count,
      findMany: prisma.notification.findMany,
      findFirst: prisma.notification.findFirst,
      updateMany: prisma.notification.updateMany,
    }
  : null;

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

const unavailableStoreError = () => {
  const error = new Error('The table "Notification" does not exist');
  error.code = "P2021";
  return error;
};

test.beforeEach(() => {
  console.warn = () => {};
});

test.afterEach(() => {
  console.warn = originalWarn;

  if (!originalNotification) {
    return;
  }

  prisma.notification.count = originalNotification.count;
  prisma.notification.findMany = originalNotification.findMany;
  prisma.notification.findFirst = originalNotification.findFirst;
  prisma.notification.updateMany = originalNotification.updateMany;
});

test("getUnreadCount returns zero when notification store is unavailable", async () => {
  assert.ok(prisma.notification, "Prisma notification model must exist in generated client");
  prisma.notification.count = async () => {
    throw unavailableStoreError();
  };

  const result = await invokeController(notificationController.getUnreadCount, {
    user: { id: "user_1" },
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "success",
    data: { count: 0 },
  });
});

test("getMyNotifications returns an empty page when notification store is unavailable", async () => {
  prisma.notification.count = async () => {
    throw unavailableStoreError();
  };
  prisma.notification.findMany = async () => {
    throw unavailableStoreError();
  };

  const result = await invokeController(notificationController.getMyNotifications, {
    user: { id: "user_1" },
    query: { page: "1", limit: "5" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "success",
    total: 0,
    data: [],
  });
});

test("markAllAsRead reports zero updates when notification store is unavailable", async () => {
  prisma.notification.updateMany = async () => {
    throw unavailableStoreError();
  };

  const result = await invokeController(notificationController.markAllAsRead, {
    user: { id: "user_1" },
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "success",
    data: { updated: 0 },
  });
});
