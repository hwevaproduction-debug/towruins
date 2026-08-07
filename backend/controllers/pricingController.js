const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { computeQuote } = require("../utils/pricingEngine");
const { findBestPromotion, validateCoupon } = require("../utils/promotionService");
const listingConfig = require("../utils/listingConfig");

const ROOM_PRICING_INCLUDE = {
  seasonalRates: true,
  fees: true,
  occupancyPricingRule: true,
  accommodation: {
    select: { commissionRate: true, taxRule: true, timezone: true },
  },
};

exports.getRestorationConfig = catchAsync(async (req, res, next) => {
  const durations = listingConfig.getRestorationDurations();
  const minTokensPerDay = listingConfig.getMinTokensPerDay();

  res.status(200).json({
    status: "success",
    data: {
      durations,
      minTokensPerDay,
    },
  });
});

exports.getPricingQuote = catchAsync(async (req, res, next) => {
  const {
    roomId,
    checkIn,
    checkOut,
    adultCount = 1,
    childCount = 0,
    infantCount = 0,
    couponCode,
  } = req.body;

  if (!roomId || !checkIn || !checkOut) {
    return next(new AppError("roomId, checkIn, checkOut are required", 400));
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: ROOM_PRICING_INCLUDE,
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const quote = await computeQuote({
    room,
    checkIn,
    checkOut,
    adultCount: Number(adultCount),
    childCount: Number(childCount),
    infantCount: Number(infantCount),
    couponCode,
  });

  res.status(200).json({ status: "success", data: { quote } });
});

exports.validateCoupon = catchAsync(async (req, res, next) => {
  const {
    roomId,
    couponCode,
    checkIn,
    checkOut,
    adultCount = 1,
    childCount = 0,
  } = req.body;

  if (!roomId || !couponCode || !checkIn || !checkOut) {
    return next(new AppError("roomId, couponCode, checkIn, checkOut are required", 400));
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: ROOM_PRICING_INCLUDE,
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const baseQuote = await computeQuote({
    room,
    checkIn,
    checkOut,
    adultCount: Number(adultCount),
    childCount: Number(childCount),
    infantCount: 0,
  });
  const subtotalCents = Math.round(baseQuote.subtotal * 100);
  const bestPromotion = await findBestPromotion(
    room,
    checkIn,
    checkOut,
    baseQuote.nights,
    subtotalCents
  );
  const result = await validateCoupon(couponCode, room, baseQuote.nights, subtotalCents, {
    checkIn,
    checkOut,
  });

  if (bestPromotion?.promotion && !result.promotion.stackable) {
    return next(new AppError("Coupon cannot be combined with current promotion", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      valid: true,
      discount: {
        type: result.promotion.discountType,
        value: Number(result.promotion.discountValue),
        label: result.promotion.name,
        amount: Number((result.discountCents / 100).toFixed(2)),
      },
    },
  });
});
