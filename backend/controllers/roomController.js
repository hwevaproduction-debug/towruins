const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { toLocalDateString } = require("../utils/dateUtils");
const { resolvePriceBreakdown } = require("../utils/pricingResolver");
const {
  BOOKING_CANCELLED_STATUSES,
  collectRuleViolations,
  createViolation,
  expandDateRange,
  getRoomTimezone,
  normalizeStayDates,
} = require("../utils/reservationRules");

const ROOM_STATUSES = new Set(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"]);
const BOOKING_MODES = new Set(["INSTANT", "REQUEST"]);

const parseRequiredDate = (value, label) => {
  const parsed = new Date(value);

  if (!value || Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const getUserId = (user) => user?.id || user?._id?.toString();

const normalizeEnumInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
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

const decoratePublicRoom = (room) => {
  mapId(room);
  mapId(room.accommodation);
  const timezone = getRoomTimezone(room);

  return {
    ...room,
    _id: room.id,
    basePricePerNight: toNumber(room.basePricePerNight),
    resolvedPrice: toNumber(room.basePricePerNight),
    images: (room.images || []).map((image) => image.url).filter(Boolean),
    coverImage: room.images?.[0]?.url || null,
    amenities: (room.amenities || [])
      .map((roomAmenity) => roomAmenity.amenity)
      .filter(Boolean)
      .map((amenity) => ({
        slug: amenity.slug,
        label: amenity.label,
      })),
    city: room.accommodation?.city,
    province: room.accommodation?.province,
    location: [room.accommodation?.city, room.accommodation?.province].filter(Boolean).join(", "),
    timezone,
    currentDate: toLocalDateString(new Date(), timezone),
    checkInTime: room.accommodation?.checkInOutRules?.checkInFrom || null,
    checkOutTime: room.accommodation?.checkInOutRules?.checkOutBy || null,
    cancellationPolicy: room.accommodation?.cancellationPolicy?.policyType || null,
  };
};

const sumPricingBreakdown = (pricingBreakdown) =>
  Number(
    pricingBreakdown
      .reduce((sum, night) => sum + Number(night.pricePerNight || 0), 0)
      .toFixed(2)
  );

const ensureProviderOwnsRoom = async (roomId, userId) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      accommodation: {
        select: { ownerId: true },
      },
    },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const allowedOwnerIds = [room.providerId, room.accommodation?.ownerId]
    .filter(Boolean)
    .map((value) => value.toString());

  if (!allowedOwnerIds.includes(userId.toString())) {
    throw new AppError("You do not own this room", 403);
  }

  return room;
};

exports.createRoom = catchAsync(async (req, res, next) => {
  if (normalizeEnumInput(req.user?.providerProfile?.verificationStatus) !== "APPROVED") {
    return next(new AppError("Provider verification required", 403));
  }

  const input = { ...req.body };
  delete input.provider;
  delete input.providerProfile;
  delete input.providerId;
  delete input._id;
  delete input.id;

  const accommodationId = input.accommodationId;
  if (!accommodationId) {
    return next(new AppError("accommodationId is required", 400));
  }

  const accommodation = await prisma.accommodation.findFirst({
    where: {
      id: accommodationId,
      ownerId: getUserId(req.user),
      deletedAt: null,
    },
  });

  if (!accommodation) {
    return next(new AppError("You do not own this accommodation", 403));
  }

  const status = normalizeEnumInput(input.status) || "AVAILABLE";
  const bookingMode = normalizeEnumInput(input.bookingMode) || "INSTANT";

  if (!ROOM_STATUSES.has(status)) {
    return next(new AppError("Invalid room status", 400));
  }

  if (!BOOKING_MODES.has(bookingMode)) {
    return next(new AppError("Invalid bookingMode", 400));
  }

  const room = await prisma.room.create({
    data: {
      name: input.name,
      description: input.description,
      roomType: input.roomType,
      capacity: input.capacity,
      basePricePerNight: input.basePricePerNight,
      status,
      bookingMode,
      maxAdvanceBookingDays: input.maxAdvanceBookingDays,
      accommodationId,
      providerId: getUserId(req.user),
    },
  });

  mapId(room);

  res.status(201).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.getMyRooms = catchAsync(async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: { providerId: getUserId(req.user), deletedAt: null },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  rooms.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: rooms.length,
    data: {
      rooms,
    },
  });
});

