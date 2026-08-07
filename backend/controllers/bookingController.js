const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { toLocalDateString } = require("../utils/dateUtils");
const { getProvider, getProviderByName } = require("../utils/paymentProvider");
const { computeQuote } = require("../utils/pricingEngine");
const { incrementUseCount } = require("../utils/promotionService");
const {
  computeBookingFinancials,
  computeCancellationFee,
  computeRefundAmount,
  snapshotCancellationPolicy,
} = require("../utils/bookingService");
const {
  BOOKING_CANCELLED_STATUSES,
  collectRuleViolations,
  createViolation,
  getRoomTimezone,
  normalizeStayDates,
  throwViolation,
} = require("../utils/reservationRules");
const notificationService = require("../utils/notificationService");

const SETTLEMENT_INELIGIBLE_STATUSES = [...BOOKING_CANCELLED_STATUSES, "SETTLED"];

const parseDate = (value, label) => {
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

const mapBooking = (booking) => {
  if (!booking) {
    return booking;
  }

  mapId(booking);
  mapId(booking.room);
  mapId(booking.guest);
  mapId(booking.guestInfo);
  mapId(booking.feeSnapshot);
  if (Array.isArray(booking.payments)) {
    booking.payments.forEach(mapId);
  }
  const timezone = getRoomTimezone(booking.room);

  booking.timezone = timezone;
  if (booking.room) {
    booking.room.timezone = booking.room.timezone || timezone;
  }
  if (booking.checkIn) {
    booking.checkInDate = toLocalDateString(booking.checkIn, timezone);
  }
  if (booking.checkOut) {
    booking.checkOutDate = toLocalDateString(booking.checkOut, timezone);
  }

  return booking;
};

const getUserPhone = (user, explicitPhone) =>
  explicitPhone || user?.phone || user?.phoneNumber || null;

const getRoomOwnerIdentity = (room) =>
  [room?.providerId, room?.accommodation?.ownerId, room?.provider, room?.owner, room?.user]
    .filter(Boolean)
    .map((value) => value.toString());

const getBookingMode = (room, booking) =>
  normalizeEnumInput(
    booking?.bookingMode ||
      room?.bookingMode ||
      room?.bookingSettings?.mode ||
      room?.settings?.bookingMode
  ) || "REQUEST";

const isBookingConflictError = (err) => {
  const message = String(err?.message || "");

  return (
    err?.code === "P2034" ||
    err?.code === "P2004" ||
    message.includes("no_overlapping_bookings") ||
    message.toLowerCase().includes("exclusion constraint")
  );
};

const normalizeCount = (value, label, minValue, defaultValue) => {
  const rawValue = value ?? defaultValue;

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const normalizedValue = Number(rawValue);

  if (!Number.isInteger(normalizedValue) || normalizedValue < minValue) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return normalizedValue;
};

const normalizeGuestCounts = (body) => ({
  adultCount: normalizeCount(body.adultCount ?? body.guestCount ?? body.guests, "adultCount", 1, 1),
  childCount: normalizeCount(body.childCount, "childCount", 0, 0),
  infantCount: normalizeCount(body.infantCount, "infantCount", 0, 0),
});

const ensureRoomAvailability = async (roomId, checkIn, checkOut) => {
  const [bookingOverlap, blockedOverlap] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        roomId,
        status: { notIn: BOOKING_CANCELLED_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    }),
    prisma.availabilityBlock.findFirst({
      where: {
        roomId,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
    }),
  ]);

  if (bookingOverlap || blockedOverlap) {
    throw new AppError("Selected dates are not available", 409);
  }
};

const populateBookings = async (where) => {
  const bookings = await prisma.booking.findMany({
    where,
    include: bookingRelationInclude,
    orderBy: { createdAt: "desc" },
  });

  bookings.forEach(mapBooking);
  return bookings;
};

const ensureBookingOwner = (booking, userId) => {
  if (!booking || booking.guestId !== userId.toString()) {
    throw new AppError("You do not own this booking", 403);
  }
};

