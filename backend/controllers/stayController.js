const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { resolvePrice } = require("../utils/pricingResolver");
const { createSearchCacheKey, searchCache } = require("../utils/searchCache");
const { logSearchEvent } = require("../utils/searchAnalytics");

const AVAILABLE_BOOKING_STATUSES = ["CONFIRMED", "PENDING_CONFIRMATION", "PENDING_PAYMENT"];
const ACCOMMODATION_TYPES = new Set([
  "HOTEL",
  "LODGE",
  "BNB",
  "APARTMENT",
  "GUEST_HOUSE",
  "HOSTEL",
]);
const BOOKING_MODES = new Set(["INSTANT", "REQUEST"]);
const ROOM_TYPES = new Set([
  "SINGLE",
  "DOUBLE",
  "TWIN",
  "SUITE",
  "DORMITORY",
  "STUDIO",
  "ENTIRE_UNIT",
]);
const SORT_OPTIONS = new Set(["price_asc", "price_desc", "rating_desc", "newest", "distance"]);
const AMENITY_LABEL_TO_SLUG = {
  "Wi-Fi": "wifi",
  "Breakfast Included": "breakfast",
  "Secure Parking": "parking",
  "Swimming Pool": "pool",
  "Air Conditioning": "aircon",
  "Conference Room": "conferenceRoom",
  "Airport Pickup": "airportPickup",
  "Family Friendly": "familyFriendly",
};
const LEGACY_AMENITY_FLAGS = [
  "wifi",
  "breakfast",
  "parking",
  "pool",
  "aircon",
  "conferenceRoom",
  "airportPickup",
  "familyFriendly",
];
const MIN_ROOM_SEARCH_WINDOW_SIZE = 48;

const parseDate = (value, label) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const normalizeEnumInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const normalizeSlugInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  const rawValue = String(value).trim();
  const mappedSlug = AMENITY_LABEL_TO_SLUG[rawValue];

  if (mappedSlug) {
    return mappedSlug;
  }

  return rawValue
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getSlugVariants = (slug) => {
  const kebabSlug = normalizeSlugInput(slug);
  const camelSlug = String(kebabSlug).replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  const snakeSlug = String(kebabSlug).replace(/-/g, "_");

  return [...new Set([slug, kebabSlug, camelSlug, snakeSlug].filter(Boolean))];
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null || value === "") {
    return [];
  }

  return [value];
};

const parseOptionalNumber = (value, label, { min, max } = {}) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  if (min != null && parsed < min) {
    throw new AppError(`${label} must be at least ${min}`, 400);
  }

  if (max != null && parsed > max) {
    throw new AppError(`${label} must be at most ${max}`, 400);
  }

  return parsed;
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

const isTruthy = (value) => ["true", "1", "yes", "on"].includes(String(value).toLowerCase());

const getRequiredAmenitySlugs = (query) => {
  const amenityValues = toArray(query.amenities)
    .flatMap((value) => String(value).split(","))
    .map(normalizeSlugInput)
    .filter(Boolean);

  LEGACY_AMENITY_FLAGS.forEach((flag) => {
    if (isTruthy(query[flag])) {
      amenityValues.push(normalizeSlugInput(flag));
    }
  });

  return [...new Set(amenityValues)];
};

const parseGeoFilter = (query) => {
  const hasGeoParams = [query.lat, query.lng, query.radius].some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (!hasGeoParams) {
    return null;
  }

  const lat = parseOptionalNumber(query.lat, "lat", { min: -90, max: 90 });
  const lng = parseOptionalNumber(query.lng, "lng", { min: -180, max: 180 });
  const radius = parseOptionalNumber(query.radius, "radius", { min: 0.1 });

  if (lat == null || lng == null || radius == null) {
    throw new AppError("lat, lng, and radius are required together", 400);
  }

  const latDelta = radius / 111;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const safeCosLat = Math.max(Math.abs(cosLat), 0.01);
  const lngDelta = radius / (111 * safeCosLat);

  return {
    lat,
    lng,
    radius,
    bounds: {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    },
  };
};

const haversineDistanceKm = (originLat, originLng, targetLat, targetLng) => {
  if ([originLat, originLng, targetLat, targetLng].some((value) => !Number.isFinite(Number(value)))) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(targetLat - originLat);
  const dLng = toRadians(targetLng - originLng);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toNumber = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeAverageRating = (reviews = []) => {
  if (!reviews.length) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.overallRating || 0), 0);
  return Math.round((total / reviews.length) * 10) / 10;
};