exports.getPublicRoom = catchAsync(async (req, res, next) => {
  const room = await prisma.room.findFirst({
    where: {
      id: req.params.id,
      deletedAt: null,
      accommodation: {
        is: {
          deletedAt: null,
          isPublished: true,
          verificationStatus: "APPROVED",
        },
      },
    },
    include: {
      occupancyRule: true,
      seasonalRates: true,
      images: { orderBy: { sortOrder: "asc" } },
      amenities: {
        include: {
          amenity: true,
        },
      },
      accommodation: {
        include: {
          cancellationPolicy: true,
          checkInOutRules: true,
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
    },
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      room: decoratePublicRoom(room),
    },
  });
});

exports.updateRoom = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const updates = { ...req.body };
  delete updates.provider;
  delete updates.providerProfile;
  delete updates.providerId;
  delete updates.accommodationId;
  delete updates.amenities;
  delete updates.imageUrls;
  delete updates.pricingRules;
  delete updates.cancellationPolicy;
  delete updates.cancellationPolicyCustomText;
  delete updates._id;
  delete updates.id;

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    updates.status = normalizeEnumInput(updates.status);

    if (!ROOM_STATUSES.has(updates.status)) {
      return next(new AppError("Invalid room status", 400));
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "bookingMode")) {
    updates.bookingMode = normalizeEnumInput(updates.bookingMode);

    if (!BOOKING_MODES.has(updates.bookingMode)) {
      return next(new AppError("Invalid bookingMode", 400));
    }
  }

  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: updates,
  });

  mapId(room);

  res.status(200).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.deleteRoom = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  await prisma.room.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createRoomBlock = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const startDate = parseRequiredDate(req.body.startDate, "startDate");
  const endDate = parseRequiredDate(req.body.endDate, "endDate");

  if (startDate >= endDate) {
    return next(new AppError("startDate must be before endDate", 400));
  }

  const availabilityBlock = await prisma.availabilityBlock.create({
    data: {
      roomId: req.params.id,
      blockType: "MANUAL",
      startDate,
      endDate,
      reason: req.body.reason || "",
      createdBy: getUserId(req.user),
    },
  });

  mapId(availabilityBlock);

  res.status(201).json({
    status: "success",
    data: {
      availabilityBlock,
    },
  });
});

exports.deleteRoomBlock = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const availabilityBlock = await prisma.availabilityBlock.findFirst({
    where: {
      id: req.params.blockId,
      roomId: req.params.id,
    },
  });

  if (!availabilityBlock) {
    return next(new AppError("Availability block not found", 404));
  }

  await prisma.availabilityBlock.delete({
    where: { id: req.params.blockId },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.listRoomBlocks = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const availabilityBlocks = await prisma.availabilityBlock.findMany({
    where: { roomId: req.params.id },
    orderBy: { startDate: "asc" },
  });

  availabilityBlocks.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: availabilityBlocks.length,
    data: {
      availabilityBlocks,
      blocks: availabilityBlocks,
    },
  });
});

exports.addRoomImage = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  if (req.body.isCover === true) {
    await prisma.roomImage.updateMany({
      where: { roomId: req.params.id },
      data: { isCover: false },
    });
  }

  const roomImage = await prisma.roomImage.create({
    data: {
      roomId: req.params.id,
      url: req.body.url,
      altText: req.body.altText || null,
      isCover: Boolean(req.body.isCover),
      sortOrder: Number.isFinite(Number(req.body.sortOrder))
        ? Number(req.body.sortOrder)
        : 0,
    },
  });

  mapId(roomImage);

  res.status(201).json({
    status: "success",
    data: { roomImage },
  });
});