const ensureProviderOwnsBooking = (booking, userId) => {
  const ownerIds = getRoomOwnerIdentity(booking.room);

  if (!ownerIds.includes(userId.toString())) {
    throw new AppError("You do not own this stay", 403);
  }
};

const resolveProviderEmail = async (room) => {
  const [providerId] = getRoomOwnerIdentity(room);

  if (!providerId) {
    return null;
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
      providerProfile: true,
    },
  });

  return mapId(provider);
};

const getPaymentMethod = () => String(process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();

const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const getRefundablePaymentAmount = (payment) => {
  const paidAmount =
    payment?.amountPaid === undefined || payment?.amountPaid === null
      ? Number(payment?.amountDue || payment?.amount || 0)
      : Number(payment.amountPaid);

  return Number.isFinite(paidAmount) && paidAmount > 0 ? roundCurrency(paidAmount) : 0;
};

const getSuccessfulRefundablePayments = (payments = []) =>
  payments
    .filter((payment) => payment.status === "success")
    .filter((payment) => getRefundablePaymentAmount(payment) > 0)
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

const issueBookingRefunds = async ({ booking, payments, amount, reason, initiatedBy }) => {
  const refundAmount = roundCurrency(amount);

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new AppError("Refund amount is invalid", 400);
  }

  const refundablePayments = getSuccessfulRefundablePayments(payments);

  if (refundablePayments.length === 0) {
    throw new AppError("No successful payment found for this booking", 400);
  }

  const totalRefundable = roundCurrency(
    refundablePayments.reduce((total, payment) => total + getRefundablePaymentAmount(payment), 0)
  );

  if (totalRefundable < refundAmount) {
    throw new AppError("Refund amount exceeds the refundable payment balance", 400);
  }

  const refunds = [];
  let remainingAmount = refundAmount;

  for (const payment of refundablePayments) {
    if (remainingAmount <= 0) {
      break;
    }

    const paidAmount = getRefundablePaymentAmount(payment);
    const paymentRefundAmount = roundCurrency(Math.min(paidAmount, remainingAmount));

    if (paymentRefundAmount <= 0) {
      continue;
    }

    const provider = getProviderByName(payment.method);
    const refundResult = await provider.issueRefund(
      payment,
      paymentRefundAmount,
      reason || "refund"
    );
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        bookingId: booking.id,
        amount: paymentRefundAmount,
        reason: reason || null,
        status: refundResult.status,
        providerRefId: refundResult.providerRefId || null,
        initiatedBy,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amountPaid: roundCurrency(Math.max(0, paidAmount - paymentRefundAmount)),
      },
    });

    refunds.push(refund);
    remainingAmount = roundCurrency(remainingAmount - paymentRefundAmount);
  }

  if (remainingAmount > 0) {
    throw new AppError("Refund amount could not be fully applied", 400);
  }

  return refunds;
};

const bookingRelationInclude = {
  room: {
    include: {
      occupancyRule: true,
      accommodation: {
        select: { ownerId: true, timezone: true },
      },
    },
  },
  guest: {
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      avatar: true,
    },
  },
  guestInfo: true,
  feeSnapshot: true,
};

const bookingDetailInclude = {
  ...bookingRelationInclude,
  payments: true,
};

