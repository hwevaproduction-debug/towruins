const { randomBytes } = require("crypto");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const DISCOUNT_TYPES = new Set(["PERCENTAGE", "FIXED"]);

const getUserId = (user) => user?.id || user?._id?.toString();
const isAdmin = (user) => String(user?.role || "").toLowerCase() === "admin";

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

const parseDate = (value, label) => {
  const parsed = new Date(value);

  if (!value || Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const parseOptionalNumber = (value, label, { min = null } = {}) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || (min != null && parsed < min)) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const parseOptionalInteger = (value, label, { min = null } = {}) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || (min != null && parsed < min)) {
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

const fetchRoomForOwnership = async (roomId) =>
  prisma.room.findUnique({
    where: { id: roomId },
    include: {
      accommodation: {
        select: { ownerId: true },
      },
    },
  });

const verifyPromotionScopeAccess = async ({ accommodationId, roomId }, user) => {
  if (isAdmin(user)) {
    return;
  }

  const userId = getUserId(user)?.toString();

  if (roomId) {
    const room = await fetchRoomForOwnership(roomId);

    if (!room) {
      throw new AppError("Room not found", 404);
    }

    const ownerIds = [room.providerId, room.accommodation?.ownerId]
      .filter(Boolean)
      .map((value) => value.toString());

    if (!ownerIds.includes(userId)) {
      throw new AppError("You do not own this room", 403);
    }

    if (accommodationId && room.accommodationId !== accommodationId) {
      throw new AppError("roomId does not belong to accommodationId", 400);
    }

    return;
  }

  if (accommodationId) {
    const accommodation = await prisma.accommodation.findFirst({
      where: { id: accommodationId, deletedAt: null },
    });

    if (!accommodation) {
      throw new AppError("Accommodation not found", 404);
    }

    if (accommodation.ownerId !== userId) {
      throw new AppError("You do not own this accommodation", 403);
    }

    return;
  }

  throw new AppError("Only admins can manage global promotions", 403);
};

const fetchPromotionForAccess = async (promotionId) => {
  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    include: {
      accommodation: { select: { ownerId: true } },
      room: {
        select: {
          providerId: true,
          accommodationId: true,
          accommodation: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!promotion) {
    throw new AppError("Promotion not found", 404);
  }

  return promotion;
};

const verifyPromotionAccess = async (promotion, user) => {
  if (isAdmin(user)) {
    return;
  }

  const userId = getUserId(user)?.toString();
  const ownerIds = [
    promotion.accommodation?.ownerId,
    promotion.room?.providerId,
    promotion.room?.accommodation?.ownerId,
  ]
    .filter(Boolean)
    .map((value) => value.toString());

  if (!ownerIds.includes(userId)) {
    throw new AppError("You do not own this promotion", 403);
  }
};

const buildPromotionData = (body, { isUpdate = false } = {}) => {
  const data = {};

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "name")) {
    if (!body.name) {
      throw new AppError("name is required", 400);
    }
    data.name = String(body.name);
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "discountType")) {
    const discountType = normalizeEnumInput(body.discountType);
    if (!DISCOUNT_TYPES.has(discountType)) {
      throw new AppError("Invalid DiscountType", 400);
    }
    data.discountType = discountType;
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "discountValue")) {
    const discountValue = parseOptionalNumber(body.discountValue, "discountValue", { min: 0.01 });
    data.discountValue = discountValue;
  }

  if (Object.prototype.hasOwnProperty.call(body, "minNights")) {
    data.minNights = parseOptionalInteger(body.minNights, "minNights", { min: 1 }) || 1;
  } else if (!isUpdate) {
    data.minNights = 1;
  }

  if (Object.prototype.hasOwnProperty.call(body, "minSubtotal")) {
    data.minSubtotal = parseOptionalNumber(body.minSubtotal, "minSubtotal", { min: 0 });
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "startDate")) {
    data.startDate = parseDate(body.startDate, "startDate");
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, "endDate")) {
    data.endDate = parseDate(body.endDate, "endDate");
  }

  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw new AppError("endDate must be after startDate", 400);
  }

  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    data.isActive = parseBoolean(body.isActive, true);
  } else if (!isUpdate) {
    data.isActive = true;
  }

  if (Object.prototype.hasOwnProperty.call(body, "stackable")) {
    data.stackable = parseBoolean(body.stackable, false);
  } else if (!isUpdate) {
    data.stackable = false;
  }

  if (Object.prototype.hasOwnProperty.call(body, "maxUses")) {
    data.maxUses = parseOptionalInteger(body.maxUses, "maxUses", { min: 1 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "accommodationId")) {
    data.accommodationId = body.accommodationId || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "roomId")) {
    data.roomId = body.roomId || null;
  }

  return data;
};