exports.updateRoomImage = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomImage = await prisma.roomImage.findFirst({
    where: { id: req.params.imageId, roomId: req.params.id },
  });

  if (!roomImage) {
    return next(new AppError("Room image not found", 404));
  }

  if (req.body.isCover === true) {
    await prisma.roomImage.updateMany({
      where: { roomId: req.params.id, id: { not: req.params.imageId } },
      data: { isCover: false },
    });
  }

  const updates = {};
  ["url", "altText", "isCover", "sortOrder"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = field === "sortOrder" ? Number(req.body[field]) : req.body[field];
    }
  });

  const updatedRoomImage = await prisma.roomImage.update({
    where: { id: roomImage.id },
    data: updates,
  });

  mapId(updatedRoomImage);

  res.status(200).json({
    status: "success",
    data: { roomImage: updatedRoomImage },
  });
});

exports.deleteRoomImage = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomImage = await prisma.roomImage.findFirst({
    where: { id: req.params.imageId, roomId: req.params.id },
  });

  if (!roomImage) {
    return next(new AppError("Room image not found", 404));
  }

  await prisma.roomImage.delete({ where: { id: roomImage.id } });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getRoomAvailability = catchAsync(async (req, res, next) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      occupancyRule: true,
      accommodation: {
        select: {
          timezone: true,
          checkInOutRules: true,
        },
      },
      seasonalRates: true,
    },
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const timezone = getRoomTimezone(room);
  const stayDates = normalizeStayDates(
    req.query.checkIn || req.query.from,
    req.query.checkOut || req.query.to,
    timezone
  );

  const [bookings, availabilityBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId: req.params.id,
        status: { notIn: BOOKING_CANCELLED_STATUSES },
        checkIn: { lt: stayDates.checkOut },
        checkOut: { gt: stayDates.checkIn },
      },
      select: { checkIn: true, checkOut: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        roomId: req.params.id,
        startDate: { lt: stayDates.checkOut },
        endDate: { gt: stayDates.checkIn },
      },
      select: { startDate: true, endDate: true, reason: true },
      orderBy: { startDate: "asc" },
    }),
  ]);
  const guestCounts = {
    adultCount: Number(req.query.adultCount || req.query.guests || 1),
    childCount: Number(req.query.childCount || 0),
    infantCount: Number(req.query.infantCount || 0),
  };
  const violations = [
    ...collectRuleViolations(room, stayDates, guestCounts),
    ...(bookings.length
      ? [createViolation("DATE_CONFLICT", "Selected dates overlap an existing booking", 409)]
      : []),
    ...(availabilityBlocks.length
      ? [createViolation("DATE_BLOCKED", "Selected dates are blocked by the provider", 409)]
      : []),
  ];
  const pricingBreakdown = resolvePriceBreakdown(
    room,
    stayDates.checkInDateString,
    stayDates.checkOutDateString
  );

  res.status(200).json({
    status: "success",
    data: {
      isAvailable: violations.length === 0,
      violations: violations.map(({ code, message }) => ({ code, message })),
      timezone,
      currentDate: toLocalDateString(new Date(), timezone),
      checkInDate: stayDates.checkInDateString,
      checkOutDate: stayDates.checkOutDateString,
      bookedRanges: bookings.map((booking) => ({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        checkInDate: toLocalDateString(booking.checkIn, timezone),
        checkOutDate: toLocalDateString(booking.checkOut, timezone),
      })),
      blockedRanges: availabilityBlocks.map((availabilityBlock) => ({
        startDate: availabilityBlock.startDate,
        endDate: availabilityBlock.endDate,
        startDateString: toLocalDateString(availabilityBlock.startDate, timezone),
        endDateString: toLocalDateString(availabilityBlock.endDate, timezone),
        reason: availabilityBlock.reason || "",
      })),
      pricingBreakdown,
      totalPrice: sumPricingBreakdown(pricingBreakdown),
      nights: stayDates.nights,
      minNights: room.minNights,
      maxNights: room.maxNights,
    },
  });
});

