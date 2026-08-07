const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const COMPLETED_BOOKING_STATUSES = new Set(["COMPLETED"]);
const RATING_FIELDS = [
  "overallRating",
  "cleanlinessRating",
  "locationRating",
  "valueRating",
  "serviceRating",
];

const getUserId = (user) => user?.id || user?._id?.toString();

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const parsePositiveInteger = (value, label, defaultValue, maxValue) => {
  if (value == null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
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

const parseRating = (value, label, required = false) => {
  if (value == null || value === "") {
    if (required) {
      throw new AppError(`${label} is required`, 400);
    }

    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new AppError(`${label} must be an integer between 1 and 5`, 400);
  }

  return parsed;
};

const parseBoolean = (value, label) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "published"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "hidden", "unpublished"].includes(normalized)) {
    return false;
  }

  throw new AppError(`Invalid ${label}`, 400);
};

const cleanOptionalString = (value, label, maxLength) => {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  if (maxLength && text.length > maxLength) {
    throw new AppError(`${label} must be ${maxLength} characters or less`, 400);
  }

  return text;
};

const pickReviewData = (body, { requireOverallRating = false } = {}) => {
  const data = {};

  RATING_FIELDS.forEach((field) => {
    const hasField = Object.prototype.hasOwnProperty.call(body, field);

    if (hasField || (field === "overallRating" && requireOverallRating)) {
      const rating = parseRating(
        body[field],
        field,
        field === "overallRating" && (requireOverallRating || hasField)
      );

      if (rating != null || hasField) {
        data[field] = rating;
      }
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "comment")) {
    data.comment = cleanOptionalString(body.comment, "comment", 2000);
  }

  return data;
};

const reviewInclude = {
  guest: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
  accommodation: {
    select: {
      id: true,
      ownerId: true,
      name: true,
      city: true,
      province: true,
    },
  },
  booking: {
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

const decorateReview = (review) => {
  if (!review) {
    return review;
  }

  mapId(review);
  mapId(review.guest);
  mapId(review.accommodation);
  mapId(review.booking);
  mapId(review.booking?.room);
  if (review.accommodation) {
    delete review.accommodation.ownerId;
  }

  return review;
};

const getReviewOrFail = async (id) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return review;
};

const ensureProviderOwnsReview = async (reviewId, providerId) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      accommodation: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (review.accommodation?.ownerId !== providerId) {
    throw new AppError("You do not own this accommodation", 403);
  }

  return review;
};

const buildReviewWhere = (query = {}) => {
  const where = {};

  if (query.accommodationId) {
    where.accommodationId = String(query.accommodationId);
  }

  if (query.guestId) {
    where.guestId = String(query.guestId);
  }

  if (query.isPublished != null && query.isPublished !== "") {
    where.isPublished = ["true", "1", "yes", "published"].includes(
      String(query.isPublished).toLowerCase()
    );
  }

  if (query.includeDeleted !== "true") {
    where.deletedAt = null;
  }

  const createdAt = {};
  const from = parseOptionalDate(query.from || query.dateFrom, "from");
  const to = parseOptionalDate(query.to || query.dateTo, "to");

  if (from) {
    createdAt.gte = from;
  }

  if (to) {
    createdAt.lte = to;
  }

  if (Object.keys(createdAt).length) {
    where.createdAt = createdAt;
  }

  return where;
};

const buildPagination = (query = {}) => {
  const page = parsePositiveInteger(query.page, "page", 1);
  const limit = parsePositiveInteger(query.limit, "limit", 20, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getRatingSummary = async (where) => {
  const [aggregate, distributionRows, categoryAggregate] = await Promise.all([
    prisma.review.aggregate({
      where,
      _count: { id: true },
      _avg: { overallRating: true },
    }),
    prisma.review.groupBy({
      by: ["overallRating"],
      where,
      _count: { id: true },
    }),
    prisma.review.aggregate({
      where,
      _avg: {
        cleanlinessRating: true,
        locationRating: true,
        valueRating: true,
        serviceRating: true,
      },
    }),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  distributionRows.forEach((row) => {
    distribution[row.overallRating] = row._count.id;
  });

  const roundAverage = (value) =>
    value == null ? null : Math.round(Number(value) * 10) / 10;

  return {
    total: aggregate._count.id,
    averageRating: roundAverage(aggregate._avg.overallRating),
    ratingDistribution: distribution,
    categoryAverages: {
      cleanlinessRating: roundAverage(categoryAggregate._avg.cleanlinessRating),
      locationRating: roundAverage(categoryAggregate._avg.locationRating),
      valueRating: roundAverage(categoryAggregate._avg.valueRating),
      serviceRating: roundAverage(categoryAggregate._avg.serviceRating),
    },
  };
};

exports.createReview = catchAsync(async (req, res, next) => {
  const bookingId = req.body.bookingId || req.body.booking;

  if (!bookingId) {
    return next(new AppError("bookingId is required", 400));
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        select: {
          accommodationId: true,
          accommodation: {
            select: {
              id: true,
              deletedAt: true,
            },
          },
        },
      },
      review: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (booking.guestId !== getUserId(req.user)) {
    return next(new AppError("You do not own this booking", 403));
  }

  if (!COMPLETED_BOOKING_STATUSES.has(booking.status)) {
    return next(new AppError("Only completed bookings can be reviewed", 400));
  }

  if (booking.review) {
    return next(new AppError("This booking has already been reviewed", 409));
  }

  const accommodationId = booking.room?.accommodationId;

  if (!accommodationId || booking.room?.accommodation?.deletedAt) {
    return next(new AppError("Accommodation not found", 404));
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      guestId: getUserId(req.user),
      accommodationId,
      ...pickReviewData(req.body, { requireOverallRating: true }),
    },
    include: reviewInclude,
  });

  res.status(201).json({
    status: "success",
    data: {
      review: decorateReview(review),
    },
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  const existingReview = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      guestId: true,
      deletedAt: true,
    },
  });

  if (!existingReview) {
    return next(new AppError("Review not found", 404));
  }

  if (existingReview.guestId !== getUserId(req.user)) {
    return next(new AppError("You do not own this review", 403));
  }

  if (existingReview.deletedAt) {
    return next(new AppError("Deleted reviews cannot be edited", 400));
  }

  const data = pickReviewData(req.body);

  if (!Object.keys(data).length) {
    return next(new AppError("No review fields provided", 400));
  }

  const review = await prisma.review.update({
    where: { id: existingReview.id },
    data,
    include: reviewInclude,
  });

  res.status(200).json({
    status: "success",
    data: {
      review: decorateReview(review),
    },
  });
});

exports.respondToReview = catchAsync(async (req, res, next) => {
  let existingReview;

  try {
    existingReview = await ensureProviderOwnsReview(req.params.id, getUserId(req.user));
  } catch (error) {
    return next(error);
  }

  if (existingReview.deletedAt) {
    return next(new AppError("Deleted reviews cannot receive provider responses", 400));
  }

  const providerResponse = cleanOptionalString(
    req.body.providerResponse || req.body.response,
    "providerResponse",
    2000
  );

  if (!providerResponse) {
    return next(new AppError("providerResponse is required", 400));
  }

  const review = await prisma.review.update({
    where: { id: existingReview.id },
    data: { providerResponse },
    include: reviewInclude,
  });

  res.status(200).json({
    status: "success",
    data: {
      review: decorateReview(review),
    },
  });
});

exports.moderateReview = catchAsync(async (req, res, next) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  const action = String(req.body.action || req.body.status || "").trim().toLowerCase();
  const data = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "isPublished")) {
    data.isPublished = parseBoolean(req.body.isPublished, "isPublished");
  }

  if (action === "publish" || action === "approved" || action === "approve") {
    data.isPublished = true;
    data.deletedAt = null;
  } else if (action === "unpublish" || action === "hidden" || action === "reject") {
    data.isPublished = false;
  } else if (action === "delete" || action === "remove") {
    data.isPublished = false;
    data.deletedAt = review.deletedAt || new Date();
  } else if (action === "restore") {
    data.deletedAt = null;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "deleted")) {
    data.deletedAt = req.body.deleted ? review.deletedAt || new Date() : null;
  }

  if (!Object.keys(data).length) {
    return next(new AppError("No moderation fields provided", 400));
  }

  const updatedReview = await prisma.review.update({
    where: { id: review.id },
    data,
    include: reviewInclude,
  });

  res.status(200).json({
    status: "success",
    data: {
      review: decorateReview(updatedReview),
    },
  });
});

