const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const AppError = require("../utils/appError");
const emailUtils = require("../utils/email");
const notificationService = require("../utils/notificationService");
const auditLog = require("../utils/auditLog");

const MAX_BULK_REVIVE_IDS = 100;
const LISTING_STATUSES = ["active", "early_access", "pending_payment", "inactive", "expired"];
const SETTLEMENT_INELIGIBLE_STATUSES = ["cancelled", "canceled", "rejected", "expired"];
const SEEDED_LANDLORD_EMAILS = Array.from({ length: 100 }, (_, index) =>
  index === 0 ? "landlord@demo.com" : `landlord${index + 1}@demo.com`
);

function parseDateRange(startValue, endValue, startLabel, endLabel, next) {
  if (!startValue && !endValue) {
    return null;
  }

  const startDate = startValue ? new Date(startValue) : null;
  const endDate = endValue ? new Date(endValue) : null;

  if (startValue && Number.isNaN(startDate.getTime())) {
    next(new AppError(`Invalid ${startLabel} date format`, 400));
    return null;
  }

  if (endValue && Number.isNaN(endDate.getTime())) {
    next(new AppError(`Invalid ${endLabel} date format`, 400));
    return null;
  }

  if (startDate && endDate && startDate > endDate) {
    next(new AppError(`${startLabel} cannot be after ${endLabel}`, 400));
    return null;
  }

  const range = {};
  if (startDate) range.gte = startDate;
  if (endDate) range.lte = endDate;

  return range;
}

function getProviderProfile(userDoc) {
  return userDoc?.providerProfile && typeof userDoc.providerProfile === "object"
    ? userDoc.providerProfile
    : {};
}

function buildProviderResponse(userDoc, roomCount) {
  const providerProfile = getProviderProfile(userDoc);

  return {
    _id: userDoc.id,
    username: userDoc.username || "Unknown provider",
    email: userDoc.email || null,
    phoneNumber: userDoc.phoneNumber || null,
    role: userDoc.role || null,
    roomCount,
    createdAt: userDoc.createdAt || null,
    providerProfile: {
      verificationStatus: providerProfile.verificationStatus || "pending",
      commissionRate:
        typeof providerProfile.commissionRate === "number"
          ? providerProfile.commissionRate
          : 0,
      verifiedAt: providerProfile.verifiedAt || null,
      verificationNotes: providerProfile.verificationNotes || null,
      suspendedAt: providerProfile.suspendedAt || null,
      suspensionReason: providerProfile.suspensionReason || null,
    },
  };
}

function buildNotificationProvider(userDoc) {
  if (!userDoc) {
    return null;
  }

  return {
    id: userDoc.id,
    _id: userDoc.id,
    username: userDoc.username,
    email: userDoc.email,
    phoneNumber: userDoc.phoneNumber || null,
    providerProfile: userDoc.providerProfile || null,
  };
}

function getUserId(user) {
  return user?.id || user?._id?.toString() || null;
}

function buildPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function normalizeEnumValue(value) {
  if (value == null || value === "") {
    return "";
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function requireText(value, label, next) {
  const text = value == null ? "" : String(value).trim();

  if (!text) {
    next(new AppError(`${label} is required`, 400));
    return null;
  }

  return text;
}

function auditAdminAction(req, action, targetType, targetId, metadata = null) {
  void auditLog.createEntry({
    adminId: getUserId(req.user),
    action,
    targetType,
    targetId,
    metadata,
    ipAddress: req.ip,
  });
}

function mapId(record) {
  if (!record) {
    return record;
  }

  return {
    ...record,
    _id: record.id,
  };
}

function mapAccommodation(accommodation) {
  return {
    ...mapId(accommodation),
    owner: accommodation.owner ? mapId(accommodation.owner) : null,
  };
}

function mapProvider(provider) {
  return buildProviderResponse(provider, 0);
}

function getProfile(provider) {
  return provider?.providerProfile && typeof provider.providerProfile === "object"
    ? provider.providerProfile
    : {};
}

function getBookingProvider(booking) {
  return (
    booking?.providerUser ||
    booking?.room?.provider ||
    (booking?.room?.accommodation?.owner
      ? booking.room.accommodation.owner
      : null)
  );
}

function mapDispute(dispute) {
  return {
    ...mapId(dispute),
    booking: dispute.booking
      ? {
          ...mapId(dispute.booking),
          room: dispute.booking.room ? mapId(dispute.booking.room) : null,
          guest: dispute.booking.guest ? mapId(dispute.booking.guest) : null,
          provider: getBookingProvider(dispute.booking)
            ? mapId(getBookingProvider(dispute.booking))
            : null,
        }
      : null,
    raiser: dispute.raiser ? mapId(dispute.raiser) : null,
    resolver: dispute.resolver ? mapId(dispute.resolver) : null,
  };
}

function mapReport(report, target = undefined) {
  return {
    ...mapId(report),
    reporter: report.reporter ? mapId(report.reporter) : null,
    resolver: report.resolver ? mapId(report.resolver) : null,
    ...(target !== undefined ? { target } : {}),
  };
}

function mapAuditLog(entry) {
  return {
    ...mapId(entry),
    admin: entry.admin ? mapId(entry.admin) : null,
  };
}

function buildSeededListingWhere() {
  return {
    user: {
      email: {
        in: SEEDED_LANDLORD_EMAILS,
      },
    },
  };
}

const disputeInclude = {
  booking: {
    include: {
      guest: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      providerUser: {
        select: {
          id: true,
          username: true,
          email: true,
          phoneNumber: true,
          providerProfile: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          provider: {
            select: {
              id: true,
              username: true,
              email: true,
              phoneNumber: true,
              providerProfile: true,
            },
          },
          accommodation: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  phoneNumber: true,
                  providerProfile: true,
                },
              },
            },
          },
        },
      },
    },
  },
  raiser: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  resolver: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
};

const reportInclude = {
  reporter: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  resolver: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
};

