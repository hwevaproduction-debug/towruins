const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendEmail } = require("../utils/email");
const notificationService = require("../utils/notificationService");

const SELF_RESTRICTED_FIELDS = new Set(["verificationStatus", "commissionRate"]);
const ACCOMMODATION_TYPES = new Set([
  "HOTEL",
  "LODGE",
  "BNB",
  "APARTMENT",
  "GUEST_HOUSE",
  "HOSTEL",
]);

const PROVIDER_PROFILE_FIELDS = [
  "businessName",
  "businessType",
  "registrationNumber",
  "contactPhone",
  "address",
  "checkInTime",
  "checkOutTime",
  "imageUrls",
  "description",
  "location",
  "amenities",
  "cancellationPolicy",
  "cancellationPolicyCustomText",
];

const ACCOUNT_FIELDS = [
  "username",
  "email",
  "password",
  "avatar",
  "phoneNumber",
  "nationalId",
];

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const normalizeEnumInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const normalizeAccommodationType = (value, fallback = null) => {
  const normalized = normalizeEnumInput(value);

  if (!normalized) {
    return fallback;
  }

  if (!ACCOMMODATION_TYPES.has(normalized)) {
    throw new AppError("Invalid businessType", 400);
  }

  return normalized;
};

const generateSlug = (businessName, userId) =>
  `${String(businessName || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${String(userId).slice(-6)}`;

const createEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashVerificationToken(rawToken),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
};

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
    html: `
      <p>Welcome to Town Ruins.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const assertNoRestrictedSelfUpdates = (profile = {}) => {
  const restrictedFields = Object.keys(profile).filter((field) =>
    SELF_RESTRICTED_FIELDS.has(field)
  );

  if (restrictedFields.length) {
    throw new AppError(
      `Providers cannot update ${restrictedFields.join(", ")} themselves`,
      400
    );
  }
};

const pickAllowedProfileUpdates = (profile = {}) => {
  const updates = {};

  for (const field of PROVIDER_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(profile, field)) {
      updates[field] = profile[field];
    }
  }

  return updates;
};

const pickAccountUpdates = (body = {}) => {
  const updates = {};

  for (const field of ACCOUNT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  return updates;
};

const assertRequiredAccountFields = (accountUpdates = {}) => {
  const missingFields = ["username", "email", "password"].filter((field) => {
    const value = accountUpdates[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length) {
    throw new AppError(
      `Missing required provider account fields: ${missingFields.join(", ")}`,
      400
    );
  }
};

const buildAccommodationCreateData = (user, accountUpdates, profileUpdates) => ({
  ownerId: user.id,
  type: normalizeAccommodationType(profileUpdates.businessType, "HOTEL"),
  name: profileUpdates.businessName || accountUpdates.username,
  slug: generateSlug(profileUpdates.businessName || accountUpdates.username, user.id),
  description: profileUpdates.description || "",
  contactPhone: profileUpdates.contactPhone || accountUpdates.phoneNumber || "",
  province: profileUpdates.location?.province || "",
  city: profileUpdates.location?.city || "",
  addressLine: profileUpdates.address || profileUpdates.location?.addressLine || "",
  registrationNumber: profileUpdates.registrationNumber || null,
  verificationStatus: "PENDING",
  commissionRate: 10,
  isPublished: false,
});

const buildAccommodationUpdateData = (profileUpdates = {}) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "businessName")) {
    updates.name = profileUpdates.businessName;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "businessType")) {
    const type = normalizeAccommodationType(profileUpdates.businessType);

    if (type) {
      updates.type = type;
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "contactPhone")) {
    updates.contactPhone = profileUpdates.contactPhone;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "location")) {
    if (Object.prototype.hasOwnProperty.call(profileUpdates.location || {}, "province")) {
      updates.province = profileUpdates.location?.province || "";
    }

    if (Object.prototype.hasOwnProperty.call(profileUpdates.location || {}, "city")) {
      updates.city = profileUpdates.location?.city || "";
    }

    if (Object.prototype.hasOwnProperty.call(profileUpdates.location || {}, "addressLine")) {
      updates.addressLine = profileUpdates.location?.addressLine || "";
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "address")) {
    updates.addressLine = profileUpdates.address;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdates, "description")) {
    updates.description = profileUpdates.description;
  }

  return updates;
};

const buildProviderResponse = (user) => ({
  _id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  phoneNumber: user.phoneNumber || null,
  nationalId: user.nationalId || null,
  role: user.role,
  providerProfile: user.providerProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildNotificationProvider = (user) => ({
  id: user.id,
  _id: user.id,
  username: user.username,
  email: user.email,
  phoneNumber: user.phoneNumber || null,
  providerProfile: user.providerProfile || null,
});

const decimalToNumber = (value) => {
  if (value == null) {
    return 0;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseOptionalDate = (value, label) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const differenceInDays = (startDate, endDate) =>
  Math.max(
    0,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  );

const getProviderOrFail = async (providerId) => {
  const provider = await prisma.user.findFirst({
    where: { id: providerId, role: "provider" },
  });

  if (!provider) {
    throw new AppError("Provider not found", 404);
  }

  return provider;
};

exports.registerProvider = catchAsync(async (req, res, next) => {
  const rawProfile = req.body.providerProfile || req.body;
  assertNoRestrictedSelfUpdates(rawProfile);

  const verification = createEmailVerificationToken();
  const accountUpdates = pickAccountUpdates(req.body);
  const profileUpdates = pickAllowedProfileUpdates(rawProfile);
  assertRequiredAccountFields(accountUpdates);
  const hashedPassword = await bcrypt.hash(accountUpdates.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        ...accountUpdates,
        password: hashedPassword,
        role: "provider",
        isEmailVerified: false,
        emailVerificationToken: verification.hashedToken,
        emailVerificationExpires: new Date(verification.expiresAt),
        providerProfile: {
          ...profileUpdates,
          verificationStatus: "pending",
          commissionRate: 10,
        },
      },
    });

    await tx.accommodation.create({
      data: buildAccommodationCreateData(createdUser, accountUpdates, profileUpdates),
    });

    return createdUser;
  });

  if (process.env.SKIP_EMAIL_VERIFICATION === "true") {
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });
    verifiedUser.password = undefined;

    return res.status(201).json({
      status: "pending_verification",
      data: {
        user: buildProviderResponse(verifiedUser),
      },
    });
  }

  try {
    await sendVerificationEmail(user, verification.rawToken);
  } catch (error) {
    await prisma.accommodation.deleteMany({ where: { ownerId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    return next(
      new AppError(
        "We couldn't send the verification email. Please try signing up again.",
        503
      )
    );
  }

  user.password = undefined;

  res.status(201).json({
    status: "pending_verification",
    data: {
      user: buildProviderResponse(user),
    },
  });
});

exports.getMyProfile = catchAsync(async (req, res) => {
  const provider = await getProviderOrFail(req.user.id);
  provider.password = undefined;

  res.status(200).json({
    status: "success",
    data: {
      provider: buildProviderResponse(provider),
    },
  });
});

exports.updateMyProfile = catchAsync(async (req, res) => {
  const provider = await getProviderOrFail(req.user.id);
  const rawProfile = req.body.providerProfile || req.body;
  assertNoRestrictedSelfUpdates(rawProfile);

  const accountUpdates = pickAccountUpdates(req.body);
  const profileUpdates = pickAllowedProfileUpdates(rawProfile);
  const mergedProfile = {
    ...(provider.providerProfile || {}),
    ...profileUpdates,
  };
  if (accountUpdates.password) {
    accountUpdates.password = await bcrypt.hash(accountUpdates.password, 12);
  }

  const accommodationUpdates = buildAccommodationUpdateData(profileUpdates);
  const [updatedProvider] = await prisma.$transaction([
    prisma.user.update({
      where: { id: provider.id },
      data: {
        ...accountUpdates,
        providerProfile: mergedProfile,
      },
    }),
    ...(Object.keys(accommodationUpdates).length
      ? [
          prisma.accommodation.updateMany({
            where: { ownerId: provider.id, deletedAt: null },
            data: accommodationUpdates,
          }),
        ]
      : []),
  ]);
  updatedProvider.password = undefined;

  res.status(200).json({
    status: "success",
    data: {
      provider: buildProviderResponse(updatedProvider),
    },
  });
});

exports.getMyAnalytics = catchAsync(async (req, res, next) => {
  const from = parseOptionalDate(req.query.from, "from");
  const to = parseOptionalDate(req.query.to, "to");

  if (from && to && from >= to) {
    return next(new AppError("from must be before to", 400));
  }

  const ownedRooms = await prisma.room.findMany({
    where: {
      deletedAt: null,
      accommodation: {
        ownerId: req.user.id,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  let rooms = ownedRooms;
  if (req.query.roomId) {
    const room = ownedRooms.find((item) => item.id === req.query.roomId);

    if (!room) {
      return next(new AppError("You do not own this room", 403));
    }

    rooms = [room];
  }

  const roomIds = rooms.map((room) => room.id);
  const bookingWhere = {
    providerId: req.user.id,
    status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
    ...(roomIds.length ? { roomId: { in: roomIds } } : { roomId: { in: [] } }),
    ...(from ? { checkIn: { gte: from } } : {}),
    ...(to ? { checkOut: { lte: to } } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: {
      roomId: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      totalPrice: true,
      netPayout: true,
    },
    orderBy: { checkIn: "asc" },
  });

  const bookingCount = bookings.length;
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + decimalToNumber(booking.totalPrice),
    0
  );
  const netPayout = bookings.reduce(
    (sum, booking) => sum + decimalToNumber(booking.netPayout),
    0
  );
  const totalBookedNights = bookings.reduce(
    (sum, booking) =>
      sum +
      (Number.isFinite(Number(booking.nights)) && Number(booking.nights) > 0
        ? Number(booking.nights)
        : differenceInDays(booking.checkIn, booking.checkOut)),
    0
  );
  const avgNights = bookingCount ? totalBookedNights / bookingCount : 0;

  const rangeStart =
    from ||
    bookings.reduce(
      (earliest, booking) =>
        !earliest || booking.checkIn < earliest ? booking.checkIn : earliest,
      null
    ) ||
    new Date();
  const rangeEnd =
    to ||
    bookings.reduce(
      (latest, booking) =>
        !latest || booking.checkOut > latest ? booking.checkOut : latest,
      null
    ) ||
    new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
  const rangeDays = Math.max(1, differenceInDays(rangeStart, rangeEnd));
  const roomCount = Math.max(rooms.length, 1);

  const revenueByMonthMap = new Map();
  const bookedNightsByRoom = new Map(roomIds.map((roomId) => [roomId, 0]));

  bookings.forEach((booking) => {
    const month = booking.checkIn.toISOString().slice(0, 7);
    const nights =
      Number.isFinite(Number(booking.nights)) && Number(booking.nights) > 0
        ? Number(booking.nights)
        : differenceInDays(booking.checkIn, booking.checkOut);

    revenueByMonthMap.set(
      month,
      (revenueByMonthMap.get(month) || 0) + decimalToNumber(booking.totalPrice)
    );
    bookedNightsByRoom.set(
      booking.roomId,
      (bookedNightsByRoom.get(booking.roomId) || 0) + nights
    );
  });

  const revenueByMonth = Array.from(revenueByMonthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, revenue]) => ({ month, revenue }));
  const occupancyByRoom = rooms.map((room) => ({
    roomId: room.id,
    roomName: room.name,
    bookedNights: bookedNightsByRoom.get(room.id) || 0,
    occupancyRate: rangeDays
      ? ((bookedNightsByRoom.get(room.id) || 0) / rangeDays) * 100
      : 0,
  }));

  res.status(200).json({
    status: "success",
    data: {
      bookingCount,
      totalRevenue,
      netPayout,
      avgNights,
      occupancyRate: (totalBookedNights / (rangeDays * roomCount)) * 100,
      revenueByMonth,
      occupancyByRoom,
    },
  });
});

exports.listProviders = catchAsync(async (req, res) => {
  let providers = await prisma.user.findMany({
    where: { role: "provider" },
    orderBy: { createdAt: "desc" },
  });

  if (req.query.verificationStatus) {
    const requestedStatus = normalizeEnumInput(req.query.verificationStatus);
    providers = providers.filter(
      (provider) =>
        normalizeEnumInput(provider.providerProfile?.verificationStatus) === requestedStatus
    );
  }

  if (req.query.search) {
    const searchRegex = new RegExp(String(req.query.search), "i");
    providers = providers.filter((provider) =>
      [
        provider.username,
        provider.email,
        provider.phoneNumber,
        provider.providerProfile?.businessName,
        provider.providerProfile?.location?.city,
        provider.providerProfile?.location?.province,
      ].some((value) => searchRegex.test(String(value || "")))
    );
  }

  const roomCounts = await prisma.room.groupBy({
    by: ["providerId"],
    _count: { id: true },
  });
  const roomCountMap = new Map(
    roomCounts.map((entry) => [entry.providerId, entry._count.id])
  );
  const providerIds = providers.map((provider) => provider.id);
  const accommodations = providerIds.length
    ? await prisma.accommodation.findMany({
        where: { ownerId: { in: providerIds }, deletedAt: null },
        select: {
          ownerId: true,
          verificationStatus: true,
          type: true,
          name: true,
          province: true,
          city: true,
        },
      })
    : [];
  const accommodationMap = new Map(
    accommodations.map((accommodation) => [accommodation.ownerId, accommodation])
  );

  res.status(200).json({
    status: "success",
    total: providers.length,
    data: providers.map((provider) => ({
      ...buildProviderResponse(provider),
      accommodation: accommodationMap.get(provider.id) || null,
      roomCount: roomCountMap.get(provider.id) || 0,
    })),
  });
});

exports.verifyProvider = catchAsync(async (req, res, next) => {
  const provider = await getProviderOrFail(req.params.id);
  const verificationStatus = String(
    req.body.verificationStatus || req.body.status || ""
  )
    .trim()
    .toLowerCase();

  if (!["approved", "rejected"].includes(verificationStatus)) {
    return next(new AppError("Invalid verification status", 400));
  }

  const [updatedProvider] = await prisma.$transaction([
    prisma.user.update({
      where: { id: provider.id },
      data: {
        providerProfile: {
          ...(provider.providerProfile || {}),
          verificationStatus,
        },
      },
    }),
    prisma.accommodation.updateMany({
      where: { ownerId: provider.id, deletedAt: null },
      data: { verificationStatus: verificationStatus.toUpperCase() },
    }),
  ]);

  void notificationService.enqueue(`provider.${verificationStatus}`, {
    provider: buildNotificationProvider(updatedProvider),
  });

  res.status(200).json({
    status: "success",
    data: {
      provider: buildProviderResponse(updatedProvider),
    },
  });
});

exports.updateProviderCommission = catchAsync(async (req, res, next) => {
  const provider = await getProviderOrFail(req.params.id);

  const commissionRate = Number(req.body.commissionRate);
  if (Number.isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    return next(new AppError("commissionRate must be between 0 and 100", 400));
  }

  const [updatedProvider] = await prisma.$transaction([
    prisma.user.update({
      where: { id: provider.id },
      data: {
        providerProfile: {
          ...(provider.providerProfile || {}),
          commissionRate,
        },
      },
    }),
    prisma.accommodation.updateMany({
      where: { ownerId: provider.id, deletedAt: null },
      data: { commissionRate },
    }),
  ]);

  res.status(200).json({
    status: "success",
    data: buildProviderResponse(updatedProvider),
  });
});

exports.getAllProviders = exports.listProviders;
exports.updateCommission = exports.updateProviderCommission;
exports.getMyProviderProfile = exports.getMyProfile;
exports.updateMyProviderProfile = exports.updateMyProfile;