exports.getRoomCalendar = catchAsync(async (req, res, next) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return next(new AppError("year must be a valid YYYY integer", 400));
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return next(new AppError("month must be an integer from 1 to 12", 400));
  }

  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      seasonalRates: true,
      accommodation: {
        select: {
          timezone: true,
          checkInOutRules: {
            select: {
              checkInFrom: true,
              checkOutBy: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const timezone = getRoomTimezone(room);
  const monthStartString = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const monthEndString = nextMonthDate.toISOString().slice(0, 10);
  const monthStayDates = normalizeStayDates(monthStartString, monthEndString, timezone);
  const monthStart = monthStayDates.checkIn;
  const monthEnd = monthStayDates.checkOut;

  const [bookings, availabilityBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId: req.params.id,
        status: { notIn: BOOKING_CANCELLED_STATUSES },
        checkIn: { lt: monthEnd },
        checkOut: { gt: monthStart },
      },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        roomId: req.params.id,
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      select: { startDate: true, endDate: true },
    }),
  ]);
  const unavailableDateSet = new Set();

  bookings.forEach((booking) => {
    expandDateRange(booking.checkIn, booking.checkOut, timezone).forEach((date) => {
      if (date >= monthStartString && date < monthEndString) {
        unavailableDateSet.add(date);
      }
    });
  });

  availabilityBlocks.forEach((availabilityBlock) => {
    expandDateRange(availabilityBlock.startDate, availabilityBlock.endDate, timezone).forEach((date) => {
      if (date >= monthStartString && date < monthEndString) {
        unavailableDateSet.add(date);
      }
    });
  });

  if (room.status !== "AVAILABLE") {
    resolvePriceBreakdown(room, monthStartString, monthEndString).forEach((night) => {
      unavailableDateSet.add(night.date);
    });
  }

  const pricingByDate = resolvePriceBreakdown(room, monthStartString, monthEndString).reduce(
    (prices, night) => {
      prices[night.date] = night.pricePerNight;
      return prices;
    },
    {}
  );

  res.status(200).json({
    status: "success",
    data: {
      year,
      month,
      timezone,
      currentDate: toLocalDateString(new Date(), timezone),
      unavailableDates: Array.from(unavailableDateSet).sort(),
      pricingByDate,
      minNights: room.minNights,
      maxNights: room.maxNights,
      checkInFrom: room.accommodation?.checkInOutRules?.checkInFrom || null,
      checkOutBy: room.accommodation?.checkInOutRules?.checkOutBy || null,
    },
  });
});

const RATE_TYPES = new Set(["SEASONAL", "WEEKEND", "WEEKDAY", "HOLIDAY", "LONG_STAY"]);
const FEE_TYPES = new Set(["CLEANING", "LINEN", "PET", "OTHER"]);
const TAX_APPLIES_TO = new Set(["SUBTOTAL", "CLEANING", "ALL"]);