async function getReportTarget(report) {
  if (!report) {
    return null;
  }

  if (report.targetType === "Accommodation") {
    return prisma.accommodation.findUnique({
      where: { id: report.targetId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  if (report.targetType === "Listing") {
    return prisma.listing.findUnique({
      where: { id: report.targetId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  if (report.targetType === "Review") {
    return prisma.review.findUnique({
      where: { id: report.targetId },
      include: {
        guest: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        accommodation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  return null;
}

async function getAdminListings(req, res, next, forcedStatus = "") {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let userIds;
  const landlordRaw = req.query.landlord ? String(req.query.landlord).trim() : "";

  if (landlordRaw) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: landlordRaw, mode: "insensitive" } },
          { email: { contains: landlordRaw, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    userIds = users.map((user) => user.id);

    if (!userIds.length) {
      return res.status(200).json({
        status: "success",
        total: 0,
        results: 0,
        data: [],
      });
    }
  }

  const status = forcedStatus || (req.query.status ? String(req.query.status).trim().toLowerCase() : "");
  if (status && !LISTING_STATUSES.includes(status)) {
    return next(new AppError("Invalid listing status", 400));
  }

  const category = req.query.category
    ? String(req.query.category).trim().toLowerCase()
    : "";
  if (category && !["rent", "student"].includes(category)) {
    return next(new AppError("Invalid listing category", 400));
  }

  const where = {};
  if (status) where.status = status;
  if (category === "student") where.studentAccommodation = true;
  if (category === "rent") where.studentAccommodation = false;
  const {
    province: provinceRaw,
    city: cityRaw,
    expiredFrom,
    expiredTo,
    uploadedFrom,
    uploadedTo,
  } = req.query;

  const province = provinceRaw ? String(provinceRaw).trim() : "";
  if (province) {
    where.province = { contains: province, mode: "insensitive" };
  }

  const city = cityRaw ? String(cityRaw).trim() : "";
  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  const expiresAtRange = parseDateRange(
    expiredFrom,
    expiredTo,
    "expiredFrom",
    "expiredTo",
    next
  );
  if (expiresAtRange === null && (expiredFrom || expiredTo)) {
    return;
  }
  if (expiresAtRange) {
    where.expiresAt = expiresAtRange;
  }

  const createdAtRange = parseDateRange(
    uploadedFrom,
    uploadedTo,
    "uploadedFrom",
    "uploadedTo",
    next
  );
  if (createdAtRange === null && (uploadedFrom || uploadedTo)) {
    return;
  }
  if (createdAtRange) {
    where.createdAt = createdAtRange;
  }

  if (userIds) {
    where.userId = { in: userIds };
  }

  const total = await prisma.listing.count({ where });
  const listings = await prisma.listing.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    status: "success",
    total,
    results: listings.length,
    data: listings.map((listing) => ({
      ...listing,
      _id: listing.id,
      location: {
        province: listing.province,
        city: listing.city,
      },
      user: listing.user,
    })),
  });
}

exports.getAdminListings = catchAsync((req, res, next) =>
  getAdminListings(req, res, next)
);

exports.getInactiveListings = catchAsync((req, res, next) =>
  getAdminListings(req, res, next, "inactive")
);

exports.deleteListing = catchAsync(async (req, res, next) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, email: true, username: true } } },
  });

  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  await prisma.listing.delete({ where: { id: listing.id } });
  auditAdminAction(req, "listing.deleted", "Listing", listing.id, {
    listingName: listing.name,
    ownerId: listing.userId,
    ownerEmail: listing.user?.email || null,
  });

  res.status(200).json({
    status: "success",
    data: { deletedId: listing.id },
  });
});

exports.deleteListingsByOwner = catchAsync(async (req, res, next) => {
  const owner = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { id: true, email: true, username: true },
  });

  if (!owner) {
    return next(new AppError("User not found", 404));
  }

  const deleted = await prisma.listing.deleteMany({ where: { userId: owner.id } });
  auditAdminAction(req, "listings.owner_deleted", "User", owner.id, {
    ownerEmail: owner.email,
    ownerUsername: owner.username,
    deletedCount: deleted.count,
  });

  res.status(200).json({
    status: "success",
    data: { user: mapId(owner), deletedCount: deleted.count },
  });
});

exports.bulkReviveListings = catchAsync(async (req, res, next) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return next(new AppError("ids must be a non-empty array", 400));
  }
  if (ids.length > MAX_BULK_REVIVE_IDS) {
    return next(new AppError("Cannot revive more than 100 listings at once", 400));
  }

  const normalizedIds = ids.map((value) =>
    typeof value === "string" ? value.trim() : String(value)
  );
  const revived = [];
  const failed = [];

  for (const id of normalizedIds) {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    if (!listing) {
      failed.push({ id, reason: "Listing not found" });
      continue;
    }

    if (listing.status !== "inactive") {
      failed.push({ id, reason: "Listing is not inactive" });
      continue;
    }

    const activeCount = await prisma.listing.count({
      where: {
        userId: listing.userId,
        status: { not: "inactive" },
        id: { not: listing.id },
      },
    });

    if (activeCount >= 1) {
      failed.push({ id, reason: "Landlord already has an active listing" });
      continue;
    }

    await prisma.listing.update({
      where: { id },
      data: {
        status: "active",
        publishedAt: new Date(),
        paymentDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    revived.push(id);

    if (listing.user?.email) {
      emailUtils
        .sendEmail({
          to: listing.user.email,
          subject: "Your listing has been revived",
          text: `Your listing '${listing.name}' has been revived by an admin and is now active. You have 48 hours to complete payment to keep it live.`,
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.log("[admin-revive-email]", error?.message || error);
        });
    }
  }

  res.status(200).json({
    status: "success",
    revived,
    failed,
  });
});

exports.purgeSeededListings = catchAsync(async (_req, res) => {
  const where = buildSeededListingWhere();
  const seededListings = await prisma.listing.findMany({
    where,
    select: { id: true },
  });
  const listingIds = seededListings.map((listing) => listing.id);
  const relatedWhere = listingIds.length
    ? { listingId: { in: listingIds } }
    : { listingId: "__never__" };
  const [listingCount, engagementCount, restorationCount, paymentCount] =
    await Promise.all([
      prisma.listing.count({ where }),
      prisma.engagement.count({ where: relatedWhere }),
      prisma.listingRestoration.count({ where: relatedWhere }),
      prisma.payment.count({ where: relatedWhere }),
    ]);

  const deleted = await prisma.listing.deleteMany({ where });

  res.status(200).json({
    status: "success",
    data: {
      deletedCount: deleted.count,
      matchedCount: listingCount,
      relatedCounts: {
        engagements: engagementCount,
        restorations: restorationCount,
        payments: paymentCount,
      },
    },
  });
});

exports.getProviders = catchAsync(async (req, res) => {
  const verificationStatusRaw = req.query.verificationStatus
    ? String(req.query.verificationStatus).trim().toLowerCase()
    : "";
  const searchRaw = req.query.search ? String(req.query.search).trim() : "";
  const search = searchRaw.toLowerCase();

  const roomStats = await prisma.room.groupBy({
    by: ["providerId"],
    _count: { id: true },
  });
  const roomCountByProviderId = new Map(
    roomStats.map((item) => [item.providerId, item._count.id])
  );
  const providerIds = roomStats.map((item) => item.providerId);

  const rawUsers = await prisma.user.findMany({
    where: {
      OR: [{ id: { in: providerIds } }, { providerProfile: { not: null } }],
    },
  });

  const filteredProviders = rawUsers
    .map((userDoc) => buildProviderResponse(userDoc, roomCountByProviderId.get(userDoc.id) || 0))
    .filter((provider) => {
      if (
        verificationStatusRaw &&
        provider.providerProfile.verificationStatus.toLowerCase() !== verificationStatusRaw
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [provider.username, provider.email, provider.phoneNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightDate - leftDate;
    });

  res.status(200).json({
    status: "success",
    total: filteredProviders.length,
    results: filteredProviders.length,
    data: filteredProviders,
  });
});

exports.verifyProvider = catchAsync(async (req, res, next) => {
  const providerId = req.params.id;
  const verificationStatus = (req.body.verificationStatus || req.body.status || "")
    .toString()
    .trim()
    .toLowerCase();

  if (!providerId) {
    return next(new AppError("Invalid provider id", 400));
  }

  if (!["approved", "rejected", "pending"].includes(verificationStatus)) {
    return next(new AppError("verificationStatus must be approved, rejected, or pending", 400));
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
  });
  if (!provider) {
    return next(new AppError("Provider not found", 404));
  }

  const merged = {
    ...(provider.providerProfile || {}),
    verificationStatus,
    verifiedAt: verificationStatus === "approved" ? new Date() : null,
    verificationNotes: req.body.verificationNotes || provider.providerProfile?.verificationNotes || null,
  };

  const updatedProvider = await prisma.user.update({
    where: { id: providerId },
    data: { providerProfile: merged },
  });

  if (["approved", "rejected"].includes(verificationStatus)) {
    void notificationService.enqueue(`provider.${verificationStatus}`, {
      provider: buildNotificationProvider(updatedProvider),
    });
  }

  res.status(200).json({
    status: "success",
    data: buildProviderResponse(updatedProvider, 0),
  });
});

exports.updateProviderCommission = catchAsync(async (req, res, next) => {
  const providerId = req.params.id;
  const commissionRate = Number(req.body.commissionRate);

  if (!providerId) {
    return next(new AppError("Invalid provider id", 400));
  }

  if (!Number.isFinite(commissionRate) || commissionRate < 0) {
    return next(new AppError("commissionRate must be a non-negative number", 400));
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
  });
  if (!provider) {
    return next(new AppError("Provider not found", 404));
  }

  const updatedProvider = await prisma.user.update({
    where: { id: providerId },
    data: {
      providerProfile: {
        ...(provider.providerProfile || {}),
        commissionRate,
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: buildProviderResponse(updatedProvider, 0),
  });
});

exports.getAccommodations = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = {};

  if (req.query.moderationStatus) {
    where.moderationStatus = normalizeEnumValue(req.query.moderationStatus);
  }

  if (req.query.type) {
    where.type = normalizeEnumValue(req.query.type);
  }

  if (req.query.province) {
    where.province = {
      contains: String(req.query.province).trim(),
      mode: "insensitive",
    };
  }

  if (req.query.city) {
    where.city = {
      contains: String(req.query.city).trim(),
      mode: "insensitive",
    };
  }

  if (req.query.search) {
    const search = String(req.query.search).trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { owner: { is: { username: { contains: search, mode: "insensitive" } } } },
      { owner: { is: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [total, accommodations] = await Promise.all([
    prisma.accommodation.count({ where }),
    prisma.accommodation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    }),
  ]);

  res.status(200).json({
    status: "success",
    total,
    results: accommodations.length,
    data: accommodations.map(mapAccommodation),
    pagination: {
      page,
      limit,
      total,
      hasMore: total > skip + accommodations.length,
    },
  });
});

async function updateAccommodationModeration(req, res, next, status, isPublished, action) {
  const reason = ["REJECTED", "SUSPENDED"].includes(status)
    ? requireText(req.body.reason, "reason", next)
    : null;

  if (reason === null && ["REJECTED", "SUSPENDED"].includes(status)) {
    return;
  }

  const accommodation = await prisma.accommodation.findUnique({
    where: { id: req.params.id },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          phoneNumber: true,
          providerProfile: true,
        },
      },
    },
  });

  if (!accommodation) {
    return next(new AppError("Accommodation not found", 404));
  }

  const updatedAccommodation = await prisma.accommodation.update({
    where: { id: accommodation.id },
    data: {
      moderationStatus: status,
      isPublished,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          phoneNumber: true,
          providerProfile: true,
        },
      },
    },
  });

  const metadata = {
    previousStatus: accommodation.moderationStatus,
    nextStatus: status,
    previousPublished: accommodation.isPublished,
    nextPublished: isPublished,
    ...(reason ? { reason } : {}),
  };

  auditAdminAction(req, action, "Accommodation", accommodation.id, metadata);

  const notificationEvent =
    action === "accommodation.reinstated" ? "accommodation.approved" : action;
  void notificationService.enqueue(notificationEvent, {
    provider: buildNotificationProvider(updatedAccommodation.owner),
    accommodation: mapAccommodation(updatedAccommodation),
    reason,
  });

  res.status(200).json({
    status: "success",
    data: {
      accommodation: mapAccommodation(updatedAccommodation),
    },
  });
}