exports.createBooking = catchAsync(async (req, res, next) => {
  const roomId = req.body.room || req.body.roomId;
  const { checkIn: rawCheckIn, checkOut: rawCheckOut } = req.body;

  if (!roomId) {
    return next(new AppError("room is required", 400));
  }

  let booking;
  let quote;

  try {
    booking = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE`;

        const room = await tx.room.findUnique({
          where: { id: roomId },
          include: {
            occupancyRule: true,
            fees: true,
            occupancyPricingRule: true,
            accommodation: {
              select: {
                ownerId: true,
                timezone: true,
                checkInOutRules: true,
                cancellationPolicy: true,
                commissionRate: true,
                taxRule: true,
              },
            },
            provider: {
              select: {
                id: true,
                providerProfile: true,
              },
            },
            seasonalRates: true,
          },
        });

        if (!room) {
          throw new AppError("Stay not found", 404);
        }

        if (room.provider?.providerProfile?.suspendedAt) {
          throw new AppError("This provider is currently suspended", 403);
        }

        const timezone = getRoomTimezone(room);
        const stayDates = normalizeStayDates(rawCheckIn, rawCheckOut, timezone);
        const guestCounts = normalizeGuestCounts(req.body);
        const ruleViolation = collectRuleViolations(room, stayDates, guestCounts)[0];

        if (ruleViolation) {
          throwViolation(ruleViolation);
        }

        const bookingOverlap = await tx.booking.findFirst({
          where: {
            roomId: room.id,
            status: { notIn: BOOKING_CANCELLED_STATUSES },
            checkIn: { lt: stayDates.checkOut },
            checkOut: { gt: stayDates.checkIn },
          },
          select: { id: true },
        });

        if (bookingOverlap) {
          throwViolation(
            createViolation("DATE_CONFLICT", "Selected dates overlap an existing booking", 409)
          );
        }

        const blockedOverlap = await tx.availabilityBlock.findFirst({
          where: {
            roomId: room.id,
            startDate: { lt: stayDates.checkOut },
            endDate: { gt: stayDates.checkIn },
          },
          select: { id: true },
        });

        if (blockedOverlap) {
          throwViolation(
            createViolation("DATE_BLOCKED", "Selected dates are blocked by the provider", 409)
          );
        }

        quote = await computeQuote({
          room,
          checkIn: stayDates.checkIn,
          checkOut: stayDates.checkOut,
          adultCount: guestCounts.adultCount,
          childCount: guestCounts.childCount,
          infantCount: guestCounts.infantCount,
          couponCode: req.body.couponCode || null,
          prismaClient: tx,
        });
        const bookingMode = getBookingMode(room);
        const cancellationPolicySnapshot = snapshotCancellationPolicy(room.accommodation);
        const commissionRate = Number(room.accommodation?.commissionRate || 0);
        const financials = computeBookingFinancials(quote.grandTotal, commissionRate);

        const newBooking = await tx.booking.create({
          data: {
            roomId: room.id,
            guestId: getUserId(req.user),
            checkIn: stayDates.checkIn,
            checkOut: stayDates.checkOut,
            bookingMode,
            providerId: room.providerId || room.accommodation?.ownerId || null,
            nights: quote.nights,
            pricePerNight: quote.nightlyBreakdown[0]?.pricePerNight ?? 0,
            subtotal: quote.subtotal,
            totalPrice: quote.grandTotal,
            cleaningFee: quote.cleaningFee,
            taxAmount: quote.taxAmount,
            discountAmount: quote.promotionDiscount + quote.couponDiscount,
            couponCode: quote.appliedCoupon?.code ?? null,
            promotionId: quote.appliedPromotion?.id ?? null,
            commissionRate,
            commissionAmount: financials.commissionAmount,
            netPayout: financials.netPayout,
            status: bookingMode === "INSTANT" ? "PENDING_PAYMENT" : "PENDING_CONFIRMATION",
            paymentStatus: "UNPAID",
            specialRequests: req.body.specialRequests || "",
            adultCount: guestCounts.adultCount,
            childCount: guestCounts.childCount,
            infantCount: guestCounts.infantCount,
            cancellationPolicySnapshot,
          },
        });

        await tx.bookingFeeSnapshot.create({
          data: {
            bookingId: newBooking.id,
            lineItems: quote.lineItems,
            subtotal: quote.subtotal,
            discountAmount: quote.promotionDiscount + quote.couponDiscount,
            taxAmount: quote.taxAmount,
            grandTotal: quote.grandTotal,
            couponCode: quote.appliedCoupon?.code ?? null,
            promotionId: quote.appliedPromotion?.id ?? null,
          },
        });

        if (quote.appliedCoupon) {
          await incrementUseCount(tx, quote.appliedCoupon.id, quote.appliedPromotion.id);
        }

        return newBooking;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    if (isBookingConflictError(err)) {
      return next(
        new AppError("Selected dates overlap an existing booking", 409, "DATE_CONFLICT")
      );
    }

    throw err;
  }

  const populatedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: bookingRelationInclude,
  });

  mapBooking(populatedBooking);

  const provider = await resolveProviderEmail(populatedBooking.room);
  const emailContext = {
    booking: populatedBooking,
    room: populatedBooking.room,
    guest: populatedBooking.guest,
    provider,
  };

  if (booking.bookingMode === "REQUEST") {
    void notificationService.enqueue("booking.request_submitted", emailContext);
  }

  res.status(201).json({
    status: "success",
    data: {
      booking: populatedBooking,
      quote,
    },
  });
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const bookings = await populateBookings({ guestId: getUserId(req.user) });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
      payments: true,
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const userId = getUserId(req.user).toString();
  const isGuestCancellation = booking.guestId === userId;
  const isProviderCancellation = getRoomOwnerIdentity(booking.room).includes(userId);

  if (!isGuestCancellation && !isProviderCancellation) {
    return next(new AppError("You do not own this booking", 403));
  }

  if (BOOKING_CANCELLED_STATUSES.includes(booking.status)) {
    return next(new AppError("Booking is already cancelled", 400));
  }

  const refundAmount = computeRefundAmount(booking, new Date());
  if (refundAmount > 0 && booking.paymentStatus === "PAID") {
    await issueBookingRefunds({
      booking,
      payments: booking.payments,
      amount: refundAmount,
      reason: req.body.reason || "Booking cancellation refund",
      initiatedBy: getUserId(req.user),
    });
  }

  const cumulativeRefundAmount = Number(booking.refundAmount || 0) + Number(refundAmount || 0);
  const totalPrice = Number(booking.totalPrice || 0);
  const refundPaymentStatus =
    totalPrice > 0 && cumulativeRefundAmount >= totalPrice ? "REFUNDED" : "PARTIALLY_REFUNDED";

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledBy: isProviderCancellation ? "PROVIDER" : "GUEST",
      cancelledAt: new Date(),
      refundAmount: cumulativeRefundAmount,
      ...(refundAmount > 0 ? { paymentStatus: refundPaymentStatus } : {}),
    },
    include: bookingRelationInclude,
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue(
    isProviderCancellation ? "booking.cancelled_by_provider" : "booking.cancelled_by_guest",
    {
      booking: updatedBooking,
      room: updatedBooking.room,
      guest: updatedBooking.guest,
      provider,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

exports.getCancellationPreview = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      guestId: true,
      totalPrice: true,
      pricePerNight: true,
      nights: true,
      checkIn: true,
      cancellationPolicySnapshot: true,
    },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (booking.guestId !== getUserId(req.user)) {
    return next(new AppError("Forbidden", 403));
  }

  const cancelledAt = new Date();
  const refundAmount = computeRefundAmount(booking, cancelledAt);
  const cancellationFee = computeCancellationFee(booking, cancelledAt);

  res.status(200).json({
    status: "success",
    data: {
      refundAmount,
      cancellationFee,
      policy: booking.cancellationPolicySnapshot,
    },
  });
});

exports.getProviderBookings = catchAsync(async (req, res) => {
  const accommodations = await prisma.accommodation.findMany({
    where: { ownerId: getUserId(req.user), deletedAt: null },
    select: { id: true },
  });
  const rooms = await prisma.room.findMany({
    where: {
      accommodationId: { in: accommodations.map((accommodation) => accommodation.id) },
      deletedAt: null,
    },
    select: { id: true },
  });

  const roomIds = rooms.map((room) => room.id);
  const bookings = await populateBookings({ roomId: { in: roomIds } });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

exports.confirmBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureProviderOwnsBooking(booking, getUserId(req.user));

  if (booking.status !== "PENDING_CONFIRMATION") {
    return next(new AppError("Booking cannot be confirmed", 400));
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CONFIRMED",
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue("booking.request_accepted", {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider,
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

exports.declineBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureProviderOwnsBooking(booking, getUserId(req.user));

  if (booking.status !== "PENDING_CONFIRMATION") {
    return next(new AppError("Booking cannot be declined", 400));
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "DECLINED",
      cancellationReason: req.body.reason || null,
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue("booking.request_declined", {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider,
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

exports.modifyBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          occupancyRule: true,
          seasonalRates: true,
          fees: true,
          occupancyPricingRule: true,
          accommodation: {
            select: {
              ownerId: true,
              timezone: true,
              cancellationPolicy: true,
              checkInOutRules: true,
              commissionRate: true,
              taxRule: true,
            },
          },
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

  if (!["PENDING_CONFIRMATION", "PENDING_PAYMENT"].includes(booking.status)) {
    return next(new AppError("Booking cannot be modified", 400));
  }

  const rawCheckIn = req.body.checkIn;
  const rawCheckOut = req.body.checkOut;

  let updatedBookings;
  let quote;

  try {
    updatedBookings = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${booking.roomId} FOR UPDATE`;

        const room = await tx.room.findUnique({
          where: { id: booking.roomId },
          include: {
            occupancyRule: true,
            seasonalRates: true,
            fees: true,
            occupancyPricingRule: true,
            accommodation: {
              select: {
                ownerId: true,
                timezone: true,
                cancellationPolicy: true,
                checkInOutRules: true,
                commissionRate: true,
                taxRule: true,
              },
            },
          },
        });

        if (!room) {
          throw new AppError("Stay not found", 404);
        }

        const timezone = getRoomTimezone(room);
        const stayDates = normalizeStayDates(rawCheckIn, rawCheckOut, timezone);
        const guestCounts = normalizeGuestCounts(req.body);
        const ruleViolation = collectRuleViolations(room, stayDates, guestCounts)[0];

        if (ruleViolation) {
          throwViolation(ruleViolation);
        }

        const bookingOverlap = await tx.booking.findFirst({
          where: {
            roomId: booking.roomId,
            id: { not: booking.id },
            status: { notIn: BOOKING_CANCELLED_STATUSES },
            checkIn: { lt: stayDates.checkOut },
            checkOut: { gt: stayDates.checkIn },
          },
          select: { id: true },
        });

        if (bookingOverlap) {
          throwViolation(
            createViolation("DATE_CONFLICT", "Selected dates overlap an existing booking", 409)
          );
        }

        const blockedOverlap = await tx.availabilityBlock.findFirst({
          where: {
            roomId: booking.roomId,
            startDate: { lt: stayDates.checkOut },
            endDate: { gt: stayDates.checkIn },
          },
          select: { id: true },
        });

        if (blockedOverlap) {
          throwViolation(
            createViolation("DATE_BLOCKED", "Selected dates are blocked by the provider", 409)
          );
        }

        const couponCode =
          req.body.couponCode === undefined ? booking.couponCode : req.body.couponCode || null;
        quote = await computeQuote({
          room,
          checkIn: stayDates.checkIn,
          checkOut: stayDates.checkOut,
          adultCount: guestCounts.adultCount,
          childCount: guestCounts.childCount,
          infantCount: guestCounts.infantCount,
          couponCode,
          prismaClient: tx,
        });
        const commissionRate = Number(room.accommodation?.commissionRate || 0);
        const financials = computeBookingFinancials(quote.grandTotal, commissionRate);

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkIn: stayDates.checkIn,
            checkOut: stayDates.checkOut,
            nights: quote.nights,
            pricePerNight: quote.nightlyBreakdown[0]?.pricePerNight ?? 0,
            subtotal: quote.subtotal,
            totalPrice: quote.grandTotal,
            cleaningFee: quote.cleaningFee,
            taxAmount: quote.taxAmount,
            discountAmount: quote.promotionDiscount + quote.couponDiscount,
            couponCode: quote.appliedCoupon?.code ?? null,
            promotionId: quote.appliedPromotion?.id ?? null,
            commissionRate,
            commissionAmount: financials.commissionAmount,
            netPayout: financials.netPayout,
            adultCount: guestCounts.adultCount,
            childCount: guestCounts.childCount,
            infantCount: guestCounts.infantCount,
            specialRequests: req.body.specialRequests ?? booking.specialRequests ?? "",
          },
        });

        await tx.bookingFeeSnapshot.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            lineItems: quote.lineItems,
            subtotal: quote.subtotal,
            discountAmount: quote.promotionDiscount + quote.couponDiscount,
            taxAmount: quote.taxAmount,
            grandTotal: quote.grandTotal,
            couponCode: quote.appliedCoupon?.code ?? null,
            promotionId: quote.appliedPromotion?.id ?? null,
          },
          update: {
            lineItems: quote.lineItems,
            subtotal: quote.subtotal,
            discountAmount: quote.promotionDiscount + quote.couponDiscount,
            taxAmount: quote.taxAmount,
            grandTotal: quote.grandTotal,
            couponCode: quote.appliedCoupon?.code ?? null,
            promotionId: quote.appliedPromotion?.id ?? null,
          },
        });

        if (quote.appliedCoupon && quote.appliedCoupon.code !== booking.couponCode) {
          await incrementUseCount(tx, quote.appliedCoupon.id, quote.appliedPromotion.id);
        }

        return tx.booking.findMany({
          where: { id: booking.id },
          include: bookingRelationInclude,
          orderBy: { createdAt: "desc" },
        });
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    if (isBookingConflictError(err)) {
      return next(
        new AppError("Selected dates overlap an existing booking", 409, "DATE_CONFLICT")
      );
    }

    throw err;
  }

  const updatedBooking = updatedBookings[0];

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
      quote,
    },
  });
});

