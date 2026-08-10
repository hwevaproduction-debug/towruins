const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../utils/prisma");
const auditLog = require("../utils/auditLog");

const originalPrisma = {
  transaction: prisma.$transaction,
  roomCreate: prisma.room && prisma.room.create,
  roomImageCreateMany: prisma.roomImage && prisma.roomImage.createMany,
  userFindUnique: prisma.user && prisma.user.findUnique,
};
const originalAuditCreate = auditLog.createEntry;

const loadAdminController = () => {
  delete require.cache[require.resolve("../controllers/adminController")];
  return require("../controllers/adminController");
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
  prisma.$transaction = originalPrisma.transaction;
  if (prisma.room) prisma.room.create = originalPrisma.roomCreate;
  if (prisma.roomImage) prisma.roomImage.createMany = originalPrisma.roomImageCreateMany;
  if (prisma.user) prisma.user.findUnique = originalPrisma.userFindUnique;
  auditLog.createEntry = originalAuditCreate;
});

test("createTemporaryStay creates a room and returns 201", async () => {
  const adminController = loadAdminController();

  // Stub user lookup
  prisma.user.findUnique = async ({ where }) => ({ id: where.id, username: "prov1", email: "prov@example.com" });

  // Stub audit create
  auditLog.createEntry = async () => ({});

  // Stub transaction to create room
  prisma.$transaction = async (fn) => {
    const tx = {
      room: {
        create: async ({ data }) => ({ ...data, id: "room1" }),
      },
      roomImage: {
        createMany: async () => ({}),
      },
    };

    return await fn(tx);
  };

  const result = await invokeController(adminController.createTemporaryStay, {
    body: { providerId: "prov1", name: "Test Room", basePricePerNight: 50 },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.ok(result.body.data.room);
  assert.equal(result.body.data.room._id, "room1");
});

test("createTemporaryStay returns 404 when provider not found", async () => {
  const adminController = loadAdminController();

  prisma.user.findUnique = async () => null;

  const result = await invokeController(adminController.createTemporaryStay, {
    body: { providerId: "missing", name: "X", basePricePerNight: 10 },
  });

  assert.ok(result.error);
  assert.equal(result.error.statusCode, 404);
  assert.equal(result.error.message, "Provider not found");
});

test("createTemporaryStay returns 400 when providerId is missing", async () => {
  const adminController = loadAdminController();

  const result = await invokeController(adminController.createTemporaryStay, {
    body: {},
  });

  assert.ok(result.error);
  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "providerId is required");
});