exports.approveAccommodation = catchAsync((req, res, next) =>
  updateAccommodationModeration(
    req,
    res,
    next,
    "APPROVED",
    true,
    "accommodation.approved"
  )
);

exports.rejectAccommodation = catchAsync((req, res, next) =>
  updateAccommodationModeration(
    req,
    res,
    next,
    "REJECTED",
    false,
    "accommodation.rejected"
  )
);

exports.suspendAccommodation = catchAsync((req, res, next) =>
  updateAccommodationModeration(
    req,
    res,
    next,
    "SUSPENDED",
    false,
    "accommodation.suspended"
  )
);

exports.reinstateAccommodation = catchAsync((req, res, next) =>
  updateAccommodationModeration(
    req,
    res,
    next,
    "APPROVED",
    true,
    "accommodation.reinstated"
  )
);

exports.getModerationQueue = catchAsync(async (req, res) => {
  const [
    pendingAccommodations,
    openReports,
    openDisputes,
    pendingReviews,
  ] = await Promise.all([
    prisma.accommodation.count({
      where: {
        moderationStatus: "PENDING_REVIEW",
        deletedAt: null,
      },
    }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.review.count({
      where: {
        isPublished: false,
        deletedAt: null,
      },
    }),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      pendingAccommodations,
      openReports,
      openDisputes,
      pendingReviews,
    },
  });
});