exports.getAccommodationReviews = catchAsync(async (req, res) => {
  const accommodationId = req.params.id || req.params.accommodationId;
  const { page, limit, skip } = buildPagination(req.query);
  const where = {
    accommodationId,
    isPublished: true,
    deletedAt: null,
  };

  const [reviews, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    getRatingSummary(where),
  ]);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    data: {
      reviews: reviews.map(decorateReview),
      summary,
    },
    pagination: {
      page,
      limit,
      hasMore: total > skip + reviews.length,
      total,
    },
  });
});

exports.getMyReviews = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = {
    guestId: getUserId(req.user),
    deletedAt: null,
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
  ]);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    data: {
      reviews: reviews.map(decorateReview),
    },
    pagination: {
      page,
      limit,
      hasMore: total > skip + reviews.length,
      total,
    },
  });
});

exports.getProviderReviews = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = buildPagination(req.query);
  const accommodationWhere = {
    ownerId: getUserId(req.user),
    deletedAt: null,
  };

  if (req.query.accommodationId) {
    accommodationWhere.id = String(req.query.accommodationId);
  }

  const accommodations = await prisma.accommodation.findMany({
    where: accommodationWhere,
    select: { id: true },
  });
  const accommodationIds = accommodations.map((accommodation) => accommodation.id);

  if (req.query.accommodationId && !accommodationIds.length) {
    return next(new AppError("You do not own this accommodation", 403));
  }

  const where = {
    accommodationId: { in: accommodationIds },
    ...(req.query.includeDeleted === "true" ? {} : { deletedAt: null }),
  };

  const [reviews, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    getRatingSummary(where),
  ]);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    data: {
      reviews: reviews.map(decorateReview),
      summary,
    },
    pagination: {
      page,
      limit,
      hasMore: total > skip + reviews.length,
      total,
    },
  });
});