exports.submitGuestInfo = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    select: { id: true, guestId: true },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureBookingOwner(booking, getUserId(req.user));

  const fullName = String(req.body.fullName || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (!fullName || !phone) {
    return next(new AppError("fullName and phone are required", 400));
  }

  const guestInfo = await prisma.bookingGuestInfo.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      fullName,
      phone,
      nationalId: req.body.nationalId || null,
      estimatedArrivalTime: req.body.estimatedArrivalTime || null,
      additionalNotes: req.body.additionalNotes || null,
    },
    update: {
      fullName,
      phone,
      nationalId: req.body.nationalId || null,
      estimatedArrivalTime: req.body.estimatedArrivalTime || null,
      additionalNotes: req.body.additionalNotes || null,
    },
  });

  mapId(guestInfo);

  res.status(200).json({
    status: "success",
    data: {
      guestInfo,
    },
  });
});

exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: bookingDetailInclude,
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const userId = getUserId(req.user);
  const isGuestOwner = booking.guestId === userId;
  const isProviderOwner = getRoomOwnerIdentity(booking.room).includes(userId?.toString());
  const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";

  if (!isGuestOwner && !isProviderOwner && !isAdmin) {
    return next(new AppError("You do not have access to this booking", 403));
  }

  mapBooking(booking);

  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