exports.listPromotions = catchAsync(async (req, res) => {
  const promotions = await prisma.promotion.findMany({
    include: {
      coupons: true,
    },
    orderBy: { createdAt: "desc" },
  });

  promotions.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: promotions.length,
    data: { promotions },
  });
});

exports.createPromotion = catchAsync(async (req, res) => {
  const data = buildPromotionData(req.body);

  await verifyPromotionScopeAccess(
    { accommodationId: data.accommodationId, roomId: data.roomId },
    req.user
  );

  const promotion = await prisma.promotion.create({ data });

  mapId(promotion);

  res.status(201).json({
    status: "success",
    data: { promotion },
  });
});

exports.updatePromotion = catchAsync(async (req, res) => {
  const existingPromotion = await fetchPromotionForAccess(req.params.id);
  await verifyPromotionAccess(existingPromotion, req.user);

  const data = buildPromotionData(req.body, { isUpdate: true });
  const mergedStartDate = data.startDate || existingPromotion.startDate;
  const mergedEndDate = data.endDate || existingPromotion.endDate;

  if (mergedStartDate && mergedEndDate && mergedEndDate <= mergedStartDate) {
    throw new AppError("endDate must be after startDate", 400);
  }

  await verifyPromotionScopeAccess(
    {
      accommodationId:
        Object.prototype.hasOwnProperty.call(data, "accommodationId")
          ? data.accommodationId
          : existingPromotion.accommodationId,
      roomId: Object.prototype.hasOwnProperty.call(data, "roomId")
        ? data.roomId
        : existingPromotion.roomId,
    },
    req.user
  );

  const promotion = await prisma.promotion.update({
    where: { id: existingPromotion.id },
    data,
  });

  mapId(promotion);

  res.status(200).json({
    status: "success",
    data: { promotion },
  });
});

exports.deactivatePromotion = catchAsync(async (req, res) => {
  const existingPromotion = await fetchPromotionForAccess(req.params.id);
  await verifyPromotionAccess(existingPromotion, req.user);

  const promotion = await prisma.promotion.update({
    where: { id: existingPromotion.id },
    data: { isActive: false },
  });

  mapId(promotion);

  res.status(200).json({
    status: "success",
    data: { promotion },
  });
});

exports.listCoupons = catchAsync(async (req, res) => {
  const promotion = await fetchPromotionForAccess(req.params.id);
  await verifyPromotionAccess(promotion, req.user);

  const coupons = await prisma.coupon.findMany({
    where: { promotionId: promotion.id },
    orderBy: { createdAt: "desc" },
  });

  coupons.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: coupons.length,
    data: { coupons },
  });
});

exports.generateCoupons = catchAsync(async (req, res) => {
  const promotion = await fetchPromotionForAccess(req.params.id);
  await verifyPromotionAccess(promotion, req.user);

  const requestedCount = Number(req.body.count);
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 500) {
    throw new AppError("count must be an integer from 1 to 500", 400);
  }

  const prefix = req.body.prefix ? String(req.body.prefix).trim().toUpperCase() : "";
  const createdCodeSet = new Set();

  while (createdCodeSet.size < requestedCount) {
    const batchSize = requestedCount - createdCodeSet.size;
    const candidateCodes = Array.from({ length: batchSize }, () =>
      `${prefix}${randomBytes(4).toString("hex").toUpperCase()}`
    );

    const uniqueCandidateCodes = [...new Set(candidateCodes)];
    const result = await prisma.coupon.createMany({
      data: uniqueCandidateCodes.map((code) => ({
        code,
        promotionId: promotion.id,
      })),
      skipDuplicates: true,
    });

    if (result.count === 0) {
      continue;
    }

    const insertedCoupons = await prisma.coupon.findMany({
      where: {
        promotionId: promotion.id,
        code: { in: uniqueCandidateCodes },
      },
      select: { code: true },
    });

    insertedCoupons.forEach((coupon) => createdCodeSet.add(coupon.code));
  }

  const coupons = await prisma.coupon.findMany({
    where: {
      promotionId: promotion.id,
      code: { in: Array.from(createdCodeSet) },
    },
    orderBy: { createdAt: "desc" },
  });

  coupons.forEach(mapId);

  res.status(201).json({
    status: "success",
    results: coupons.length,
    data: { coupons },
  });
});
