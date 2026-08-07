const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../utils/prisma");

const originalPrisma = {
  transaction: prisma.$transaction,
  userUpdate: prisma.user.update,
};

const loadProviderController = () => {
  delete require.cache[require.resolve("../controllers/providerController")];
  return require("../controllers/providerController");
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
      }
    });
  });

test.afterEach(() => {
  prisma.$transaction = originalPrisma.transaction;
  prisma.user.update = originalPrisma.userUpdate;
  delete process.env.SKIP_EMAIL_VERIFICATION;
});

test("registerProvider rejects missing account password before hashing", async () => {
  const providerController = loadProviderController();
  let transactionCalled = false;
  prisma.$transaction = async () => {
    transactionCalled = true;
  };

  const result = await invokeController(providerController.registerProvider, {
    body: {
      username: "host",
      email: "host@example.com",
      businessName: "Town Hotel",
      businessType: "hotel",
      contactPhone: "+263771234567",
    },
  });

  assert.equal(result.error.statusCode, 400);
  assert.match(result.error.message, /password/);
  assert.equal(transactionCalled, false);
});

test("registerProvider accepts flat account and provider profile fields", async () => {
  process.env.SKIP_EMAIL_VERIFICATION = "true";
  const providerController = loadProviderController();
  let createdUserData = null;

  prisma.$transaction = async (callback) =>
    callback({
      user: {
        create: async ({ data }) => {
          createdUserData = data;
          return {
            id: "provider-1",
            username: data.username,
            email: data.email,
            role: data.role,
            providerProfile: data.providerProfile,
            createdAt: new Date("2026-08-06T00:00:00.000Z"),
            updatedAt: new Date("2026-08-06T00:00:00.000Z"),
          };
        },
      },
      accommodation: {
        create: async () => ({ id: "accommodation-1" }),
      },
    });
  prisma.user.update = async ({ where, data }) => ({
    id: where.id,
    username: createdUserData.username,
    email: createdUserData.email,
    role: "provider",
    isEmailVerified: data.isEmailVerified,
    providerProfile: createdUserData.providerProfile,
  });

  const result = await invokeController(providerController.registerProvider, {
    body: {
      username: "host",
      email: "host@example.com",
      password: "TestPass123!",
      businessName: "Town Hotel",
      businessType: "hotel",
      contactPhone: "+263771234567",
      address: "1 Main Street",
      location: { province: "Harare", city: "Harare" },
    },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "pending_verification");
  assert.equal(result.body.data.user._id, "provider-1");
  assert.equal(createdUserData.role, "provider");
  assert.notEqual(createdUserData.password, "TestPass123!");
});