exports.getAuditLogs = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = {};

  ["action", "targetType", "targetId"].forEach((field) => {
    if (req.query[field]) {
      where[field] = String(req.query[field]).trim();
    }
  });

  const adminSearchRaw =
    req.query.adminSearch || req.query.adminId
      ? String(req.query.adminSearch || req.query.adminId).trim()
      : "";
  if (adminSearchRaw) {
    where.OR = [
      { adminId: adminSearchRaw },
      {
        admin: {
          is: {
            email: {
              contains: adminSearchRaw,
              mode: "insensitive",
            },
          },
        },
      },
      {
        admin: {
          is: {
            username: {
              contains: adminSearchRaw,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  const createdAt = parseDateRange(req.query.from, req.query.to, "from", "to", next);
  if (createdAt === null && (req.query.from || req.query.to)) {
    return;
  }
  if (createdAt) {
    where.createdAt = createdAt;
  }

  const [total, auditLogs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    }),
  ]);

  res.status(200).json({
    status: "success",
    total,
    results: auditLogs.length,
    data: auditLogs.map(mapAuditLog),
    pagination: {
      page,
      limit,
      total,
      hasMore: total > skip + auditLogs.length,
    },
  });
});

exports.getAuditLogById = catchAsync(async (req, res, next) => {
  const auditLogEntry = await prisma.auditLog.findUnique({
    where: { id: req.params.id },
    include: {
      admin: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!auditLogEntry) {
    return next(new AppError("Audit log not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      auditLog: mapAuditLog(auditLogEntry),
    },
  });
});

exports.suspendProvider = catchAsync(async (req, res, next) => {
  const reason = requireText(req.body.reason, "reason", next);
  if (!reason) {
    return;
  }

  const provider = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!provider) {
    return next(new AppError("Provider not found", 404));
  }

  const providerProfile = {
    ...getProfile(provider),
    suspendedAt: new Date().toISOString(),
    suspensionReason: reason,
  };

  const updatedProvider = await prisma.user.update({
    where: { id: provider.id },
    data: { providerProfile },
  });

  auditAdminAction(req, "provider.suspended", "User", provider.id, { reason });
  void notificationService.enqueue("provider.suspended", {
    provider: buildNotificationProvider(updatedProvider),
    reason,
  });

  res.status(200).json({
    status: "success",
    data: {
      provider: mapProvider(updatedProvider),
    },
  });
});

exports.reinstateProvider = catchAsync(async (req, res, next) => {
  const provider = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!provider) {
    return next(new AppError("Provider not found", 404));
  }

  const {
    suspendedAt: _suspendedAt,
    suspensionReason: _suspensionReason,
    ...providerProfile
  } = getProfile(provider);

  const updatedProvider = await prisma.user.update({
    where: { id: provider.id },
    data: { providerProfile },
  });

  auditAdminAction(req, "provider.reinstated", "User", provider.id);
  void notificationService.enqueue("provider.reinstated", {
    provider: buildNotificationProvider(updatedProvider),
  });

  res.status(200).json({
    status: "success",
    data: {
      provider: mapProvider(updatedProvider),
    },
  });
});

exports.getDisputes = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = {};

  if (req.query.status) {
    where.status = normalizeEnumValue(req.query.status);
  }

  if (req.query.raisedByRole) {
    where.raisedByRole = String(req.query.raisedByRole).trim().toLowerCase();
  }

  if (req.query.bookingId) {
    where.bookingId = String(req.query.bookingId).trim();
  }

  const [total, disputes] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: disputeInclude,
    }),
  ]);

  res.status(200).json({
    status: "success",
    total,
    results: disputes.length,
    data: disputes.map(mapDispute),
    pagination: {
      page,
      limit,
      total,
      hasMore: total > skip + disputes.length,
    },
  });
});