const decorateStay = (room, checkIn, checkOut, ratingByAccommodationId = new Map(), geoFilter = null) => {
  const stay = room.toObject ? room.toObject() : room;
  const accommodation = stay.accommodation || {};
  const reviews = accommodation.reviews || [];
  const selectedAmenities = stay.amenities || [];
  const selectedImages = stay.images || [];
  const avgRating =
    ratingByAccommodationId.get(accommodation.id) ?? computeAverageRating(reviews);
  const resolvedPrice =
    checkIn && checkOut
      ? resolvePrice(stay, checkIn, checkOut)
      : stay.basePricePerNight ??
        stay.pricePerNight ??
        stay.nightlyRate ??
        stay.price ??
        null;
  const distanceKm = geoFilter
    ? haversineDistanceKm(geoFilter.lat, geoFilter.lng, accommodation.lat, accommodation.lng)
    : null;

  return {
    id: stay.id,
    _id: stay.id,
    name: stay.name,
    description: stay.description,
    roomType: stay.roomType,
    capacity: stay.capacity,
    basePricePerNight: toNumber(stay.basePricePerNight),
    bookingMode: stay.bookingMode,
    createdAt: stay.createdAt,
    resolvedPrice: toNumber(resolvedPrice),
    images: selectedImages.map((image) => image.url).filter(Boolean),
    coverImage: selectedImages[0]?.url || null,
    amenities: selectedAmenities
      .map((roomAmenity) => roomAmenity.amenity)
      .filter(Boolean)
      .map((amenity) => ({
        slug: amenity.slug,
        label: amenity.label,
      })),
    avgRating,
    reviewCount: reviews.length,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : null,
    accommodation: {
      id: accommodation.id,
      _id: accommodation.id,
      name: accommodation.name,
      type: accommodation.type,
      city: accommodation.city,
      province: accommodation.province,
      lat: accommodation.lat,
      lng: accommodation.lng,
      cancellationPolicy: accommodation.cancellationPolicy
        ? { policyType: accommodation.cancellationPolicy.policyType }
        : null,
      checkInOutRules: accommodation.checkInOutRules
        ? { selfCheckIn: accommodation.checkInOutRules.selfCheckIn }
        : null,
      reviews,
    },
    city: accommodation.city,
    province: accommodation.province,
    location: [accommodation.city, accommodation.province].filter(Boolean).join(", "),
    selfCheckIn: Boolean(accommodation.checkInOutRules?.selfCheckIn),
    cancellationPolicy: accommodation.cancellationPolicy?.policyType || null,
  };
};

