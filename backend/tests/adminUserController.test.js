const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const auditLog = require("../utils/auditLog");
const prisma = require("../utils/prisma");

const originalAuditCreate = auditLog.createEntry;
const originalMethods = {
  userCount: prisma.user.count,
  userFindMany: prisma.user.findMany,
  userFindUnique: prisma.user.findUnique,
  userCreate: prisma.user.create,
  userUpdate: prisma.user.update,
  listingCount: prisma.listing.count,
  listingFindMany: prisma.listing.findMany,
  accommodationCount: prisma.accommodation.count,
  accommodationFindMany: prisma.accommodation.findMany,
  roomCount: prisma.room.count,
  roomFindMany: prisma.room.findMany,
  engagementCount: prisma.engagement.count,
  engagementFindMany: prisma.engagement.findMany,
  bookingCount: prisma.booking.count,
  bookingFindMany: prisma.booking.findMany,
};

const loadController = () => {
  delete require.cache[require.resolve("../controllers/adminUserController")];
  return require("../controllers/adminUserController");
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
        resolve({ statusCode: this.statusCode, body: payload });
      },
    };
    handler(req, res, (error) => resolve({ error }));
  });

test.beforeEach(() => {
  auditLog.createEntry = async () => undefined;
});

test.afterEach(() => {
  prisma.user.count = originalMethods.userCount;
  prisma.user.findMany = originalMethods.userFindMany;
  prisma.user.findUnique = originalMethods.userFindUnique;
  prisma.user.create = originalMethods.userCreate;
  prisma.user.update = originalMethods.userUpdate;
  prisma.listing.count = originalMethods.listingCount;
  prisma.listing.findMany = originalMethods.listingFindMany;
  prisma.accommodation.count = originalMethods.accommodationCount;
  prisma.accommodation.findMany = originalMethods.accommodationFindMany;
  prisma.room.count = originalMethods.roomCount;
  prisma.room.findMany = originalMethods.roomFindMany;
  prisma.engagement.count = originalMethods.engagementCount;
  prisma.engagement.findMany = originalMethods.engagementFindMany;
  prisma.booking.count = originalMethods.bookingCount;
  prisma.booking.findMany = originalMethods.bookingFindMany;
  auditLog.createEntry = originalAuditCreate;
});