exports.getDisputeById = catchAsync(async (req, res, next) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: disputeInclude,
  });

  if (!dispute) {
    return next(new AppError("Dispute not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      dispute: mapDispute(dispute),
    },
  });
});

exports.markDisputeUnderReview = catchAsync(async (req, res, next) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: disputeInclude,
  });

  if (!dispute) {
    return next(new AppError("Dispute not found", 404));
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { status: "UNDER_REVIEW" },
    include: disputeInclude,
  });

  auditAdminAction(req, "dispute.under_review", "Dispute", dispute.id, {
    previousStatus: dispute.status,
  });

  res.status(200).json({
    status: "success",
    data: {
      dispute: mapDispute(updatedDispute),
    },
  });
});

exports.resolveDispute = catchAsync(async (req, res, next) => {
  const resolution = requireText(req.body.resolution, "resolution", next);
  if (!resolution) {
    return;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: disputeInclude,
  });

  if (!dispute) {
    return next(new AppError("Dispute not found", 404));
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: "RESOLVED",
      resolution,
      resolvedBy: getUserId(req.user),
      resolvedAt: new Date(),
    },
    include: disputeInclude,
  });

  auditAdminAction(req, "dispute.resolved", "Dispute", dispute.id, {
    resolution,
    previousStatus: dispute.status,
  });

  void notificationService.enqueue("dispute.resolved", {
    dispute: mapDispute(updatedDispute),
    booking: updatedDispute.booking,
    guest: updatedDispute.booking?.guest,
    provider: getBookingProvider(updatedDispute.booking),
    resolution,
  });

  res.status(200).json({
    status: "success",
    data: {
      dispute: mapDispute(updatedDispute),
    },
  });
});