const getOrderBy = (sort) => {
  switch (sort) {
    case "price_asc":
      return [{ basePricePerNight: "asc" }, { createdAt: "desc" }, { id: "asc" }];
    case "price_desc":
      return [{ basePricePerNight: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
};

const sortDecoratedStays = (stays, sort) => {
  if (sort === "rating_desc") {
    return [...stays].sort((left, right) => {
      const ratingDiff = Number(right.avgRating || 0) - Number(left.avgRating || 0);

      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
  }

  if (sort === "distance") {
    return [...stays].sort((left, right) => {
      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
  }

  return stays;
};

const getSeasonalRateWhere = (checkIn, checkOut) => ({
  OR: [
    { startDate: null },
    { endDate: null },
    {
      AND: [
        { startDate: { lt: checkOut } },
        { endDate: { gte: checkIn } },
      ],
    },
  ],
});

const getRoomSearchSelect = (includeSeasonalRates, checkIn, checkOut) => ({
  id: true,
  name: true,
  description: true,
  roomType: true,
  capacity: true,
  basePricePerNight: true,
  bookingMode: true,
  createdAt: true,
  ...(includeSeasonalRates
    ? {
        seasonalRates: {
          where: getSeasonalRateWhere(checkIn, checkOut),
          select: {
            rateType: true,
            pricePerNight: true,
            startDate: true,
            endDate: true,
            daysOfWeek: true,
            minNightsToApply: true,
            priority: true,
          },
        },
      }
    : {}),
  images: {
    orderBy: [
      { isCover: "desc" },
      { sortOrder: "asc" },
    ],
    take: 1,
    select: {
      url: true,
    },
  },
  amenities: {
    select: {
      amenity: {
        select: {
          slug: true,
          label: true,
        },
      },
    },
  },
  accommodation: {
    select: {
      id: true,
      name: true,
      type: true,
      city: true,
      province: true,
      lat: true,
      lng: true,
      cancellationPolicy: {
        select: {
          policyType: true,
        },
      },
      checkInOutRules: {
        select: {
          selfCheckIn: true,
        },
      },
      reviews: {
        where: {
          isPublished: true,
          deletedAt: null,
        },
        select: {
          overallRating: true,
        },
      },
    },
  },
});

const getAvailabilityWhere = (checkIn, checkOut) => ({
  bookings: {
    none: {
      status: { in: AVAILABLE_BOOKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  },
  availabilityBlocks: {
    none: {
      startDate: { lt: checkOut },
      endDate: { gt: checkIn },
    },
  },
});

const withAvailabilityWhere = (roomWhere, checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return roomWhere;
  }

  return {
    ...roomWhere,
    ...getAvailabilityWhere(checkIn, checkOut),
  };
};

const getUnavailableRoomIds = async (roomIds, checkIn, checkOut) => {
  if (!checkIn || !checkOut || !roomIds.length) {
    return new Set();
  }

  const [bookings, availabilityBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: { in: AVAILABLE_BOOKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        roomId: { in: roomIds },
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      select: { roomId: true },
    }),
  ]);

  return new Set([
    ...bookings.map((booking) => booking.roomId),
    ...availabilityBlocks.map((availabilityBlock) => availabilityBlock.roomId),
  ]);
};

const filterAvailableRooms = async (rooms, checkIn, checkOut) => {
  if (!checkIn || !checkOut || !rooms.length) {
    return rooms;
  }

  const unavailableRoomIds = await getUnavailableRoomIds(
    rooms.map((room) => room.id),
    checkIn,
    checkOut
  );

  return rooms.filter((room) => !unavailableRoomIds.has(room.id));
};

const fetchAvailabilityAwareRoomPage = async ({
  roomWhere,
  select,
  orderBy,
  checkIn,
  checkOut,
  page,
  limit,
  total,
}) => {
  const skipAvailable = (page - 1) * limit;

  if (skipAvailable >= total) {
    return [];
  }

  const pageRooms = [];
  const windowSize = Math.max(limit * 3, MIN_ROOM_SEARCH_WINDOW_SIZE);
  let rawOffset = 0;
  let availableSeen = 0;

  while (pageRooms.length < limit) {
    const rawRooms = await prisma.room.findMany({
      where: roomWhere,
      skip: rawOffset,
      take: windowSize,
      orderBy,
      select,
    });

    if (!rawRooms.length) {
      break;
    }

    rawOffset += rawRooms.length;

    const availableRooms = await filterAvailableRooms(rawRooms, checkIn, checkOut);

    for (const room of availableRooms) {
      if (availableSeen >= skipAvailable && pageRooms.length < limit) {
        pageRooms.push(room);
      }

      availableSeen += 1;
    }

    if (rawRooms.length < windowSize) {
      break;
    }
  }

  return pageRooms;
};

const buildSearchResponse = ({ stays, page, limit, hasMore, total }) => ({
  status: "success",
  data: {
    stays,
  },
  pagination: {
    page,
    limit,
    hasMore,
    total,
  },
});

const getRequestUserId = (req) => req.user?.id || req.user?._id || null;

exports.searchStays = catchAsync(async (req, res, next) => {
  const startedAt = Date.now();
  const checkIn = parseDate(req.query.checkIn, "checkIn");
  const checkOut = parseDate(req.query.checkOut, "checkOut");

  if ((checkIn && !checkOut) || (!checkIn && checkOut) || (checkIn && checkOut && checkIn >= checkOut)) {
    return next(new AppError("Valid checkIn and checkOut are required together", 400));
  }

  const page = parsePositiveInteger(req.query.page, "page", 1);
  const limit = parsePositiveInteger(req.query.limit, "limit", 12, 48);
  const skip = (page - 1) * limit;
  const location = req.query.location?.trim();
  const searchTerm = req.query.searchTerm?.trim();
  const businessType = normalizeEnumInput(req.query.businessType);
  const bookingMode = normalizeEnumInput(req.query.bookingMode);
  const roomType = normalizeEnumInput(req.query.roomType);
  const minPrice = parseOptionalNumber(req.query.minPrice, "minPrice", { min: 0 });
  const maxPrice = parseOptionalNumber(req.query.maxPrice, "maxPrice", { min: 0 });
  const minRating = parseOptionalNumber(req.query.minRating, "minRating", { min: 0, max: 5 });
  const geoFilter = parseGeoFilter(req.query);
  const sort = req.query.sort ? String(req.query.sort).trim() : "newest";
  const selfCheckIn = isTruthy(req.query.selfCheckIn);
  const guests = parsePositiveInteger(req.query.guests, "guests", null);
  const requiredAmenitySlugs = getRequiredAmenitySlugs(req.query);
  const userId = getRequestUserId(req);
  const shouldUseCache = !checkIn && !checkOut;
  const cacheKey = shouldUseCache ? createSearchCacheKey(req.query) : null;

  if (businessType && !ACCOMMODATION_TYPES.has(businessType)) {
    return next(new AppError("Invalid businessType", 400));
  }

  if (bookingMode && !BOOKING_MODES.has(bookingMode)) {
    return next(new AppError("Invalid bookingMode", 400));
  }

  if (roomType && !ROOM_TYPES.has(roomType)) {
    return next(new AppError("Invalid roomType", 400));
  }

  if (!SORT_OPTIONS.has(sort)) {
    return next(new AppError("Invalid sort", 400));
  }

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return next(new AppError("minPrice must be less than or equal to maxPrice", 400));
  }

  if (cacheKey) {
    const cachedResponse = searchCache.get(cacheKey);

    if (cachedResponse) {
      logSearchEvent({
        params: req.query,
        resultCount: cachedResponse.data?.stays?.length || 0,
        durationMs: Date.now() - startedAt,
        userId,
      });

      return res.status(200).json(cachedResponse);
    }
  }

  const ratingByAccommodationId = new Map();
  let minRatedAccommodationIds = null;

  if (minRating != null || sort === "rating_desc") {
    const ratingGroups = await prisma.review.groupBy({
      by: ["accommodationId"],
      where: {
        isPublished: true,
        deletedAt: null,
      },
      _avg: {
        overallRating: true,
      },
    });
    const sortedRatingGroups = [...ratingGroups].sort(
      (left, right) => Number(right._avg.overallRating || 0) - Number(left._avg.overallRating || 0)
    );

    sortedRatingGroups.forEach((group) => {
      const averageRating = group._avg.overallRating;

      if (averageRating != null) {
        ratingByAccommodationId.set(group.accommodationId, Math.round(Number(averageRating) * 10) / 10);
      }
    });

    if (minRating != null) {
      minRatedAccommodationIds = sortedRatingGroups
        .filter((group) => Number(group._avg.overallRating || 0) >= minRating)
        .map((group) => group.accommodationId);
    }
  }

  if (minRatedAccommodationIds && minRatedAccommodationIds.length === 0) {
    const responseBody = buildSearchResponse({
      stays: [],
      page,
      limit,
      hasMore: false,
      total: 0,
    });

    if (cacheKey) {
      searchCache.set(cacheKey, responseBody);
    }

    logSearchEvent({
      params: req.query,
      resultCount: 0,
      durationMs: Date.now() - startedAt,
      userId,
    });

    return res.status(200).json(responseBody);
  }

  const accommodationAnd = [];

  if (location) {
    accommodationAnd.push({
      OR: [
        { province: { contains: location, mode: "insensitive" } },
        { city: { contains: location, mode: "insensitive" } },
      ],
    });
  }

  if (geoFilter) {
    accommodationAnd.push({
      lat: { gte: geoFilter.bounds.minLat, lte: geoFilter.bounds.maxLat },
      lng: { gte: geoFilter.bounds.minLng, lte: geoFilter.bounds.maxLng },
    });
  }

  if (selfCheckIn) {
    accommodationAnd.push({
      checkInOutRules: {
        is: {
          selfCheckIn: true,
        },
      },
    });
  }

  if (minRatedAccommodationIds) {
    accommodationAnd.push({
      id: { in: minRatedAccommodationIds },
    });
  }

  const accommodationWhere = {
    verificationStatus: "APPROVED",
    isPublished: true,
    deletedAt: null,
    ...(businessType ? { type: businessType } : {}),
    ...(accommodationAnd.length ? { AND: accommodationAnd } : {}),
  };
  const basePricePerNight = {};

  if (minPrice != null) {
    basePricePerNight.gte = minPrice;
  }

  if (maxPrice != null) {
    basePricePerNight.lte = maxPrice;
  }

  const roomAnd = requiredAmenitySlugs.map((slug) => ({
    amenities: {
      some: {
        amenity: {
          slug: { in: getSlugVariants(slug) },
        },
      },
    },
  }));

  if (searchTerm) {
    roomAnd.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        {
          accommodation: {
            is: {
              OR: [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { city: { contains: searchTerm, mode: "insensitive" } },
                { province: { contains: searchTerm, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  const roomWhere = {
    status: "AVAILABLE",
    deletedAt: null,
    accommodation: {
      is: accommodationWhere,
    },
    ...(guests != null ? { capacity: { gte: guests } } : {}),
    ...(Object.keys(basePricePerNight).length ? { basePricePerNight } : {}),
    ...(bookingMode ? { bookingMode } : {}),
    ...(roomType ? { roomType } : {}),
    ...(roomAnd.length ? { AND: roomAnd } : {}),
  };

  const includeSeasonalRates = Boolean(checkIn && checkOut);
  const roomSearchSelect = getRoomSearchSelect(includeSeasonalRates, checkIn, checkOut);
  const orderBy = getOrderBy(sort);
  const requiresGlobalOrdering = sort === "rating_desc" || (sort === "distance" && geoFilter);
  const availableRoomWhere = withAvailabilityWhere(roomWhere, checkIn, checkOut);
  let total = 0;
  let stays = [];
  let hasMore = false;

  if (requiresGlobalOrdering) {
    const rooms = await prisma.room.findMany({
      where: availableRoomWhere,
      orderBy: getOrderBy("newest"),
      select: roomSearchSelect,
    });
    const decoratedStays = rooms.map((room) =>
      decorateStay(room, checkIn, checkOut, ratingByAccommodationId, geoFilter)
    );
    const sortedStays = sortDecoratedStays(decoratedStays, sort);

    total = sortedStays.length;
    stays = sortedStays.slice(skip, skip + limit);
    hasMore = total > skip + stays.length;
  } else if (checkIn && checkOut) {
    total = await prisma.room.count({ where: availableRoomWhere });

    const rooms = await fetchAvailabilityAwareRoomPage({
      roomWhere,
      select: roomSearchSelect,
      orderBy,
      checkIn,
      checkOut,
      page,
      limit,
      total,
    });
    const decoratedStays = rooms.map((room) =>
      decorateStay(room, checkIn, checkOut, ratingByAccommodationId, geoFilter)
    );
    const sortedStays = sortDecoratedStays(decoratedStays, sort);

    stays = sortedStays.slice(0, limit);
    hasMore = total > skip + stays.length;
  } else {
    const [roomTotal, rooms] = await Promise.all([
      prisma.room.count({ where: roomWhere }),
      prisma.room.findMany({
        where: roomWhere,
        skip,
        take: limit,
        orderBy,
        select: roomSearchSelect,
      }),
    ]);
    const decoratedStays = rooms.map((room) =>
      decorateStay(room, checkIn, checkOut, ratingByAccommodationId, geoFilter)
    );
    const sortedStays = sortDecoratedStays(decoratedStays, sort);

    total = roomTotal;
    stays = sortedStays.slice(0, limit);
    hasMore = total > skip + stays.length;
  }
  const responseBody = buildSearchResponse({
    stays,
    page,
    limit,
    hasMore,
    total,
  });

  if (cacheKey) {
    searchCache.set(cacheKey, responseBody);
  }

  logSearchEvent({
    params: req.query,
    resultCount: stays.length,
    durationMs: Date.now() - startedAt,
    userId,
  });

  res.status(200).json(responseBody);
});

exports.getProviderStays = catchAsync(async (req, res, next) => {
  const providerId = req.params.providerId;

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, providerProfile: true },
  });

  if (!provider) {
    return next(new AppError("Provider not approved", 404));
  }

  const accommodations = await prisma.accommodation.findMany({
    where: {
      ownerId: providerId,
      verificationStatus: "APPROVED",
      isPublished: true,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!accommodations.length) {
    return next(new AppError("Provider not approved", 404));
  }

  mapId(provider);
  accommodations.forEach(mapId);

  const rooms = await prisma.room.findMany({
    where: {
      accommodationId: { in: accommodations.map((accommodation) => accommodation.id) },
      status: "AVAILABLE",
      deletedAt: null,
    },
    include: {
      accommodation: true,
      amenities: {
        include: { amenity: true },
      },
      images: { orderBy: { sortOrder: "asc" } },
      seasonalRates: true,
    },
    orderBy: { createdAt: "desc" },
  });

  rooms.forEach((room) => {
    mapId(room);
    mapId(room.accommodation);
  });

  const decoratedRooms = rooms.map((room) => decorateStay(room));

  res.status(200).json({
    status: "success",
    data: {
      provider: {
        ...provider.providerProfile,
        _id: provider.id,
        accommodation: accommodations[0],
        accommodations,
      },
      rooms: decoratedRooms,
    },
  });
});
