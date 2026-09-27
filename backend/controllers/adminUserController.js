const bcrypt = require("bcryptjs");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const AppError = require("../utils/appError");
const auditLog = require("../utils/auditLog");

const MANAGEABLE_ROLES = ["tenant", "landlord", "provider"];
const USER_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
];
const ACTIVITY_SECTIONS = ["listings", "engagements", "bookings"];
const PAGE_SIZE_MAX = 50;

const baseUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  phoneNumber: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  verificationStatus: true,
  accountSuspendedAt: true,
  onboardingStatus: true,
  providerProfile: true,
  createdAt: true,
  updatedAt: true,
};

const safeProviderProfile = (profile) => {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return null;
  }
  return {
    businessName: profile.businessName || null,
    businessType: profile.businessType || null,
    verificationStatus: profile.verificationStatus || null,
    suspendedAt: profile.suspendedAt || null,
  };
};

const mapUser = (user) => {
  if (!user) return user;
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    verificationStatus: user.verificationStatus,
    accountSuspendedAt: user.accountSuspendedAt,
    onboardingStatus: user.onboardingStatus,
    providerProfile: safeProviderProfile(user.providerProfile),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user._count ? { _count: user._count } : {}),
  };
};

const mapId = (record) => (record ? { ...record, _id: record.id } : record);
const parsePage = (value) => Math.max(1, parseInt(value, 10) || 1);
const parseLimit = (value) =>
  Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(value, 10) || 20));

const recordAdminAction = (req, action, targetId, metadata) => {
  void auditLog
    .createEntry({
      adminId: req.user?.id || null,
      action,
      targetType: "User",
      targetId,
      metadata: metadata || null,
      ipAddress: req.ip,
    })
    .catch((error) => {
      console.error("Unable to record admin user action", error);
    });
};

const validatePassword = (password, next) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[@$!%*?&]/.test(password)
  ) {
    next(
      new AppError(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character (@$!%*?&)",
        400
      )
    );
    return false;
  }
  return true;
};

exports.getAdminUsers = catchAsync(async (req, res, next) => {
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search).trim() : "";
  const role = req.query.role ? String(req.query.role).trim() : "";
  const verificationStatus = req.query.verificationStatus
    ? String(req.query.verificationStatus).trim()
    : "";
  const accountStatus = req.query.accountStatus
    ? String(req.query.accountStatus).trim().toLowerCase()
    : "";
  const sortBy = ["createdAt", "username", "email", "role"].includes(
    String(req.query.sortBy)
  )
    ? String(req.query.sortBy)
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  if (accountStatus && !["active", "suspended"].includes(accountStatus)) {
    return next(new AppError("Invalid account status filter", 400));
  }

  const where = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (accountStatus === "suspended") where.accountSuspendedAt = { not: null };
  if (accountStatus === "active") where.accountSuspendedAt = null;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...baseUserSelect,
        _count: {
          select: {
            listings: true,
            accommodations: true,
            rooms: true,
          },
        },
      },
    }),
  ]);

  recordAdminAction(req, "admin.viewed_users", null, { query: req.query });
  const data = users.map(mapUser);
  res.status(200).json({
    status: "success",
    total,
    results: data.length,
    page,
    limit,
    data,
  });
});

exports.getAdminUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new AppError("Invalid user id", 400));

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...baseUserSelect,
      _count: {
        select: {
          listings: true,
          accommodations: true,
          rooms: true,
          guestBookings: true,
          providerBookings: true,
          tenantEngagements: true,
          landlordEngagements: true,
        },
      },
    },
  });
  if (!user) return next(new AppError("User not found", 404));

  recordAdminAction(req, "admin.viewed_user", id);
  res.status(200).json({ status: "success", data: mapUser(user) });
});

