const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const DISPUTE_REASONS = new Set(["refund", "no_show", "property_mismatch", "other"]);

const getUserId = (user) => user?.id || user?._id?.toString();

const getProviderIds = (booking) =>
  [
    booking?.providerId,
    booking?.room?.providerId,
    booking?.room?.accommodation?.ownerId,
  ]
    .filter(Boolean)
    .map(String);

exports.raiseDispute = catchAsync(async (req, res, next) => {
  const bookingId = req.body.bookingId || req.body.booking;
  const reason = String(req.body.reason || "").trim();
  const description = String(req.body.description || "").trim();

  if (!bookingId) {
    return next(new AppError("bookingId is required", 400));
  }

  if (!DISPUTE_REASONS.has(reason)) {
    return next(new AppError("Invalid dispute reason", 400));
  }

  if (!description) {
    return next(new AppError("description is required", 400));
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        select: {
          providerId: true,
          accommodation: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const userId = getUserId(req.user);
  const providerIds = getProviderIds(booking);
  const raisedByRole =
    booking.guestId === userId ? "guest" : providerIds.includes(String(userId)) ? "provider" : null;

  if (!raisedByRole) {
    return next(new AppError("You are not a party to this booking", 403));
  }

  const existingOpenDispute = await prisma.dispute.findFirst({
    where: {
      bookingId: booking.id,
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
  });

  if (existingOpenDispute) {
    return next(new AppError("An open dispute already exists for this booking", 409));
  }

  const dispute = await prisma.dispute.create({
    data: {
      bookingId: booking.id,
      raisedBy: userId,
      raisedByRole,
      reason,
      description,
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      dispute: {
        ...dispute,
        _id: dispute.id,
      },
    },
  });
});