const parseOptionalDate = (value, label) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const parsePositiveNumber = (value, label) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be greater than 0`, 400);
  }

  return parsed;
};

const parseOptionalInteger = (value, label, defaultValue = undefined) => {
  if (value == null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const parseBoolean = (value, defaultValue = false) => {
  if (value == null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const parseDaysOfWeek = (value) => {
  if (value == null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new AppError("daysOfWeek must be an array", 400);
  }

  const days = value.map(Number);

  if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new AppError("daysOfWeek values must be integers from 0 to 6", 400);
  }

  return days;
};

const buildSeasonalRateData = (body, { isUpdate = false } = {}) => {
  const data = {};

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "label")) {
    if (!body.label) {
      throw new AppError("label is required", 400);
    }
    data.label = String(body.label);
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "rateType")) {
    const rateType = normalizeEnumInput(body.rateType);
    if (!RATE_TYPES.has(rateType)) {
      throw new AppError("Invalid RateType", 400);
    }
    data.rateType = rateType;
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "pricePerNight")) {
    data.pricePerNight = parsePositiveNumber(body.pricePerNight, "pricePerNight");
  }

  const hasStartDate = Object.prototype.hasOwnProperty.call(body, "startDate");
  const hasEndDate = Object.prototype.hasOwnProperty.call(body, "endDate");
  if (hasStartDate || hasEndDate) {
    const startDate = parseOptionalDate(body.startDate, "startDate");
    const endDate = parseOptionalDate(body.endDate, "endDate");

    if (startDate && !endDate) {
      throw new AppError("endDate is required when startDate is provided", 400);
    }

    if (startDate && endDate && endDate <= startDate) {
      throw new AppError("endDate must be after startDate", 400);
    }

    if (hasStartDate) {
      data.startDate = startDate;
    }
    if (hasEndDate) {
      data.endDate = endDate;
    }
  }

  const daysOfWeek = parseDaysOfWeek(body.daysOfWeek);
  if (daysOfWeek !== undefined) {
    data.daysOfWeek = daysOfWeek;
  } else if (!isUpdate) {
    data.daysOfWeek = [];
  }

  if (Object.prototype.hasOwnProperty.call(body, "minNightsToApply")) {
    data.minNightsToApply = Math.max(
      1,
      parseOptionalInteger(body.minNightsToApply, "minNightsToApply", 1)
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    data.priority = parseOptionalInteger(body.priority, "priority", 0);
  }

  return data;
};

const buildRoomFeeData = (body, { isUpdate = false } = {}) => {
  const data = {};

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "feeType")) {
    const feeType = normalizeEnumInput(body.feeType);
    if (!FEE_TYPES.has(feeType)) {
      throw new AppError("Invalid FeeType", 400);
    }
    data.feeType = feeType;
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "label")) {
    if (!body.label) {
      throw new AppError("label is required", 400);
    }
    data.label = String(body.label);
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "amount")) {
    data.amount = parsePositiveNumber(body.amount, "amount");
  }

  if (Object.prototype.hasOwnProperty.call(body, "currency")) {
    data.currency = String(body.currency || "USD").toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(body, "isPerStay")) {
    data.isPerStay = parseBoolean(body.isPerStay, true);
  }

  if (Object.prototype.hasOwnProperty.call(body, "isOptional")) {
    data.isOptional = parseBoolean(body.isOptional, false);
  }

  return data;
};

const ensureProviderOwnsAccommodation = async (accommodationId, userId) => {
  const accommodation = await prisma.accommodation.findFirst({
    where: { id: accommodationId, deletedAt: null },
  });

  if (!accommodation) {
    throw new AppError("Accommodation not found", 404);
  }

  if (accommodation.ownerId !== userId.toString()) {
    throw new AppError("You do not own this accommodation", 403);
  }

  return accommodation;
};

exports.listSeasonalRates = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const seasonalRates = await prisma.seasonalRate.findMany({
    where: { roomId: req.params.id },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  seasonalRates.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: seasonalRates.length,
    data: { seasonalRates },
  });
});

exports.createSeasonalRate = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const seasonalRate = await prisma.seasonalRate.create({
    data: {
      roomId: req.params.id,
      ...buildSeasonalRateData(req.body),
    },
  });

  mapId(seasonalRate);

  res.status(201).json({
    status: "success",
    data: { seasonalRate },
  });
});

exports.updateSeasonalRate = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const seasonalRate = await prisma.seasonalRate.findFirst({
    where: { id: req.params.rateId, roomId: req.params.id },
  });

  if (!seasonalRate) {
    return next(new AppError("Seasonal rate not found", 404));
  }

  const updatedSeasonalRate = await prisma.seasonalRate.update({
    where: { id: seasonalRate.id },
    data: buildSeasonalRateData(req.body, { isUpdate: true }),
  });

  mapId(updatedSeasonalRate);

  res.status(200).json({
    status: "success",
    data: { seasonalRate: updatedSeasonalRate },
  });
});

exports.deleteSeasonalRate = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const seasonalRate = await prisma.seasonalRate.findFirst({
    where: { id: req.params.rateId, roomId: req.params.id },
  });

  if (!seasonalRate) {
    return next(new AppError("Seasonal rate not found", 404));
  }

  await prisma.seasonalRate.delete({ where: { id: seasonalRate.id } });

  res.status(204).json({ status: "success", data: null });
});

exports.listRoomFees = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomFees = await prisma.roomFee.findMany({
    where: { roomId: req.params.id },
    orderBy: { createdAt: "desc" },
  });

  roomFees.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: roomFees.length,
    data: { roomFees },
  });
});

exports.createRoomFee = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomFee = await prisma.roomFee.create({
    data: {
      roomId: req.params.id,
      ...buildRoomFeeData(req.body),
    },
  });

  mapId(roomFee);

  res.status(201).json({
    status: "success",
    data: { roomFee },
  });
});

exports.updateRoomFee = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomFee = await prisma.roomFee.findFirst({
    where: { id: req.params.feeId, roomId: req.params.id },
  });

  if (!roomFee) {
    return next(new AppError("Room fee not found", 404));
  }

  const updatedRoomFee = await prisma.roomFee.update({
    where: { id: roomFee.id },
    data: buildRoomFeeData(req.body, { isUpdate: true }),
  });

  mapId(updatedRoomFee);

  res.status(200).json({
    status: "success",
    data: { roomFee: updatedRoomFee },
  });
});

exports.deleteRoomFee = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const roomFee = await prisma.roomFee.findFirst({
    where: { id: req.params.feeId, roomId: req.params.id },
  });

  if (!roomFee) {
    return next(new AppError("Room fee not found", 404));
  }

  await prisma.roomFee.delete({ where: { id: roomFee.id } });

  res.status(204).json({ status: "success", data: null });
});

exports.getAccommodationTax = catchAsync(async (req, res) => {
  await ensureProviderOwnsAccommodation(req.params.id, getUserId(req.user));

  const taxRule = await prisma.taxRule.findUnique({
    where: { accommodationId: req.params.id },
  });

  mapId(taxRule);

  res.status(200).json({
    status: "success",
    data: { taxRule },
  });
});

exports.upsertAccommodationTax = catchAsync(async (req, res) => {
  await ensureProviderOwnsAccommodation(req.params.id, getUserId(req.user));

  const percentage = Number(req.body.percentage);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new AppError("percentage must be between 0 and 100", 400);
  }

  const appliesTo = normalizeEnumInput(req.body.appliesTo) || "SUBTOTAL";
  if (!TAX_APPLIES_TO.has(appliesTo)) {
    throw new AppError("Invalid TaxAppliesTo", 400);
  }

  const data = {
    label: req.body.label || "Tax",
    percentage,
    isInclusive: parseBoolean(req.body.isInclusive, false),
    appliesTo,
  };

  const taxRule = await prisma.taxRule.upsert({
    where: { accommodationId: req.params.id },
    create: {
      accommodationId: req.params.id,
      ...data,
    },
    update: data,
  });

  mapId(taxRule);

  res.status(200).json({
    status: "success",
    data: { taxRule },
  });
});

exports.getOccupancyPricingRule = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const occupancyPricingRule = await prisma.occupancyPricingRule.findUnique({
    where: { roomId: req.params.id },
  });

  res.status(200).json({
    status: "success",
    data: { occupancyPricingRule: occupancyPricingRule || null },
  });
});

exports.upsertOccupancyPricingRule = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const baseGuestCount = Number(req.body.baseGuestCount);
  const extraGuestFeePerNight = Number(req.body.extraGuestFeePerNight);

  if (!Number.isInteger(baseGuestCount) || baseGuestCount < 1) {
    return next(new AppError("baseGuestCount must be a positive integer", 400));
  }

  if (!Number.isFinite(extraGuestFeePerNight) || extraGuestFeePerNight < 0) {
    return next(new AppError("extraGuestFeePerNight must be a positive number", 400));
  }

  const occupancyPricingRule = await prisma.occupancyPricingRule.upsert({
    where: { roomId: req.params.id },
    create: {
      roomId: req.params.id,
      baseGuestCount,
      extraGuestFeePerNight,
    },
    update: {
      baseGuestCount,
      extraGuestFeePerNight,
    },
  });

  mapId(occupancyPricingRule);

  res.status(200).json({
    status: "success",
    data: { occupancyPricingRule },
  });
});

exports.deleteOccupancyPricingRule = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  await prisma.occupancyPricingRule.deleteMany({
    where: { roomId: req.params.id },
  });

  res.status(204).json({ status: "success", data: null });
});