exports.getAdminUserActivity = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const section = String(req.query.section || "");
  if (!ACTIVITY_SECTIONS.includes(section)) {
    return next(new AppError("Invalid user activity section", 400));
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return next(new AppError("User not found", 404));

  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const skip = (page - 1) * limit;

  if (section === "listings") {
    const [
      listingCount,
      accommodationCount,
      roomCount,
      listings,
      accommodations,
      rooms,
    ] = await Promise.all([
      prisma.listing.count({ where: { userId: id } }),
      prisma.accommodation.count({ where: { ownerId: id } }),
      prisma.room.count({ where: { providerId: id } }),
      prisma.listing.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: skip + limit,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          monthlyRent: true,
          studentAccommodation: true,
          city: true,
          province: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      prisma.accommodation.findMany({
        where: { ownerId: id },
        orderBy: { createdAt: "desc" },
        take: skip + limit,
        select: {
          id: true,
          name: true,
          type: true,
          moderationStatus: true,
          isPublished: true,
          province: true,
          city: true,
          createdAt: true,
        },
      }),
      prisma.room.findMany({
        where: { providerId: id },
        orderBy: { createdAt: "desc" },
        take: skip + limit,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          accommodation: {
            select: { id: true, name: true, province: true, city: true },
          },
        },
      }),
    ]);

    const rows = [
      ...listings.map((item) => ({
        ...mapId(item),
        kind: "listing",
        href: `/listing/${item.id}`,
        location: [item.province, item.city].filter(Boolean).join(" / "),
      })),
      ...accommodations.map((item) => ({
        ...mapId(item),
        kind: "accommodation",
        href: `/stays?searchTerm=${encodeURIComponent(item.name)}`,
        location: [item.province, item.city].filter(Boolean).join(" / "),
      })),
      ...rooms.map((item) => ({
        ...mapId(item),
        kind: "room",
        href: `/stays/rooms/${item.id}`,
        location: [
          item.accommodation?.province,
          item.accommodation?.city,
        ].filter(Boolean).join(" / "),
      })),
    ].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    const total = listingCount + accommodationCount + roomCount;
    const data = rows.slice(skip, skip + limit);
    return res.status(200).json({
      status: "success",
      total,
      results: data.length,
      page,
      limit,
      data,
    });
  }

  if (section === "engagements") {
    const where = { OR: [{ tenantId: id }, { landlordId: id }] };
    const [total, engagements] = await Promise.all([
      prisma.engagement.count({ where }),
      prisma.engagement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            select: {
              id: true,
              name: true,
              userId: true,
              city: true,
              province: true,
            },
          },
          tenant: { select: { id: true, username: true } },
          landlord: { select: { id: true, username: true } },
        },
      }),
    ]);
    const data = engagements.map((engagement) => ({
      ...mapId(engagement),
      relationToUser: engagement.tenantId === id ? "Made by user" : "Received by user",
      listing: mapId(engagement.listing),
      tenant: mapId(engagement.tenant),
      landlord: mapId(engagement.landlord),
    }));
    return res.status(200).json({
      status: "success",
      total,
      results: data.length,
      page,
      limit,
      data,
    });
  }

  const where = {
    OR: [
      { guestId: id },
      { providerId: id },
      { room: { providerId: id } },
    ],
  };
  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        roomId: true,
        guestId: true,
        providerId: true,
        checkIn: true,
        checkOut: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        settlementStatus: true,
        settledAt: true,
        room: {
          select: {
            id: true,
            name: true,
            accommodation: {
              select: { id: true, name: true, province: true, city: true },
            },
          },
        },
        guest: { select: { id: true, username: true } },
        providerUser: { select: { id: true, username: true } },
      },
    }),
  ]);
  const data = bookings.map((booking) => ({
    ...mapId(booking),
    relationToUser: booking.guestId === id ? "Guest" : "Provider",
    room: mapId(booking.room),
    guest: mapId(booking.guest),
    provider: mapId(booking.providerUser),
  }));
  res.status(200).json({ status: "success", total, results: data.length, page, limit, data });
});

exports.createAdminUser = catchAsync(async (req, res, next) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phoneNumber =
    typeof req.body.phoneNumber === "string" ? req.body.phoneNumber.trim() : "";
  const role = typeof req.body.role === "string" ? req.body.role.trim().toLowerCase() : "";

  if (!username || username.length > 100) {
    return next(new AppError("Name is required and must be 100 characters or fewer", 400));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return next(new AppError("A valid email address is required", 400));
  }
  if (!MANAGEABLE_ROLES.includes(role)) {
    return next(new AppError(`Role must be one of: ${MANAGEABLE_ROLES.join(", ")}`, 400));
  }
  if (phoneNumber.length > 50) {
    return next(new AppError("Phone number must be 50 characters or fewer", 400));
  }
  if (!validatePassword(req.body.password, next)) return;

  const user = await prisma.user.create({
    data: {
      username,
      email,
      phoneNumber: phoneNumber || null,
      role,
      password: await bcrypt.hash(req.body.password, 12),
      isEmailVerified: true,
      isPhoneVerified: false,
      verificationStatus: "UNVERIFIED",
    },
    select: baseUserSelect,
  });

  recordAdminAction(req, "admin.created_user", user.id, { role });
  res.status(201).json({ status: "success", data: mapUser(user) });
});