exports.closeDispute = catchAsync(async (req, res, next) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: disputeInclude,
  });

  if (!dispute) {
    return next(new AppError("Dispute not found", 404));
  }

  const resolution = req.body.resolution ? String(req.body.resolution).trim() : null;
  const updatedDispute = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: "CLOSED",
      resolution,
      resolvedBy: getUserId(req.user),
      resolvedAt: new Date(),
    },
    include: disputeInclude,
  });

  auditAdminAction(req, "dispute.closed", "Dispute", dispute.id, {
    resolution,
    previousStatus: dispute.status,
  });

  res.status(200).json({
    status: "success",
    data: {
      dispute: mapDispute(updatedDispute),
    },
  });
});

exports.getReports = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = {};

  if (req.query.status) {
    where.status = normalizeEnumValue(req.query.status);
  }

  ["targetType", "reason"].forEach((field) => {
    if (req.query[field]) {
      where[field] = String(req.query[field]).trim();
    }
  });

  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reportInclude,
    }),
  ]);

  res.status(200).json({
    status: "success",
    total,
    results: reports.length,
    data: reports.map((report) => mapReport(report)),
    pagination: {
      page,
      limit,
      total,
      hasMore: total > skip + reports.length,
    },
  });
});

exports.getReportById = catchAsync(async (req, res, next) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: reportInclude,
  });

  if (!report) {
    return next(new AppError("Report not found", 404));
  }

  const target = await getReportTarget(report);

  res.status(200).json({
    status: "success",
    data: {
      report: mapReport(report, target ? mapId(target) : null),
    },
  });
});

exports.markReportUnderReview = catchAsync(async (req, res, next) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
  });

  if (!report) {
    return next(new AppError("Report not found", 404));
  }

  const updatedReport = await prisma.report.update({
    where: { id: report.id },
    data: { status: "UNDER_REVIEW" },
    include: reportInclude,
  });

  auditAdminAction(req, "report.under_review", "Report", report.id, {
    previousStatus: report.status,
  });

  res.status(200).json({
    status: "success",
    data: {
      report: mapReport(updatedReport),
    },
  });
});

exports.resolveReport = catchAsync(async (req, res, next) => {
  const resolution = requireText(req.body.resolution, "resolution", next);
  if (!resolution) {
    return;
  }

  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: reportInclude,
  });

  if (!report) {
    return next(new AppError("Report not found", 404));
  }

  const updatedReport = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: "RESOLVED",
      resolution,
      resolvedBy: getUserId(req.user),
      resolvedAt: new Date(),
    },
    include: reportInclude,
  });

  auditAdminAction(req, "report.resolved", "Report", report.id, {
    resolution,
    previousStatus: report.status,
  });

  void notificationService.enqueue("report.resolved", {
    report: mapReport(updatedReport),
    reporter: updatedReport.reporter,
    resolution,
  });

  res.status(200).json({
    status: "success",
    data: {
      report: mapReport(updatedReport),
    },
  });
});

exports.dismissReport = catchAsync(async (req, res, next) => {
  const resolution = requireText(req.body.resolution, "resolution", next);
  if (!resolution) {
    return;
  }

  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
  });

  if (!report) {
    return next(new AppError("Report not found", 404));
  }

  const updatedReport = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: "DISMISSED",
      resolution,
      resolvedBy: getUserId(req.user),
      resolvedAt: new Date(),
    },
    include: reportInclude,
  });

  auditAdminAction(req, "report.dismissed", "Report", report.id, {
    resolution,
    previousStatus: report.status,
  });

  res.status(200).json({
    status: "success",
    data: {
      report: mapReport(updatedReport),
    },
  });
});