exports.getAdminBookings = catchAsync(async (req, res) => {
  const where = {};

  if (req.query.status) {
    where.status = normalizeEnumInput(req.query.status);
  }

  if (req.query.paymentStatus) {
    where.paymentStatus = normalizeEnumInput(req.query.paymentStatus);
  }

  const settlementStatus = normalizeEnumInput(req.query.settlementStatus);
  if (settlementStatus === "SETTLED") {
    where.OR = [{ settlementStatus: "SETTLED" }, { settledAt: { not: null } }];
  } else if (settlementStatus === "PENDING") {
    where.AND = [
      { settlementStatus: { not: "SETTLED" } },
      { settledAt: null },
    ];
  }

  if (req.query.guestId) {
    where.guestId = req.query.guestId;
  }

  if (req.query.roomId) {
    where.roomId = req.query.roomId;
  }

  if (req.query.provider) {
    const accommodations = await prisma.accommodation.findMany({
      where: { ownerId: req.query.provider, deletedAt: null },
      select: { id: true },
    });
    const rooms = await prisma.room.findMany({
      where: {
        accommodationId: { in: accommodations.map((accommodation) => accommodation.id) },
      },
      select: { id: true },
    });

    where.roomId = { in: rooms.map((room) => room.id) };
  }

  if (req.query.dateFrom || req.query.dateTo) {
    const createdAt = {};

    if (req.query.dateFrom) {
      createdAt.gte = parseDate(req.query.dateFrom, "dateFrom");
    }

    if (req.query.dateTo) {
      createdAt.lte = parseDate(req.query.dateTo, "dateTo");
    }

    where.createdAt = createdAt;
  }

  const bookings = await populateBookings(where);

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

exports.settleBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
          },
        },
      },
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (
    booking.settlementStatus === "SETTLED" ||
    booking.settledAt ||
    SETTLEMENT_INELIGIBLE_STATUSES.includes(booking.status)
  ) {
    return next(new AppError("Booking is not eligible for settlement", 400));
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      settlementStatus: "SETTLED",
      settledAt: new Date(),
      settlementReference: req.body.settlementReference || null,
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue("booking.settlement_completed", {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider,
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

exports.initiateBookingPayment = catchAsync(async (req, res, next) => {
  const { bookingId, phone, idempotencyKey } = req.body;
  let paymentIdempotencyKey = idempotencyKey || null;

  if (idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment && existingPayment.status !== "failed") {
      return res.status(200).json({
        status: "success",
        data: {
          transactionRef: existingPayment.transactionRef,
          instructions: "Payment already initiated",
          paymentId: existingPayment.id,
        },
      });
    }

    if (existingPayment?.status === "failed") {
      paymentIdempotencyKey = `${idempotencyKey}-retry-${Date.now()}`;
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
          },
        },
      },
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureBookingOwner(booking, getUserId(req.user));

  if (booking.paymentStatus === "PAID") {
    return next(new AppError("Booking is already paid", 400));
  }

  if (BOOKING_CANCELLED_STATUSES.includes(booking.status)) {
    return next(new AppError("Cancelled bookings cannot be paid", 400));
  }

  mapId(booking);
  mapId(booking.room);

  const amount = Number(booking.totalPrice || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return next(new AppError("Booking amount is invalid", 400));
  }

  const provider = getProvider();
  const result = await provider.initiateBookingPayment(booking, {
    ...req.user,
    _id: getUserId(req.user),
    phone: getUserPhone(req.user, phone),
  });

  const payment = await prisma.payment.create({
    data: {
      type: "booking_payment",
      bookingId: booking.id,
      userId: getUserId(req.user),
      transactionRef: result.transactionRef,
      providerIntentId: result.providerIntentId || null,
      idempotencyKey: paymentIdempotencyKey,
      status: "pending",
      method: getPaymentMethod(),
      amount,
      amountDue: amount,
      currency: "USD",
      providerMeta: result.providerMeta || null,
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentRef: result.transactionRef,
      paymentStatus: "PENDING",
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      transactionRef: result.transactionRef,
      instructions: result.instructions,
      paymentId: payment.id,
    },
  });
});

exports.initiatePartialPayment = catchAsync(async (req, res, next) => {
  const { phone, idempotencyKey } = req.body;
  const amount = Number.parseFloat(req.body.amount);
  let paymentIdempotencyKey = idempotencyKey || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return next(new AppError("Partial payment amount is invalid", 400));
  }

  if (idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment && existingPayment.status !== "failed") {
      return res.status(200).json({
        status: "success",
        data: {
          transactionRef: existingPayment.transactionRef,
          instructions: "Payment already initiated",
          paymentId: existingPayment.id,
        },
      });
    }

    if (existingPayment?.status === "failed") {
      paymentIdempotencyKey = `${idempotencyKey}-retry-${Date.now()}`;
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
          },
        },
      },
    },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureBookingOwner(booking, getUserId(req.user));

  if (BOOKING_CANCELLED_STATUSES.includes(booking.status)) {
    return next(new AppError("Cancelled bookings cannot be paid", 400));
  }

  if (booking.paymentStatus === "PAID") {
    return next(new AppError("Booking is already paid", 400));
  }

  const paidAggregate = await prisma.payment.aggregate({
    where: {
      bookingId: booking.id,
      status: "success",
    },
    _sum: {
      amountPaid: true,
    },
  });
  const amountPaid = Number(paidAggregate?._sum?.amountPaid || 0);
  const totalPrice = Number(booking.totalPrice || 0);
  const remainingBalance = Math.max(0, totalPrice - amountPaid);

  if (amount > remainingBalance) {
    return next(new AppError("Partial payment exceeds the remaining balance", 400));
  }

  mapId(booking);
  mapId(booking.room);

  const provider = getProvider();
  const result = await provider.initiatePartialPayment(booking, {
    ...req.user,
    _id: getUserId(req.user),
    phone: getUserPhone(req.user, phone),
  }, amount);

  const payment = await prisma.payment.create({
    data: {
      type: "partial_booking_payment",
      bookingId: booking.id,
      userId: getUserId(req.user),
      transactionRef: result.transactionRef,
      providerIntentId: result.providerIntentId || null,
      idempotencyKey: paymentIdempotencyKey,
      status: "pending",
      method: getPaymentMethod(),
      amount,
      amountDue: amount,
      currency: "USD",
      providerMeta: result.providerMeta || null,
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentRef: result.transactionRef,
      paymentStatus: amountPaid > 0 ? "PARTIALLY_PAID" : "PENDING",
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      transactionRef: result.transactionRef,
      instructions: result.instructions,
      paymentId: payment.id,
      remainingBalance: Math.max(0, remainingBalance - amount),
    },
  });
});

