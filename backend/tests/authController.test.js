const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const emailUtils = require("../utils/email");
const smsUtils = require("../utils/sms");
const prisma = require("../utils/prisma");

const originalSendEmail = emailUtils.sendEmail;
const originalSendSms = smsUtils.sendSms;
const originalPrisma = {
  transaction: prisma.$transaction,
  listingFindUnique: prisma.listing.findUnique,
  userCreate: prisma.user.create,
  userDelete: prisma.user.delete,
  userFindFirst: prisma.user.findFirst,
  userFindUnique: prisma.user.findUnique,
  userUpdate: prisma.user.update,
};

const loadAuthController = () => {
  delete require.cache[require.resolve("../controllers/authController")];
  return require("../controllers/authController");
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

const buildAccountDeleteTx = ({
  calls,
  listings = [],
  accommodations = [],
  rooms = [],
  bookings = [],
  payments = [],
} = {}) => {
  const recordedCalls = calls || [];
  const record = (name) => async (args) => {
    recordedCalls.push({ name, args });
    return { count: 0 };
  };

  return {
    listing: {
      findMany: async () => listings,
      deleteMany: record("listing.deleteMany"),
    },
    accommodation: {
      findMany: async () => accommodations,
      deleteMany: record("accommodation.deleteMany"),
    },
    room: {
      findMany: async () => rooms,
      deleteMany: record("room.deleteMany"),
    },
    booking: {
      findMany: async () => bookings,
      deleteMany: record("booking.deleteMany"),
      updateMany: record("booking.updateMany"),
    },
    payment: {
      findMany: async () => payments,
      deleteMany: record("payment.deleteMany"),
    },
    notification: { deleteMany: record("notification.deleteMany") },
    savedSearch: { deleteMany: record("savedSearch.deleteMany") },
    listingDraft: { deleteMany: record("listingDraft.deleteMany") },
    listingRestoration: { deleteMany: record("listingRestoration.deleteMany") },
    engagement: { deleteMany: record("engagement.deleteMany") },
    report: {
      deleteMany: record("report.deleteMany"),
      updateMany: record("report.updateMany"),
    },
    dispute: {
      deleteMany: record("dispute.deleteMany"),
      updateMany: record("dispute.updateMany"),
    },
    review: { deleteMany: record("review.deleteMany") },
    auditLog: { deleteMany: record("auditLog.deleteMany") },
    bookingGuestInfo: { deleteMany: record("bookingGuestInfo.deleteMany") },
    bookingFeeSnapshot: { deleteMany: record("bookingFeeSnapshot.deleteMany") },
    refund: { deleteMany: record("refund.deleteMany") },
    availabilityBlock: {
      deleteMany: record("availabilityBlock.deleteMany"),
      updateMany: record("availabilityBlock.updateMany"),
    },
    roomImage: { deleteMany: record("roomImage.deleteMany") },
    roomAmenity: { deleteMany: record("roomAmenity.deleteMany") },
    seasonalRate: { deleteMany: record("seasonalRate.deleteMany") },
    roomFee: { deleteMany: record("roomFee.deleteMany") },
    occupancyRule: { deleteMany: record("occupancyRule.deleteMany") },
    occupancyPricingRule: { deleteMany: record("occupancyPricingRule.deleteMany") },
    promotion: { updateMany: record("promotion.updateMany") },
    accommodationImage: { deleteMany: record("accommodationImage.deleteMany") },
    accommodationAmenity: { deleteMany: record("accommodationAmenity.deleteMany") },
    cancellationPolicy: { deleteMany: record("cancellationPolicy.deleteMany") },
    checkInOutRules: { deleteMany: record("checkInOutRules.deleteMany") },
    taxRule: { deleteMany: record("taxRule.deleteMany") },
    notificationJob: { updateMany: record("notificationJob.updateMany") },
    user: { delete: record("user.delete") },
  };
};

test.before(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
});

test.afterEach(() => {
  emailUtils.sendEmail = originalSendEmail;
  smsUtils.sendSms = originalSendSms;
  prisma.$transaction = originalPrisma.transaction;
  prisma.listing.findUnique = originalPrisma.listingFindUnique;
  prisma.user.create = originalPrisma.userCreate;
  prisma.user.delete = originalPrisma.userDelete;
  prisma.user.findFirst = originalPrisma.userFindFirst;
  prisma.user.findUnique = originalPrisma.userFindUnique;
  prisma.user.update = originalPrisma.userUpdate;
  delete process.env.SKIP_EMAIL_VERIFICATION;
  delete process.env.SKIP_PHONE_VERIFICATION;
});

