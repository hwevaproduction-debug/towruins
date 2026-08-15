const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");
// Custom Imports
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const { comparePassword } = require("../utils/auth");
const { isPremiumTenant } = require("../utils/monetization");
const { sendEmail, buildBrandedEmail } = require("../utils/email");
const { sendSms } = require("../utils/sms");
const walletService = require("../utils/walletService");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashVerificationToken(rawToken),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
};

const buildVerificationDeliveryError = (channel, error) => {
  const providerDetail =
    typeof error?.message === "string" && error.message.trim()
      ? ` Provider response: ${error.message.trim()}`
      : "";

  if (channel === "sms") {
    return new AppError(
      `We couldn't send the phone verification code. Please try signing up again.${providerDetail}`,
      503
    );
  }

  return new AppError(
    `We couldn't send the verification email. Please try signing up again.${providerDetail}`,
    503
  );
};

const generatePhoneOtp = () => {
  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  return {
    rawOtp,
    hashedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
};

const phoneOtpResendAttempts = new Map();

const getAppBaseUrl = () => {
  const configuredBaseUrl =
    process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";

  return configuredBaseUrl.replace(/\/+$/, "");
};

const sendVerificationEmail = async (user, rawToken) => {
  const verificationUrl = `${getAppBaseUrl()}/verify-email?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Town Ruins email",
    text: `Welcome to Town Ruins. Verify your email by opening this link: ${verificationUrl}`,
    html: buildBrandedEmail({
      title: "Verify your email",
      preheader: "One click to verify your Town Ruins account",
      body: `<p>Welcome to Town Ruins! Please verify your email address to activate your account.</p><p>This link expires in <strong>24 hours</strong>.</p>`,
      ctaText: "Verify Email",
      ctaUrl: verificationUrl,
    }),
  });
};

const buildPublicUserPayload = (user, { includeContactDetails = false } = {}) => {
  const source = user;
  const payload = {
    _id: source.id,
    username: source.username,
    avatar: source.avatar,
    role: source.role,
  };

  if (includeContactDetails) {
    payload.email = source.email;
    payload.phoneNumber = source.phoneNumber || null;
  }

  return payload;
};

const buildAuthUserPayload = (user) => ({
  _id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  phoneNumber: user.phoneNumber || null,
  isEmailVerified: Boolean(user.isEmailVerified),
  isPhoneVerified: Boolean(user.isPhoneVerified),
  verificationStatus: user.verificationStatus || "UNVERIFIED",
  premiumExpiry: user.premiumExpiry || null,
  tokenBalance: user.tokenBalance ?? 0,
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
});

const buildPendingVerificationUserPayload = (user) => ({
  ...buildPublicUserPayload(user, { includeContactDetails: true }),
  isEmailVerified: Boolean(user.isEmailVerified),
  isPhoneVerified: Boolean(user.isPhoneVerified),
});

const getUserId = (user) => user?.id || user?._id?.toString();

const isAdminUser = (user) => ["admin", "super_admin"].includes(user?.role);

const idsFrom = (records) => records.map((record) => record.id);

const compact = (values) => values.filter(Boolean);

const impossibleIdWhere = { id: "__never__" };

const whereAny = (conditions) => {
  const OR = compact(conditions);
  return OR.length ? { OR } : impossibleIdWhere;
};

const idInWhere = (ids) => (ids.length ? { id: { in: ids } } : impossibleIdWhere);

const fieldIn = (field, values) => (values.length ? { [field]: { in: values } } : null);

const deleteUserAccount = async (userId) => {
  await prisma.$transaction(async (tx) => {
    const listings = await tx.listing.findMany({
      where: { userId },
      select: { id: true },
    });
    const listingIds = idsFrom(listings);

    const accommodations = await tx.accommodation.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const accommodationIds = idsFrom(accommodations);

    const rooms = await tx.room.findMany({
      where: whereAny([
        { providerId: userId },
        fieldIn("accommodationId", accommodationIds),
      ]),
      select: { id: true },
    });
    const roomIds = idsFrom(rooms);

    const bookings = await tx.booking.findMany({
      where: whereAny([
        { guestId: userId },
        fieldIn("roomId", roomIds),
      ]),
      select: { id: true },
    });
    const bookingIds = idsFrom(bookings);

    const payments = await tx.payment.findMany({
      where: whereAny([
        { userId },
        fieldIn("listingId", listingIds),
        fieldIn("bookingId", bookingIds),
      ]),
      select: { id: true },
    });
    const paymentIds = idsFrom(payments);

    const deletedResourceIds = [
      userId,
      ...listingIds,
      ...accommodationIds,
      ...roomIds,
      ...bookingIds,
      ...paymentIds,
    ];

    await tx.notification.deleteMany({ where: { userId } });
    await tx.savedSearch.deleteMany({ where: { userId } });
    await tx.listingDraft.deleteMany({ where: { userId } });
    await tx.listingRestoration.deleteMany({ where: { userId } });
    await tx.engagement.deleteMany({
      where: whereAny([
        { tenantId: userId },
        { landlordId: userId },
        fieldIn("listingId", listingIds),
      ]),
    });
    await tx.report.deleteMany({
      where: whereAny([
        { reporterId: userId },
        fieldIn("targetId", deletedResourceIds),
      ]),
    });
    await tx.dispute.deleteMany({
      where: whereAny([
        { raisedBy: userId },
        fieldIn("bookingId", bookingIds),
      ]),
    });
    await tx.review.deleteMany({
      where: whereAny([
        { guestId: userId },
        fieldIn("bookingId", bookingIds),
        fieldIn("accommodationId", accommodationIds),
      ]),
    });
    await tx.auditLog.deleteMany({ where: { adminId: userId } });

    await tx.bookingGuestInfo.deleteMany({
      where: fieldIn("bookingId", bookingIds) || impossibleIdWhere,
    });
    await tx.bookingFeeSnapshot.deleteMany({
      where: fieldIn("bookingId", bookingIds) || impossibleIdWhere,
    });
    await tx.refund.deleteMany({
      where: whereAny([
        fieldIn("paymentId", paymentIds),
        fieldIn("bookingId", bookingIds),
      ]),
    });
    await tx.payment.deleteMany({
      where: whereAny([
        { userId },
        fieldIn("listingId", listingIds),
        fieldIn("bookingId", bookingIds),
      ]),
    });
    await tx.booking.deleteMany({
      where: whereAny([
        { guestId: userId },
        fieldIn("roomId", roomIds),
      ]),
    });

    await tx.availabilityBlock.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.roomImage.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.roomAmenity.deleteMany({
      where: fieldIn("roomId", roomIds) || { roomId: "__never__" },
    });
    await tx.seasonalRate.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.roomFee.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.occupancyRule.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.occupancyPricingRule.deleteMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
    });
    await tx.promotion.updateMany({
      where: fieldIn("roomId", roomIds) || impossibleIdWhere,
      data: { roomId: null },
    });
    await tx.room.deleteMany({ where: idInWhere(roomIds) });

    await tx.accommodationImage.deleteMany({
      where: fieldIn("accommodationId", accommodationIds) || impossibleIdWhere,
    });
    await tx.accommodationAmenity.deleteMany({
      where: fieldIn("accommodationId", accommodationIds) || { accommodationId: "__never__" },
    });
    await tx.cancellationPolicy.deleteMany({
      where: fieldIn("accommodationId", accommodationIds) || impossibleIdWhere,
    });
    await tx.checkInOutRules.deleteMany({
      where: fieldIn("accommodationId", accommodationIds) || impossibleIdWhere,
    });
    await tx.taxRule.deleteMany({
      where: fieldIn("accommodationId", accommodationIds) || impossibleIdWhere,
    });
    await tx.promotion.updateMany({
      where: fieldIn("accommodationId", accommodationIds) || impossibleIdWhere,
      data: { accommodationId: null },
    });
    await tx.accommodation.deleteMany({ where: idInWhere(accommodationIds) });

    await tx.listing.deleteMany({ where: idInWhere(listingIds) });

    await tx.booking.updateMany({
      where: { providerId: userId },
      data: { providerId: null },
    });
    await tx.availabilityBlock.updateMany({
      where: { createdBy: userId },
      data: { createdBy: null },
    });
    await tx.notificationJob.updateMany({
      where: { recipientId: userId },
      data: { recipientId: null },
    });
    await tx.report.updateMany({
      where: { resolvedBy: userId },
      data: { resolvedBy: null },
    });
    await tx.dispute.updateMany({
      where: { resolvedBy: userId },
      data: { resolvedBy: null },
    });

    await tx.user.delete({ where: { id: userId } });
  }, { timeout: 30000 });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const { password, ...sanitizedUser } = user;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: buildAuthUserPayload(sanitizedUser),
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { username, email, password, role, consentAcceptedAt, phoneNumber, nationalId } = req.body;
  const allowedRoles = ["tenant", "landlord"];

  if (role && !allowedRoles.includes(role)) {
    return next(new AppError("Invalid role. Role must be tenant or landlord", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.trim();
  const verification = createEmailVerificationToken();
  const newUser = await prisma.user.create({
    data: {
      username: normalizedUsername,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      ...(role ? { role } : {}),
      consentAcceptedAt: consentAcceptedAt ? new Date(consentAcceptedAt) : undefined,
      phoneNumber: phoneNumber || undefined,
      nationalId: nationalId || undefined,
      isEmailVerified: false,
      emailVerificationToken: verification.hashedToken,
      emailVerificationExpires: new Date(verification.expiresAt),
    },
  });

  const skipEmail = process.env.SKIP_EMAIL_VERIFICATION === "true";
  const skipPhone = process.env.SKIP_PHONE_VERIFICATION === "true";

  if (skipPhone && role === "landlord") {
    const fullyVerified = await prisma.user.update({
      where: { id: newUser.id },
      data: {
        isPhoneVerified: true,
        phoneOtp: null,
        phoneOtpExpires: null,
      },
    });

    if (skipEmail) {
      await prisma.user.update({
        where: { id: newUser.id },
        data: {
          isEmailVerified: true,
          isPhoneVerified: true,
          phoneOtp: null,
          phoneOtpExpires: null,
        },
      });

      if (fullyVerified.walletInitialized === false) {
        await prisma.$transaction(async (tx) => {
          await walletService.grantTokens(fullyVerified.id, 100, "welcome_bonus", "Welcome bonus — 100 TR", tx);
          await tx.user.update({ where: { id: fullyVerified.id }, data: { walletInitialized: true } });
        });
        const refreshed = await prisma.user.findUnique({ where: { id: fullyVerified.id } });
        return createSendToken(refreshed, 201, res);
      }
      return createSendToken(fullyVerified, 201, res);
    }

    return res.status(201).json({
      status: "pending_verification",
      message: "Account created. Please check your email to verify your account.",
      data: {
        user: buildPendingVerificationUserPayload(fullyVerified),
      },
    });
  }

  if (skipEmail) {
    if (skipPhone) {
      const fullyVerified = await prisma.user.update({
        where: { id: newUser.id },
        data: {
          isEmailVerified: true,
          isPhoneVerified: true,
          phoneOtp: null,
          phoneOtpExpires: null,
        },
      });

      if (fullyVerified.walletInitialized === false) {
        await prisma.$transaction(async (tx) => {
          await walletService.grantTokens(fullyVerified.id, 100, "welcome_bonus", "Welcome bonus — 100 TR", tx);
          await tx.user.update({ where: { id: fullyVerified.id }, data: { walletInitialized: true } });
        });
        const refreshed = await prisma.user.findUnique({ where: { id: fullyVerified.id } });
        return createSendToken(refreshed, 201, res);
      }
      return createSendToken(fullyVerified, 201, res);
    }

    if (role === "landlord") {
      const phoneVerification = generatePhoneOtp();
      const pendingLandlord = await prisma.user.update({
        where: { id: newUser.id },
        data: {
          isEmailVerified: true,
          phoneOtp: phoneVerification.hashedOtp,
          phoneOtpExpires: new Date(phoneVerification.expiresAt),
        },
      });

      try {
        await sendSms({
          to: phoneNumber,
          message: `Your Town Ruins verification code is ${phoneVerification.rawOtp}. It expires in 10 minutes.`,
        });
      } catch (error) {
        await prisma.user.delete({ where: { id: newUser.id } });
        return next(buildVerificationDeliveryError("sms", error));
      }

      return res.status(201).json({
        status: "pending_phone_verification",
        data: {
          user: buildPendingVerificationUserPayload(pendingLandlord),
        },
      });
    }

    const verifiedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { isEmailVerified: true },
    });

    if (verifiedUser.walletInitialized === false) {
      await prisma.$transaction(async (tx) => {
        await walletService.grantTokens(verifiedUser.id, 100, "welcome_bonus", "Welcome bonus — 100 TR", tx);
        await tx.user.update({ where: { id: verifiedUser.id }, data: { walletInitialized: true } });
      });
      const refreshed = await prisma.user.findUnique({ where: { id: verifiedUser.id } });
      return createSendToken(refreshed, 201, res);
    }
    return createSendToken(verifiedUser, 201, res);
  }

  try {
    await sendVerificationEmail(newUser, verification.rawToken);
  } catch (error) {
    await prisma.user.delete({ where: { id: newUser.id } });
    return next(buildVerificationDeliveryError("email", error));
  }

  newUser.password = undefined;

  res.status(201).json({
    status: "pending_verification",
    message: "Account created. Please check your email to verify your account.",
    data: {
      user: buildPendingVerificationUserPayload(newUser),
    },
  });
});


exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) Check if user exists
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return next(new AppError("User not found", 404));

  // 3) Check if password is correct
  const correct = await comparePassword(password, user.password);
  if (!correct) {
    return next(new AppError("Incorrect password", 401));
  }

  if (user.isEmailVerified !== true) {
    return next(new AppError("Please verify your email before logging in", 403));
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const rawToken = req.query.token;

  if (!rawToken) {
    return next(new AppError("Verification token is required", 400));
  }

  const hashedToken = hashVerificationToken(rawToken.toString());

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return next(new AppError("Verification link is invalid or has expired", 400));
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  if (verifiedUser.role === "landlord" && verifiedUser.isPhoneVerified !== true) {
    return res.status(200).json({
      status: "pending_phone_verification",
      data: {
        user: buildPendingVerificationUserPayload(verifiedUser),
      },
    });
  }

  if (verifiedUser.walletInitialized === false) {
    await prisma.$transaction(async (tx) => {
      await walletService.grantTokens(verifiedUser.id, 100, "welcome_bonus", "Welcome bonus — 100 TR", tx);
      await tx.user.update({ where: { id: verifiedUser.id }, data: { walletInitialized: true } });
    });
    const refreshed = await prisma.user.findUnique({ where: { id: verifiedUser.id } });
    createSendToken(refreshed, 200, res);
  } else {
    createSendToken(verifiedUser, 200, res);
  }
});

exports.getUserByListingId = catchAsync(async (req, res, next) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
  });
  if (!listing) {
    return next(new AppError("No listing found with that ID", 404));
  }

  const user = await prisma.user.findUnique({
    where: { id: listing.userId },
  });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: buildPublicUserPayload(user, {
      includeContactDetails: Boolean(req.user),
    }),
  });
});

exports.update = catchAsync(async (req, res, next) => {
  const { username, email, password, avatar } = req.body.payload;

  // 1) Check if user exists
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  const data = {
    username,
    email,
    avatar,
  };

  if (password && typeof password === "string" && password.length > 0) {
    const hashedPassword = await bcrypt.hash(password, 12);
    data.password = hashedPassword;
  }

  // 3) Update user
  const newUser = await prisma.user.update({
    where: { id: req.params.id },
    data,
  });

  // 4) If everything ok, send token to client
  createSendToken(newUser, 200, res);
});

exports.getMe = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Not authenticated", 401));
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: buildAuthUserPayload(user),
    },
  });
});

exports.delete = catchAsync(async (req, res, next) => {
  const requestedUserId = req.params.id;
  const currentUserId = getUserId(req.user);

  if (requestedUserId !== currentUserId && !isAdminUser(req.user)) {
    return next(new AppError("You can only delete your own account", 403));
  }

  // 1) Find User
  const user = await prisma.user.findUnique({ where: { id: requestedUserId } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  // 2) Delete User
  try {
    await deleteUserAccount(requestedUserId);
  } catch (error) {
    if (error?.code === "P2003") {
      return next(
        new AppError(
          "We couldn't delete this account because linked records still exist. Please contact support.",
          409
        )
      );
    }

    throw error;
  }

  // 3) If everything ok, send token to client
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.google = catchAsync(async (req, res, next) => {
  const { name, email, photo, role } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    let currentUser = user;
    if (user.isEmailVerified !== true || user.isPhoneVerified !== true) {
      currentUser = await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, isPhoneVerified: true },
      });
    }
    createSendToken(currentUser, 200, res);
  } else {
    const newUser = await prisma.user.create({
      data: {
        username: name,
        email: normalizedEmail,
        password: await bcrypt.hash(Math.random().toString(), 12),
        avatar: photo,
        role: ["tenant", "landlord"].includes(role) ? role : "tenant",
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      await walletService.grantTokens(newUser.id, 100, "welcome_bonus", "Welcome bonus — 100 TR", tx);
      await tx.user.update({ where: { id: newUser.id }, data: { walletInitialized: true } });
    });
    const refreshedNewUser = await prisma.user.findUnique({ where: { id: newUser.id } });
    createSendToken(refreshedNewUser, 201, res);
  }
});

exports.verifyPhone = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;

  if (!otp) {
    return next(new AppError("OTP is required", 400));
  }

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new AppError("OTP must be a 6-digit number", 400));
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      email,
      role: "landlord",
      isEmailVerified: true,
      isPhoneVerified: false,
      phoneOtp: hashedOtp,
      phoneOtpExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    },
  });

  phoneOtpResendAttempts.delete(user.id);

  createSendToken(updatedUser, 200, res);
});

exports.resendPhoneOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.role !== "landlord" || user.isPhoneVerified === true) {
    return next(new AppError("Phone OTP is only available for unverified landlords", 400));
  }

  if (!user.phoneNumber) {
    return next(new AppError("No phone number on record for this account", 400));
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const existingOtpIssuedAt = user.phoneOtpExpires
    ? user.phoneOtpExpires.getTime() - 10 * 60 * 1000
    : null;

  let resendWindow = phoneOtpResendAttempts.get(user.id);

  if (
    !resendWindow &&
    existingOtpIssuedAt &&
    existingOtpIssuedAt > oneHourAgo
  ) {
    resendWindow = {
      count: 0,
      windowStart: existingOtpIssuedAt,
    };
  }

  if (!resendWindow || resendWindow.windowStart <= oneHourAgo) {
    resendWindow = {
      count: 0,
      windowStart: now,
    };
  }

  if (resendWindow.count >= 3) {
    return next(new AppError("Too many OTP resend requests. Please try again later.", 429));
  }

  const phoneVerification = generatePhoneOtp();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneOtp: phoneVerification.hashedOtp,
      phoneOtpExpires: new Date(phoneVerification.expiresAt),
    },
  });

  await sendSms({
    to: user.phoneNumber,
    message: `Your Town Ruins verification code is ${phoneVerification.rawOtp}. It expires in 10 minutes.`,
  });

  phoneOtpResendAttempts.set(user.id, {
    count: resendWindow.count + 1,
    windowStart: resendWindow.windowStart,
  });

  res.status(200).json({
    status: "success",
    message: "OTP resent.",
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required", 400));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If that email exists, a reset link has been sent.",
    });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Town Ruins password",
    text: `Reset your password by visiting: ${resetUrl}\nThis link expires in 1 hour.`,
    html: buildBrandedEmail({
      title: "Reset your password",
      preheader: "Reset your Town Ruins password",
      body: `<p>Hello ${user.username},</p><p>Click below to reset your Town Ruins password. This link expires in <strong>1 hour</strong>.</p><p>If you did not request this, you can safely ignore this email.</p>`,
      ctaText: "Reset Password",
      ctaUrl: resetUrl,
    }),
  });

  res.status(200).json({
    status: "success",
    message: "If that email exists, a reset link has been sent.",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return next(new AppError("Token and new password are required", 400));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) return next(new AppError("Reset link is invalid or has expired", 400));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  res
    .status(200)
    .json({ status: "success", message: "Password updated successfully." });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
  const email = req.body?.email || req.user?.email;
  if (!email) return next(new AppError("Email is required", 400));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isEmailVerified) {
    return res.status(200).json({
      status: "success",
      message: "If applicable, a new verification email has been sent.",
    });
  }

  const verification = createEmailVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verification.hashedToken,
      emailVerificationExpires: new Date(verification.expiresAt),
    },
  });

  await sendVerificationEmail(user, verification.rawToken);
  res
    .status(200)
    .json({ status: "success", message: "Verification email resent." });
});

exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { email, username } = req.query;
  const result = {};

  if (email && typeof email === "string") {
    const normalized = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    result.emailAvailable = !existing;
  }

  if (username && typeof username === "string") {
    const normalized = username.trim();
    const existing = await prisma.user.findUnique({ where: { username: normalized }, select: { id: true } });
    result.usernameAvailable = !existing;
  }

  res.status(200).json({ status: "success", data: result });
});

exports.submitVerification = catchAsync(async (req, res, next) => {
  if (req.user?.role !== "landlord") {
    return next(new AppError("Access denied", 403));
  }

  const { idImageUrl, selfieUrl } = req.body;
  if (!idImageUrl || !selfieUrl) {
    return next(new AppError("ID image and selfie are required", 400));
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      verificationStatus: "PENDING_REVIEW",
      verificationIdUrl: idImageUrl,
      verificationSelfieUrl: selfieUrl,
      verificationSubmittedAt: new Date(),
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: "New landlord verification submission",
      text: `User ${req.user.username} (${req.user.email}) has submitted identity verification documents for review.`,
      html: buildBrandedEmail({
        title: "New landlord verification submission",
        body: `<p>User <strong>${req.user.username}</strong> (${req.user.email}) has submitted identity verification documents. Please review in the admin dashboard.</p>`,
      }),
    });
  }

  res.status(200).json({
    status: "success",
    message: "Verification submitted. We will review within 24-48 hours.",
  });
});

exports.optionalAuth = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token, just continue without setting req.user
  if (!token) {
    return next();
  }

  try {
    // 2) Verification token
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const freshUser = await prisma.user.findUnique({ where: { id: decode.id } });
    if (freshUser) {
      // GRANT ACCESS WITH USER CONTEXT
      req.user = freshUser;
    }
    // If user doesn't exist, silently continue without setting req.user
  } catch (err) {
    // Swallow auth errors and continue without req.user
  }
  next();
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const freshUser = await prisma.user.findUnique({ where: { id: decode.id } });
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = freshUser;
  next();
});
exports.requireRole = (role) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(role) ? [...role] : [role];

    // Treat 'admin' as inclusive of 'super_admin'
    if (allowedRoles.includes("admin") && !allowedRoles.includes("super_admin")) {
      allowedRoles.push("super_admin");
    }

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("Access denied", 403));
    }
    next();
  };
};

exports.requirePremium = (req, res, next) => {
  if (!req.user || !isPremiumTenant(req.user)) {
    return next(
      new AppError("Premium feature. Please upgrade your account.", 402)
    );
  }
  next();
};
