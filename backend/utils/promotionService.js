const prisma = require("./prisma");
const AppError = require("./appError");

const toNumber = (value) => {
  if (value == null) {
    return 0;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const computeDiscountCents = (promotion, subtotalCents) => {
  if (!promotion) {
    return 0;
  }

  if (promotion.discountType === "PERCENTAGE") {
    return Math.round((subtotalCents * toNumber(promotion.discountValue)) / 100);
  }

  return Math.round(toNumber(promotion.discountValue) * 100);
};

const resolveClient = (options = {}) => {
  const source = options || {};

  if (source.promotion && source.coupon) {
    return source;
  }

  return source.client || source.prismaClient || prisma;
};

const isPromotionUsable = (promotion) =>
  promotion.maxUses == null || Number(promotion.useCount || 0) < Number(promotion.maxUses);

const matchesPromotionScope = (promotion, room) =>
  promotion.roomId === room.id ||
  (promotion.accommodationId != null && promotion.accommodationId === room.accommodationId) ||
  (promotion.roomId == null && promotion.accommodationId == null);

const validatePromotionEligibility = (
  promotion,
  room,
  nights,
  subtotalCents,
  { checkIn, checkOut } = {}
) => {
  if (!promotion?.isActive) {
    throw new AppError("Coupon promotion is inactive", 400);
  }

  if (!isPromotionUsable(promotion)) {
    throw new AppError("Promotion usage limit reached", 400);
  }

  if (checkIn || checkOut) {
    const checkInDate = toDate(checkIn);
    const checkOutDate = toDate(checkOut);

    if (!checkInDate || !checkOutDate) {
      throw new AppError("Invalid stay dates for coupon", 400);
    }

    if (promotion.startDate && toDate(promotion.startDate) > checkInDate) {
      throw new AppError("Coupon is not valid for the selected stay dates", 400);
    }

    if (promotion.endDate && toDate(promotion.endDate) < checkOutDate) {
      throw new AppError("Coupon is not valid for the selected stay dates", 400);
    }
  }

  if (Number(promotion.minNights || 1) > nights) {
    throw new AppError("Coupon minimum stay requirement not met", 400);
  }

  if (promotion.minSubtotal != null && toNumber(promotion.minSubtotal) > subtotalCents / 100) {
    throw new AppError("Coupon minimum subtotal requirement not met", 400);
  }

  if (!matchesPromotionScope(promotion, room)) {
    throw new AppError("Coupon is not valid for this room", 400);
  }
};

exports.findBestPromotion = async (room, checkIn, checkOut, nights, subtotalCents, options = {}) => {
  const client = resolveClient(options);
  const checkInDate = toDate(checkIn);
  const checkOutDate = toDate(checkOut);

  if (!checkInDate || !checkOutDate) {
    return null;
  }

  const scopeOr = [{ roomId: room.id }, { roomId: null, accommodationId: null }];

  if (room.accommodationId) {
    scopeOr.push({ accommodationId: room.accommodationId });
  }

  const promotions = await client.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: checkInDate },
      endDate: { gte: checkOutDate },
      minNights: { lte: nights },
      OR: [
        { minSubtotal: null },
        { minSubtotal: { lte: subtotalCents / 100 } },
      ],
      AND: [
        {
          OR: scopeOr,
        },
      ],
    },
  });

  return promotions.reduce((best, promotion) => {
    if (!isPromotionUsable(promotion)) {
      return best;
    }

    const discountCents = computeDiscountCents(promotion, subtotalCents);

    if (!best || discountCents > best.discountCents) {
      return { promotion, discountCents };
    }

    return best;
  }, null);
};

exports.validateCoupon = async (code, room, nights, subtotalCents, options = {}) => {
  const client = resolveClient(options);
  const coupon = await client.coupon.findUnique({
    where: { code: String(code || "").trim().toUpperCase() },
    include: { promotion: true },
  });

  if (!coupon) {
    throw new AppError("Coupon not found", 400);
  }

  if (!coupon.isActive) {
    throw new AppError("Coupon is inactive", 400);
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError("Coupon has expired", 400);
  }

  if (coupon.maxUses != null && coupon.useCount >= coupon.maxUses) {
    throw new AppError("Coupon usage limit reached", 400);
  }

  validatePromotionEligibility(coupon.promotion, room, nights, subtotalCents, {
    checkIn: options.checkIn,
    checkOut: options.checkOut,
  });

  return {
    coupon,
    promotion: coupon.promotion,
    discountCents: computeDiscountCents(coupon.promotion, subtotalCents),
  };
};

exports.incrementUseCount = async (tx, couponId, promotionId) => {
  const updatedCoupons = await tx.$executeRaw`
    UPDATE "Coupon"
    SET "useCount" = "useCount" + 1
    WHERE "id" = ${couponId}
      AND ("maxUses" IS NULL OR "useCount" < "maxUses")
  `;

  if (Number(updatedCoupons) < 1) {
    throw new AppError("Coupon usage limit reached", 400);
  }

  const updatedPromotions = await tx.$executeRaw`
    UPDATE "Promotion"
    SET "useCount" = "useCount" + 1
    WHERE "id" = ${promotionId}
      AND ("maxUses" IS NULL OR "useCount" < "maxUses")
  `;

  if (Number(updatedPromotions) < 1) {
    throw new AppError("Promotion usage limit reached", 400);
  }
};