test("getUser returns a public-safe payload for anonymous viewers", async () => {
  const authController = loadAuthController();
  prisma.listing.findUnique = async () => ({ id: "listing-1", userId: "owner-1" });
  prisma.user.findUnique = async () => ({
    id: "owner-1",
    username: "landlord",
    avatar: "avatar.png",
    role: "landlord",
    email: "owner@example.com",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
    emailVerificationToken: "secret",
    emailVerificationExpires: new Date(),
  });

  const result = await invokeController(authController.getUserByListingId, {
    params: { id: "listing-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data, {
    _id: "owner-1",
    username: "landlord",
    avatar: "avatar.png",
    role: "landlord",
  });
  assert.equal("email" in result.body.data, false);
  assert.equal("nationalId" in result.body.data, false);
  assert.equal("emailVerificationToken" in result.body.data, false);
});

test("getUser includes contact details only when auth context is present", async () => {
  const authController = loadAuthController();
  prisma.listing.findUnique = async () => ({ id: "listing-1", userId: "owner-1" });
  prisma.user.findUnique = async () => ({
    id: "owner-1",
    username: "landlord",
    avatar: "avatar.png",
    role: "landlord",
    email: "owner@example.com",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
  });

  const result = await invokeController(authController.getUserByListingId, {
    params: { id: "listing-1" },
    user: { id: "viewer-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.email, "owner@example.com");
  assert.equal(result.body.data.phoneNumber, "+263771234567");
  assert.equal("nationalId" in result.body.data, false);
});

test("resendVerification uses authenticated email when no body email is provided", async () => {
  const authController = loadAuthController();
  let updateArgs = null;

  prisma.user.findUnique = async ({ where }) => {
    assert.deepEqual(where, { email: "authenticated@example.com" });
    return { id: "user-1", email: "authenticated@example.com", isEmailVerified: false };
  };
  prisma.user.update = async (args) => {
    updateArgs = args;
    return { id: "user-1", email: "authenticated@example.com", isEmailVerified: false };
  };
  emailUtils.sendEmail = async () => {};

  const result = await invokeController(authController.resendVerification, {
    user: { email: "authenticated@example.com" },
    body: {},
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateArgs.where.id, "user-1");
  assert.equal(typeof updateArgs.data.emailVerificationToken, "string");
  assert.equal(result.body.message, "Verification email resent.");
});

test("signup removes a newly created user if verification email delivery fails", async () => {
  let deletedFilter = null;

  emailUtils.sendEmail = async () => {
    throw new Error("smtp down");
  };

  const authController = loadAuthController();

  prisma.user.create = async ({ data }) => ({
    id: "new-user-id",
    ...data,
  });

  prisma.user.delete = async ({ where }) => {
    deletedFilter = where;
    return { id: where.id };
  };

  const result = await invokeController(authController.signup, {
    body: {
      username: "new-tenant",
      email: "new@example.com",
      password: "password123",
      role: "tenant",
    },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 503);
  assert.equal(
    result.error.message,
    "We couldn't send the verification email. Please try signing up again. Provider response: smtp down"
  );
  assert.deepEqual(deletedFilter, { id: "new-user-id" });
});

test("signup removes a newly created landlord if phone verification SMS delivery fails", async () => {
  process.env.SKIP_EMAIL_VERIFICATION = "true";
  let deletedFilter = null;

  smsUtils.sendSms = async () => {
    throw new Error("sms gateway down");
  };

  const authController = loadAuthController();

  prisma.user.create = async ({ data }) => ({
    id: "new-landlord-id",
    ...data,
  });

  prisma.user.update = async ({ where, data }) => ({
    id: where.id,
    username: "pending-landlord",
    email: "landlord@example.com",
    avatar: null,
    role: "landlord",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
    password: "hashed-password",
    isEmailVerified: true,
    isPhoneVerified: false,
    phoneOtp: data.phoneOtp,
    phoneOtpExpires: data.phoneOtpExpires,
    emailVerificationToken: "hashed-email-token",
    emailVerificationExpires: new Date(Date.now() + 86400000),
  });

  prisma.user.delete = async ({ where }) => {
    deletedFilter = where;
    return { id: where.id };
  };

  const result = await invokeController(authController.signup, {
    body: {
      username: "new-landlord",
      email: "landlord@example.com",
      password: "password123",
      role: "landlord",
      phoneNumber: "+263771234567",
      nationalId: "63-123456-A-12",
    },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 503);
  assert.equal(
    result.error.message,
    "We couldn't send the phone verification code. Please try signing up again. Provider response: sms gateway down"
  );
  assert.deepEqual(deletedFilter, { id: "new-landlord-id" });
});

test("login allows verified legacy-compatible users to access the API", async () => {
  const authController = loadAuthController();
  prisma.user.findUnique = async () => ({
    id: "legacy-1",
    email: "legacy@example.com",
    password:
      "$2a$12$eSWb0YLeBJ2rwbW5rsHJL.ue4SqeYpybOXnMwoDdYPSop4WPNStoO",
    isEmailVerified: true,
  });

  const result = await invokeController(authController.login, {
    body: {
      email: "legacy@example.com",
      password: "password123",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.ok(result.body.token);
  assert.equal(result.body.data.user._id, "legacy-1");
});

test("login strips OTP and verification secrets from the auth payload", async () => {
  const authController = loadAuthController();
  prisma.user.findUnique = async () => ({
    id: "legacy-1",
    email: "legacy@example.com",
    username: "legacy-user",
    role: "tenant",
    password:
      "$2a$12$eSWb0YLeBJ2rwbW5rsHJL.ue4SqeYpybOXnMwoDdYPSop4WPNStoO",
    isEmailVerified: true,
    isPhoneVerified: true,
    phoneOtp: "hashed-otp",
    phoneOtpExpires: new Date(Date.now() + 600000),
    emailVerificationToken: "hashed-token",
    emailVerificationExpires: new Date(Date.now() + 86400000),
    nationalId: "63-123456-A-12",
  });

  const result = await invokeController(authController.login, {
    body: {
      email: "legacy@example.com",
      password: "password123",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal("password" in result.body.data.user, false);
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("login blocks users whose verification state is unverified", async () => {
  const authController = loadAuthController();
  prisma.user.findUnique = async () => ({
    id: "legacy-2",
    email: "pending@example.com",
    password:
      "$2a$12$eSWb0YLeBJ2rwbW5rsHJL.ue4SqeYpybOXnMwoDdYPSop4WPNStoO",
    isEmailVerified: false,
  });

  const result = await invokeController(authController.login, {
    body: {
      email: "pending@example.com",
      password: "password123",
    },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 403);
  assert.equal(result.error.message, "Please verify your email before logging in");
});

test("verifyEmail returns a login-shaped success response for valid tokens", async () => {
  const authController = loadAuthController();
  let queriedFilter = null;
  let updateArgs = null;

  prisma.user.findFirst = async (query) => {
    queriedFilter = query.where;
    return {
      id: "verified-user-1",
      username: "verified-user",
      email: "verified@example.com",
      role: "tenant",
      password: "hashed-password",
      isEmailVerified: false,
    };
  };

  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "verified-user-1",
      username: "verified-user",
      email: "verified@example.com",
      role: "tenant",
      password: "hashed-password",
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    };
  };

  const result = await invokeController(authController.verifyEmail, {
    query: { token: "raw-verification-token" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "success");
  assert.ok(result.body.token);
  assert.ok(result.body.data.user);
  assert.equal(result.body.data.user._id, "verified-user-1");
  assert.equal(updateArgs.where.id, "verified-user-1");
  assert.equal(updateArgs.data.isEmailVerified, true);
  assert.equal(updateArgs.data.emailVerificationToken, null);
  assert.equal(updateArgs.data.emailVerificationExpires, null);
  assert.ok(queriedFilter);
  assert.ok(queriedFilter.emailVerificationToken);
  assert.ok(queriedFilter.emailVerificationExpires.gt instanceof Date);
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, "verified-user-1");
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("verifyEmail returns a minimal pending-phone payload for landlords", async () => {
  const authController = loadAuthController();

  prisma.user.findFirst = async () => ({
    id: "landlord-1",
    username: "pending-landlord",
    email: "landlord@example.com",
    avatar: "avatar.png",
    role: "landlord",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
    password: "hashed-password",
    isEmailVerified: false,
    isPhoneVerified: false,
    phoneOtp: "hashed-otp",
    phoneOtpExpires: new Date(Date.now() + 600000),
    emailVerificationToken: "hashed-email-token",
    emailVerificationExpires: new Date(Date.now() + 86400000),
  });

  prisma.user.update = async () => ({
    id: "landlord-1",
    username: "pending-landlord",
    email: "landlord@example.com",
    avatar: "avatar.png",
    role: "landlord",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
    password: "hashed-password",
    isEmailVerified: true,
    isPhoneVerified: false,
    phoneOtp: "hashed-otp",
    phoneOtpExpires: new Date(Date.now() + 600000),
    emailVerificationToken: null,
    emailVerificationExpires: null,
  });

  const result = await invokeController(authController.verifyEmail, {
    query: { token: "raw-verification-token" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "pending_phone_verification");
  assert.deepEqual(result.body.data.user, {
    _id: "landlord-1",
    username: "pending-landlord",
    email: "landlord@example.com",
    avatar: "avatar.png",
    role: "landlord",
    phoneNumber: "+263771234567",
    isEmailVerified: true,
    isPhoneVerified: false,
  });
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("signup with skipped email verification returns a minimal pending-phone payload", async () => {
  process.env.SKIP_EMAIL_VERIFICATION = "true";
  smsUtils.sendSms = async () => {};

  const authController = loadAuthController();

  prisma.user.create = async ({ data }) => ({
    id: "landlord-1",
    username: data.username,
    email: data.email,
    avatar: null,
    role: data.role,
    phoneNumber: data.phoneNumber,
    nationalId: data.nationalId,
    password: data.password,
    isEmailVerified: false,
    isPhoneVerified: false,
    emailVerificationToken: data.emailVerificationToken,
    emailVerificationExpires: data.emailVerificationExpires,
  });

  prisma.user.update = async () => ({
    id: "landlord-1",
    username: "pending-landlord",
    email: "landlord@example.com",
    avatar: null,
    role: "landlord",
    phoneNumber: "+263771234567",
    nationalId: "63-123456-A-12",
    password: "hashed-password",
    isEmailVerified: true,
    isPhoneVerified: false,
    phoneOtp: "hashed-otp",
    phoneOtpExpires: new Date(Date.now() + 600000),
    emailVerificationToken: "hashed-email-token",
    emailVerificationExpires: new Date(Date.now() + 86400000),
  });

  const result = await invokeController(authController.signup, {
    body: {
      username: "pending-landlord",
      email: "landlord@example.com",
      password: "password123",
      role: "landlord",
      phoneNumber: "+263771234567",
      nationalId: "63-123456-A-12",
    },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "pending_phone_verification");
  assert.equal(result.body.data.user.email, "landlord@example.com");
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("signup with skipped email and phone verification returns a landlord token", async () => {
  process.env.SKIP_EMAIL_VERIFICATION = "true";
  process.env.SKIP_PHONE_VERIFICATION = "true";
  let updateArgs = null;
  let smsCalled = false;

  smsUtils.sendSms = async () => {
    smsCalled = true;
    throw new Error("sms should not be sent");
  };

  const authController = loadAuthController();

  prisma.user.create = async ({ data }) => ({
    id: "landlord-1",
    username: data.username,
    email: data.email,
    avatar: null,
    role: data.role,
    phoneNumber: data.phoneNumber,
    nationalId: data.nationalId,
    password: data.password,
    isEmailVerified: false,
    isPhoneVerified: false,
    emailVerificationToken: data.emailVerificationToken,
    emailVerificationExpires: data.emailVerificationExpires,
  });

  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "landlord-1",
      username: "verified-landlord",
      email: "landlord@example.com",
      avatar: null,
      role: "landlord",
      phoneNumber: "+263771234567",
      nationalId: "63-123456-A-12",
      password: "hashed-password",
      isEmailVerified: true,
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
      emailVerificationToken: "hashed-email-token",
      emailVerificationExpires: new Date(Date.now() + 86400000),
    };
  };

  const result = await invokeController(authController.signup, {
    body: {
      username: "verified-landlord",
      email: "landlord@example.com",
      password: "password123",
      role: "landlord",
      phoneNumber: "+263771234567",
      nationalId: "63-123456-A-12",
    },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.ok(result.body.token);
  assert.equal(result.body.data.user._id, "landlord-1");
  assert.equal(result.body.data.user.isEmailVerified, true);
  assert.equal(result.body.data.user.isPhoneVerified, true);
  assert.deepEqual(updateArgs, {
    where: { id: "landlord-1" },
    data: {
      isEmailVerified: true,
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    },
  });
  assert.equal(smsCalled, false);
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, "landlord-1");
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("verifyEmail preserves invalid or expired token errors", async () => {
  const authController = loadAuthController();

  prisma.user.findFirst = async () => null;

  const result = await invokeController(authController.verifyEmail, {
    query: { token: "expired-or-invalid-token" },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "Verification link is invalid or has expired");
});

test("verifyPhone rejects malformed OTP values before querying the database", async () => {
  const authController = loadAuthController();
  let findFirstCalled = false;

  prisma.user.findFirst = async () => {
    findFirstCalled = true;
    return null;
  };

  const result = await invokeController(authController.verifyPhone, {
    body: { email: "landlord@example.com", otp: "12ab" },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "OTP must be a 6-digit number");
  assert.equal(findFirstCalled, false);
});

test("verifyPhone scopes OTP verification to the provided landlord email", async () => {
  const authController = loadAuthController();
  let queriedFilter = null;
  let updateArgs = null;

  prisma.user.findFirst = async ({ where }) => {
    queriedFilter = where;
    return {
      id: "landlord-1",
      email: "landlord@example.com",
      username: "pending-landlord",
      role: "landlord",
      password: "hashed-password",
      isEmailVerified: true,
      isPhoneVerified: false,
    };
  };

  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "landlord-1",
      email: "landlord@example.com",
      username: "pending-landlord",
      role: "landlord",
      password: "hashed-password",
      isEmailVerified: true,
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    };
  };

  const result = await invokeController(authController.verifyPhone, {
    body: { email: "landlord@example.com", otp: "123456" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "success");
  assert.equal(queriedFilter.email, "landlord@example.com");
  assert.equal(queriedFilter.role, "landlord");
  assert.equal(queriedFilter.isEmailVerified, true);
  assert.equal(queriedFilter.isPhoneVerified, false);
  assert.ok(queriedFilter.phoneOtp);
  assert.ok(queriedFilter.phoneOtpExpires.gt instanceof Date);
  assert.deepEqual(updateArgs, {
    where: { id: "landlord-1" },
    data: {
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    },
  });
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, "landlord-1");
});

test("getMe strips OTP and verification secrets from the authenticated payload", async () => {
  const authController = loadAuthController();

  prisma.user.findUnique = async () => ({
    id: "me-1",
    email: "me@example.com",
    username: "current-user",
    role: "landlord",
    password: "hashed-password",
    isEmailVerified: true,
    isPhoneVerified: false,
    phoneOtp: "hashed-otp",
    phoneOtpExpires: new Date(Date.now() + 600000),
    emailVerificationToken: "hashed-token",
    emailVerificationExpires: new Date(Date.now() + 86400000),
    nationalId: "63-123456-A-12",
  });

  const result = await invokeController(authController.getMe, {
    user: { id: "me-1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.user._id, "me-1");
  assert.equal("password" in result.body.data.user, false);
  assert.equal("phoneOtp" in result.body.data.user, false);
  assert.equal("phoneOtpExpires" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("emailVerificationExpires" in result.body.data.user, false);
  assert.equal("nationalId" in result.body.data.user, false);
});

test("delete removes dependent account records before deleting the user", async () => {
  const authController = loadAuthController();
  const calls = [];

  prisma.user.findUnique = async ({ where }) => ({
    id: where.id,
    role: "tenant",
  });
  prisma.$transaction = async (callback) =>
    callback(
      buildAccountDeleteTx({
        calls,
        listings: [{ id: "listing-1" }],
        accommodations: [{ id: "accommodation-1" }],
        rooms: [{ id: "room-1" }],
        bookings: [{ id: "booking-1" }],
        payments: [{ id: "payment-1" }],
      })
    );

  const result = await invokeController(authController.delete, {
    params: { id: "user-1" },
    user: { id: "user-1", role: "tenant" },
  });

  const callNames = calls.map((call) => call.name);

  assert.equal(result.statusCode, 204);
  assert(
    callNames.indexOf("savedSearch.deleteMany") < callNames.indexOf("user.delete"),
    "saved searches should be removed before user deletion"
  );
  assert(
    callNames.indexOf("refund.deleteMany") < callNames.indexOf("payment.deleteMany"),
    "refunds should be removed before payments"
  );
  assert(
    callNames.indexOf("review.deleteMany") < callNames.indexOf("booking.deleteMany"),
    "reviews should be removed before bookings"
  );
  assert.deepEqual(
    calls.find((call) => call.name === "savedSearch.deleteMany").args,
    { where: { userId: "user-1" } }
  );
  assert.deepEqual(
    calls.find((call) => call.name === "listingRestoration.deleteMany").args,
    { where: { userId: "user-1" } }
  );
  assert.deepEqual(
    calls.find((call) => call.name === "user.delete").args,
    { where: { id: "user-1" } }
  );
});

test("delete rejects attempts to remove another user's account", async () => {
  const authController = loadAuthController();
  let findUniqueCalled = false;
  let transactionCalled = false;

  prisma.user.findUnique = async () => {
    findUniqueCalled = true;
    return { id: "victim-1" };
  };
  prisma.$transaction = async () => {
    transactionCalled = true;
  };

  const result = await invokeController(authController.delete, {
    params: { id: "victim-1" },
    user: { id: "attacker-1", role: "tenant" },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 403);
  assert.equal(result.error.message, "You can only delete your own account");
  assert.equal(findUniqueCalled, false);
  assert.equal(transactionCalled, false);
});

test("submitVerification rejects non-landlords before updates or admin email", async () => {
  let updateCalled = false;
  let emailCalled = false;

  emailUtils.sendEmail = async () => {
    emailCalled = true;
  };
  const authController = loadAuthController();

  prisma.user.update = async () => {
    updateCalled = true;
    throw new Error("should not update non-landlords");
  };

  const result = await invokeController(authController.submitVerification, {
    user: {
      id: "tenant-1",
      role: "tenant",
      username: "tenant",
      email: "tenant@example.com",
    },
    body: {
      idImageUrl: "https://example.com/id.png",
      selfieUrl: "https://example.com/selfie.png",
    },
  });

  assert(result.error);
  assert.equal(result.error.statusCode, 403);
  assert.equal(updateCalled, false);
  assert.equal(emailCalled, false);
});

test("google marks existing unverified users as verified before issuing a token", async () => {
  const authController = loadAuthController();
  let updateArgs = null;

  prisma.user.findUnique = async () => ({
    id: "google-user-1",
    email: "google@example.com",
    username: "existing-user",
    role: "tenant",
    password: "hashed-password",
    isEmailVerified: false,
    isPhoneVerified: false,
  });

  prisma.user.update = async (args) => {
    updateArgs = args;
    return {
      id: "google-user-1",
      email: "google@example.com",
      username: "existing-user",
      role: "tenant",
      password: "hashed-password",
      isEmailVerified: true,
    };
  };

  const result = await invokeController(authController.google, {
    body: {
      name: "Existing User",
      email: "google@example.com",
      photo: "avatar.png",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(updateArgs, {
    where: { id: "google-user-1" },
    data: { isEmailVerified: true, isPhoneVerified: true },
  });
  assert.ok(result.body.token);
  assert.equal(result.body.data.user._id, "google-user-1");
});

test("google does not re-save existing users that are already verified", async () => {
  const authController = loadAuthController();
  let updateCalled = false;

  prisma.user.findUnique = async () => ({
    id: "google-user-2",
    email: "verified-google@example.com",
    username: "verified-user",
    role: "tenant",
    password: "hashed-password",
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  prisma.user.update = async () => {
    updateCalled = true;
    throw new Error("should not update verified user");
  };

  const result = await invokeController(authController.google, {
    body: {
      name: "Verified User",
      email: "verified-google@example.com",
      photo: "avatar.png",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(updateCalled, false);
  assert.ok(result.body.token);
  assert.equal(result.body.data.user._id, "google-user-2");
});