test("admin user list searches phone and filters active status with paging", async () => {
  const controller = loadController();
  let countArgs;
  let findArgs;
  prisma.user.count = async (args) => {
    countArgs = args;
    return 21;
  };
  prisma.user.findMany = async (args) => {
    findArgs = args;
    return [{
      id: "user-1",
      username: "Tenant",
      email: "tenant@example.com",
      role: "tenant",
      phoneNumber: "+263771234567",
      isEmailVerified: true,
      isPhoneVerified: false,
      verificationStatus: "UNVERIFIED",
      accountSuspendedAt: null,
      providerProfile: { businessName: "Test", nationalId: "must-not-leak" },
      createdAt: new Date("2026-01-01"),
      _count: { listings: 1 },
    }];
  };

  const result = await invokeController(controller.getAdminUsers, {
    query: {
      page: "2",
      limit: "10",
      search: "7712",
      accountStatus: "active",
      sortBy: "username",
      sortOrder: "asc",
    },
    user: { id: "admin-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.total, 21);
  assert.equal(findArgs.skip, 10);
  assert.equal(findArgs.take, 10);
  assert.deepEqual(findArgs.orderBy, { username: "asc" });
  assert.deepEqual(countArgs.where.accountSuspendedAt, null);
  assert.equal(result.body.data[0].providerProfile.businessName, "Test");
  assert.equal("nationalId" in result.body.data[0].providerProfile, false);
});

test("admin user creation hashes the initial password and omits it from the response", async () => {
  const controller = loadController();
  let createArgs;
  prisma.user.create = async (args) => {
    createArgs = args;
    return {
      id: "created-user",
      ...args.data,
      createdAt: new Date("2026-01-01"),
      providerProfile: null,
    };
  };

  const result = await invokeController(controller.createAdminUser, {
    body: {
      username: "New user",
      email: "NEW@example.com",
      phoneNumber: "",
      role: "tenant",
      password: "StrongPass1!",
    },
    user: { id: "admin-1" },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(createArgs.data.email, "new@example.com");
  assert.equal(await bcrypt.compare("StrongPass1!", createArgs.data.password), true);
  assert.equal(createArgs.data.isEmailVerified, true);
  assert.equal(result.body.data.id, "created-user");
  assert.equal("password" in result.body.data, false);
});

test("admin user creation rejects weak passwords before writing", async () => {
  const controller = loadController();
  let createCalled = false;
  prisma.user.create = async () => {
    createCalled = true;
  };

  const result = await invokeController(controller.createAdminUser, {
    body: {
      username: "New user",
      email: "new@example.com",
      role: "tenant",
      password: "weak",
    },
  });

  assert.equal(createCalled, false);
  assert.equal(result.error.statusCode, 400);
  assert.match(result.error.message, /Password must be at least 8 characters/);
});

test("admin user editing rejects promotion to an admin role", async () => {
  const controller = loadController();
  let updateCalled = false;
  prisma.user.findUnique = async () => ({ id: "user-1", role: "tenant" });
  prisma.user.update = async () => {
    updateCalled = true;
  };

  const result = await invokeController(controller.updateAdminUser, {
    params: { id: "user-1" },
    body: { role: "admin" },
  });

  assert.equal(updateCalled, false);
  assert.equal(result.error.statusCode, 400);
});

test("admin user editing updates only supported profile fields", async () => {
  const controller = loadController();
  let updateArgs;
  prisma.user.findUnique = async () => ({ id: "user-1", role: "tenant" });
  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "user-1",
      username: args.data.username,
      email: args.data.email,
      phoneNumber: args.data.phoneNumber,
      role: "tenant",
      isEmailVerified: args.data.isEmailVerified,
      isPhoneVerified: true,
      verificationStatus: "UNVERIFIED",
      accountSuspendedAt: null,
      providerProfile: null,
      createdAt: new Date("2026-01-01"),
    };
  };

  const result = await invokeController(controller.updateAdminUser, {
    params: { id: "user-1" },
    body: {
      username: " Updated name ",
      email: "UPDATED@example.com",
      phoneNumber: "",
      isEmailVerified: false,
      password: "must-not-change",
      accountSuspendedAt: new Date(),
    },
    user: { id: "admin-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(updateArgs.data, {
    username: "Updated name",
    email: "updated@example.com",
    phoneNumber: null,
    isEmailVerified: false,
  });
  assert.equal(result.body.data.email, "updated@example.com");
  assert.equal("password" in result.body.data, false);
});

test("admin account suspension only updates the account status and prevents self-suspension", async () => {
  const controller = loadController();
  let updateArgs;
  prisma.user.findUnique = async () => ({ id: "user-2", accountSuspendedAt: null });
  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "user-2",
      username: "Tenant",
      email: "tenant@example.com",
      role: "tenant",
      isEmailVerified: true,
      isPhoneVerified: false,
      verificationStatus: "UNVERIFIED",
      accountSuspendedAt: args.data.accountSuspendedAt,
      providerProfile: null,
      createdAt: new Date(),
    };
  };

  const result = await invokeController(controller.suspendAdminUser, {
    params: { id: "user-2" },
    user: { id: "admin-1" },
  });
  assert.equal(result.statusCode, 200);
  assert.ok(updateArgs.data.accountSuspendedAt instanceof Date);
  assert.deepEqual(Object.keys(updateArgs.data), ["accountSuspendedAt"]);

  const selfSuspend = await invokeController(controller.suspendAdminUser, {
    params: { id: "admin-1" },
    user: { id: "admin-1" },
  });
  assert.equal(selfSuspend.error.statusCode, 400);
});

test("admin reactivation clears only the account-wide suspension", async () => {
  const controller = loadController();
  let updateArgs;
  prisma.user.findUnique = async () => ({
    id: "user-2",
    accountSuspendedAt: new Date("2026-01-01"),
  });
  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "user-2",
      username: "Tenant",
      email: "tenant@example.com",
      role: "tenant",
      isEmailVerified: true,
      isPhoneVerified: false,
      verificationStatus: "UNVERIFIED",
      accountSuspendedAt: args.data.accountSuspendedAt,
      providerProfile: null,
      createdAt: new Date(),
    };
  };

  const result = await invokeController(controller.reactivateAdminUser, {
    params: { id: "user-2" },
    user: { id: "admin-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(updateArgs.data, { accountSuspendedAt: null });
  assert.equal(result.body.data.accountSuspendedAt, null);
});

test("admin password reset enforces strength and stores only a hash", async () => {
  const controller = loadController();
  let updateArgs;
  prisma.user.findUnique = async () => ({ id: "user-1" });
  prisma.user.update = async (args) => {
    updateArgs = args;
  };

  const result = await invokeController(controller.resetAdminUserPassword, {
    params: { id: "user-1" },
    body: { password: "NewStrong9!" },
    user: { id: "admin-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(await bcrypt.compare("NewStrong9!", updateArgs.data.password), true);
  assert.equal("password" in result.body, false);
  assert.equal("password" in updateArgs.data, true);
  assert.equal(updateArgs.data.passwordResetToken, null);
});

test("admin user activity includes engagements on either side and both booking parties", async () => {
  const controller = loadController();
  const date = new Date("2026-02-01");
  prisma.user.findUnique = async () => ({ id: "user-1" });
  prisma.engagement.count = async ({ where }) => {
    assert.deepEqual(where.OR, [{ tenantId: "user-1" }, { landlordId: "user-1" }]);
    return 1;
  };
  prisma.engagement.findMany = async () => [{
    id: "engagement-1",
    tenantId: "user-1",
    landlordId: "landlord-1",
    status: "PENDING",
    createdAt: date,
    listing: { id: "listing-1", name: "Rental" },
    tenant: { id: "user-1", username: "Tenant" },
    landlord: { id: "landlord-1", username: "Landlord" },
  }];

  const result = await invokeController(controller.getAdminUserActivity, {
    params: { id: "user-1" },
    query: { section: "engagements" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data[0].relationToUser, "Made by user");
  assert.equal(result.body.data[0].listing.name, "Rental");
});