exports.initiateRefund = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
      payments: true,
    },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const userId = getUserId(req.user).toString();
  const isGuestOwner = booking.guestId === userId;
  const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";

  if (!isGuestOwner && !isAdmin) {
    return next(new AppError("You do not own this booking", 403));
  }

  if (!["PAID", "PARTIALLY_PAID"].includes(booking.paymentStatus)) {
    return next(new AppError("Booking is not eligible for a refund", 400));
  }

  const requestedAmount =
    isAdmin && req.body.amount !== undefined ? Number.parseFloat(req.body.amount) : null;
  const refundAmount = requestedAmount || computeRefundAmount(booking, new Date());

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return next(new AppError("Refund amount is invalid", 400));
  }

  const refunds = await issueBookingRefunds({
    booking,
    payments: booking.payments,
    amount: refundAmount,
    reason: req.body.reason || "refund",
    initiatedBy: userId,
  });
  const cumulativeRefundAmount = Number(booking.refundAmount || 0) + refundAmount;
  const totalPrice = Number(booking.totalPrice || 0);
  const paymentStatus = cumulativeRefundAmount >= totalPrice ? "REFUNDED" : "PARTIALLY_REFUNDED";
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus,
      refundAmount: cumulativeRefundAmount,
    },
    include: bookingRelationInclude,
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue("booking.refund_initiated", {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider,
    refundAmount,
    reason: req.body.reason || "refund",
  });

  res.status(200).json({
    status: "success",
    data: {
      refund: refunds[0] || null,
      refunds,
      booking: updatedBooking,
    },
  });
});

exports.checkInBooking = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  ensureProviderOwnsBooking(booking, getUserId(req.user));

  if (booking.status !== "CONFIRMED") {
    return next(new AppError("Booking must be CONFIRMED to check in", 400));
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CHECKED_IN",
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true, timezone: true },
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
    },
  });

  mapBooking(updatedBooking);

  const provider = await resolveProviderEmail(updatedBooking.room);
  void notificationService.enqueue("booking.checked_in", {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider,
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});