exports.getAllReviews = catchAsync(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);
  const where = buildReviewWhere(req.query);

  const [reviews, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    getRatingSummary(where),
  ]);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    data: {
      reviews: reviews.map(decorateReview),
      summary,
    },
    pagination: {
      page,
      limit,
      hasMore: total > skip + reviews.length,
      total,
    },
  });
});

exports.getReviewAnalytics = catchAsync(async (req, res) => {
  const where = buildReviewWhere({
    ...req.query,
    includeDeleted: req.query.includeDeleted || "true",
  });
  const activeWhere = {
    ...where,
    deletedAt: null,
  };

  const [summary, publishedCount, hiddenCount, deletedCount, recentReviews] = await Promise.all([
    getRatingSummary(activeWhere),
    prisma.review.count({
      where: {
        ...activeWhere,
        isPublished: true,
      },
    }),
    prisma.review.count({
      where: {
        ...activeWhere,
        isPublished: false,
      },
    }),
    prisma.review.count({
      where: {
        ...where,
        deletedAt: { not: null },
      },
    }),
    prisma.review.findMany({
      where: activeWhere,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      ...summary,
      publishedCount,
      hiddenCount,
      deletedCount,
      recentReviews: recentReviews.map(decorateReview),
    },
  });
});

exports.getReviewById = catchAsync(async (req, res, next) => {
  let review;

  try {
    review = await getReviewOrFail(req.params.id);
  } catch (error) {
    return next(error);
  }

  const userId = getUserId(req.user);
  const isGuestOwner = review.guestId === userId;
  const isProviderOwner = review.accommodation?.ownerId === userId;
  const isAdmin = req.user?.role === "admin";

  if (!isGuestOwner && !isProviderOwner && !isAdmin) {
    return next(new AppError("You do not have access to this review", 403));
  }

  res.status(200).json({
    status: "success",
    data: {
      review: decorateReview(review),
    },
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      guestId: true,
      deletedAt: true,
    },
  });

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  if (review.guestId !== getUserId(req.user) && req.user?.role !== "admin") {
    return next(new AppError("You do not own this review", 403));
  }

  await prisma.review.update({
    where: { id: review.id },
    data: {
      isPublished: false,
      deletedAt: review.deletedAt || new Date(),
    },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.addProviderResponse = exports.respondToReview;
exports.updateProviderResponse = exports.respondToReview;
exports.getAdminReviewAnalytics = exports.getReviewAnalytics;
exports.listReviews = exports.getAllReviews;