exports.getAllBookings = catchAsync(async (req, res, next) => {
  const status = req.query.status ? normalizeEnumValue(req.query.status) : "";
  const providerId = req.query.provider ? String(req.query.provider) : "";
  const settlementStatus = req.query.settlementStatus
    ? normalizeEnumValue(req.query.settlementStatus)
    : "";
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

  if (req.query.provider && !providerId.trim()) {
    return next(new AppError("Invalid provider filter", 400));
  }

  if (dateFrom && Number.isNaN(dateFrom.getTime())) {
    return next(new AppError("Invalid dateFrom", 400));
  }

  if (dateTo && Number.isNaN(dateTo.getTime())) {
    return next(new AppError("Invalid dateTo", 400));
  }

  const where = {};

  if (status) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  if (settlementStatus === "SETTLED") {
    where.OR = [{ settlementStatus: "SETTLED" }, { settledAt: { not: null } }];
  } else if (settlementStatus === "PENDING") {
    where.AND = [{ settlementStatus: { not: "SETTLED" } }, { settledAt: null }];
  }

  if (providerId.trim()) {
    const providerRooms = await prisma.room.findMany({
      where: { providerId: providerId.trim() },
      select: { id: true },
    });
    where.roomId = { in: providerRooms.map((room) => room.id) };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const roomIds = Array.from(new Set(bookings.map((booking) => booking.roomId).filter(Boolean)));
  const rooms = roomIds.length
    ? await prisma.room.findMany({
        where: { id: { in: roomIds } },
      })
    : [];
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const bookingProviderIds = Array.from(
    new Set(rooms.map((room) => room.providerId).filter(Boolean))
  );
  const providers = bookingProviderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: bookingProviderIds } },
      })
    : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));

  const data = bookings.map((booking) => {
    const room = roomsById.get(booking.roomId) || null;
    const provider = room ? providersById.get(room.providerId) || null : null;
    const isSettled = booking.settlementStatus === "SETTLED" || Boolean(booking.settledAt);

    return {
      ...booking,
      _id: booking.id,
      settlementStatus: isSettled ? "settled" : "pending",
      room: room
        ? {
            ...room,
            _id: room.id,
            name: room.name || room.title || room.roomName || "Room",
            location: room.location || null,
          }
        : null,
      provider: provider
        ? {
            _id: provider.id,
            username: provider.username || "Unknown provider",
            email: provider.email || null,
          }
        : null,
    };
  });

  res.status(200).json({
    status: "success",
    total: data.length,
    results: data.length,
    data,
  });
});

exports.settleBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (
    booking.settlementStatus === "SETTLED" ||
    booking.settledAt ||
    SETTLEMENT_INELIGIBLE_STATUSES.includes(String(booking.status || "").toLowerCase())
  ) {
    return next(new AppError("Booking is not eligible for settlement", 400));
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      settlementStatus: "SETTLED",
      settledAt: new Date(),
      settlementReference:
        req.body.settlementReference || booking.settlementReference || null,
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: {
              ownerId: true,
              timezone: true,
            },
          },
        },
      },
      guest: {
        select: {
          id: true,
          email: true,
          username: true,
          phoneNumber: true,
        },
      },
      providerUser: {
        select: {
          id: true,
          email: true,
          username: true,
          phoneNumber: true,
          providerProfile: true,
        },
      },
    },
  });

  const fallbackProviderId =
    updatedBooking.providerId ||
    updatedBooking.room?.providerId ||
    updatedBooking.room?.accommodation?.ownerId ||
    null;
  const provider =
    updatedBooking.providerUser ||
    (fallbackProviderId
      ? await prisma.user.findUnique({
          where: { id: fallbackProviderId },
          select: {
            id: true,
            email: true,
            username: true,
            phoneNumber: true,
            providerProfile: true,
          },
        })
      : null);

  void notificationService.enqueue("booking.settlement_completed", {
    booking: {
      ...updatedBooking,
      _id: updatedBooking.id,
    },
    room: updatedBooking.room
      ? {
          ...updatedBooking.room,
          _id: updatedBooking.room.id,
        }
      : null,
    guest: updatedBooking.guest
      ? {
          ...updatedBooking.guest,
          _id: updatedBooking.guest.id,
        }
      : null,
    provider: buildNotificationProvider(provider),
  });

  res.status(200).json({
    status: "success",
    data: {
      ...updatedBooking,
      _id: updatedBooking.id,
    },
  });
});