exports.updateAdminUser = catchAsync(async (req, res, next) => {
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, role: true },
  });
  if (!existing) return next(new AppError("User not found", 404));

  const data = {};
  const {
    username,
    email,
    phoneNumber,
    role,
    isEmailVerified,
    isPhoneVerified,
    verificationStatus,
  } = req.body;

  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim() || username.trim().length > 100) {
      return next(new AppError("Name is required and must be 100 characters or fewer", 400));
    }
    data.username = username.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return next(new AppError("A valid email address is required", 400));
    }
    data.email = email.trim().toLowerCase();
  }
  if (phoneNumber !== undefined) {
    if (typeof phoneNumber !== "string" || phoneNumber.trim().length > 50) {
      return next(new AppError("Phone number must be 50 characters or fewer", 400));
    }
    data.phoneNumber = phoneNumber.trim() || null;
  }
  if (role !== undefined) {
    if (
      typeof role !== "string" ||
      (!MANAGEABLE_ROLES.includes(role) && role !== existing.role) ||
      ((existing.role === "admin" || existing.role === "super_admin") &&
        role !== existing.role)
    ) {
      return next(new AppError("This role cannot be assigned through user management", 400));
    }
    data.role = role;
  }
  if (isEmailVerified !== undefined) {
    if (typeof isEmailVerified !== "boolean") {
      return next(new AppError("Email verification must be true or false", 400));
    }
    data.isEmailVerified = isEmailVerified;
  }
  if (isPhoneVerified !== undefined) {
    if (typeof isPhoneVerified !== "boolean") {
      return next(new AppError("Phone verification must be true or false", 400));
    }
    data.isPhoneVerified = isPhoneVerified;
  }
  if (verificationStatus !== undefined) {
    if (!USER_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return next(new AppError("Invalid verification status", 400));
    }
    data.verificationStatus = verificationStatus;
  }
  if (Object.keys(data).length === 0) {
    return next(new AppError("At least one editable field is required", 400));
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data,
    select: baseUserSelect,
  });
  recordAdminAction(req, "admin.updated_user", user.id, { fields: Object.keys(data) });
  res.status(200).json({ status: "success", data: mapUser(user) });
});

exports.resetAdminUserPassword = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return next(new AppError("User not found", 404));
  if (!validatePassword(req.body.password, next)) return;

  await prisma.user.update({
    where: { id },
    data: {
      password: await bcrypt.hash(req.body.password, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
  recordAdminAction(req, "admin.reset_user_password", id);
  res.status(200).json({ status: "success", message: "Password reset successfully" });
});

exports.suspendAdminUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    return next(new AppError("You cannot suspend your own account", 400));
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, accountSuspendedAt: true },
  });
  if (!existing) return next(new AppError("User not found", 404));
  if (existing.accountSuspendedAt) {
    return next(new AppError("User account is already suspended", 409));
  }

  const user = await prisma.user.update({
    where: { id },
    data: { accountSuspendedAt: new Date() },
    select: baseUserSelect,
  });
  recordAdminAction(req, "admin.suspended_user", id);
  res.status(200).json({ status: "success", data: mapUser(user) });
});

exports.reactivateAdminUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, accountSuspendedAt: true },
  });
  if (!existing) return next(new AppError("User not found", 404));
  if (!existing.accountSuspendedAt) {
    return next(new AppError("User account is already active", 409));
  }

  const user = await prisma.user.update({
    where: { id },
    data: { accountSuspendedAt: null },
    select: baseUserSelect,
  });
  recordAdminAction(req, "admin.reactivated_user", id);
  res.status(200).json({ status: "success", data: mapUser(user) });
});
