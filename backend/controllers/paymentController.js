const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { getProviderByName } = require("../utils/paymentProvider");
const walletService = require("../utils/walletService");

const getUserId = (user) => user?.id || user?._id?.toString();

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const getTokenCost = (value, fallback) => {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
};

const getPaymentProvider = (payment) => getProviderByName(payment?.method);
const SANCTIONED_PROVIDER_PAYMENT_TYPES = ["booking_payment", "partial_booking_payment"];

const isSanctionedProviderPaymentType = (payment) =>
  SANCTIONED_PROVIDER_PAYMENT_TYPES.includes(payment?.type);

exports.requireBookingPaymentForProviderActions = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  if (!isSanctionedProviderPaymentType(payment)) {
    return next(new AppError("Provider retry/status is only available for booking payments", 400));
  }

  req.payment = payment;
  next();
});

exports.initiateListingFee = catchAsync(async (req, res, next) => {
  const { listingId } = req.body;
  const earlyAccess = req.body.earlyAccess === true || req.body.earlyAccess === "true";
  const listingTokenCost = getTokenCost(process.env.LISTING_FEE_AMOUNT, 5);

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  if (listing.userId !== getUserId(req.user).toString()) {
    return next(new AppError("Forbidden", 403));
  }

  const canInitiatePayment = ["pending_payment", "inactive", "early_access"].includes(listing.status);

  if (listing.status === "active" && !earlyAccess) {
    return next(new AppError("Listing is already active", 400));
  }

  if (listing.status === "active" ? !earlyAccess : !canInitiatePayment) {
    return next(new AppError("Listing is not awaiting payment", 400));
  }

  let updatedListing;
  let updatedBalance;

  try {
    await prisma.$transaction(async (tx) => {
      updatedBalance = await walletService.deductTokens(
        getUserId(req.user),
        listingTokenCost,
        "listing_activation",
        `Listing activation for ${listing.name}`,
        tx
      );

      updatedListing = await tx.listing.update({
        where: { id: listing.id },
        data: earlyAccess
          ? {
              status: "early_access",
              earlyAccessUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              paymentDeadline: null,
            }
          : {
              status: "active",
              paymentDeadline: null,
            },
      });
    });
  } catch (err) {
    if (err.statusCode === 402) {
      return next(new AppError("Insufficient TR token balance to activate this listing", 402));
    }
    throw err;
  }

  res.status(201).json({
    status: "success",
    data: {
      listing: {
        ...updatedListing,
        _id: updatedListing.id,
      },
      tokenBalance: updatedBalance,
      tokenCost: listingTokenCost,
    },
  });
});

exports.initiateTenantPremium = catchAsync(async (req, res) => {
  const premiumTokenCost = getTokenCost(process.env.TENANT_PREMIUM_AMOUNT, 10);
  const userId = getUserId(req.user);
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new AppError("User not found", 404);
  }

  let updatedUser;
  let updatedBalance;

  try {
    await prisma.$transaction(async (tx) => {
      updatedBalance = await walletService.deductTokens(
        userId,
        premiumTokenCost,
        "premium_access",
        "Tenant premium access",
        tx
      );

      const base =
        currentUser.premiumExpiry && currentUser.premiumExpiry > new Date()
          ? currentUser.premiumExpiry
          : new Date();

      updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          premiumExpiry: new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });
  } catch (err) {
    if (err.statusCode === 402) {
      return res.status(402).json({
        status: "fail",
        message: "Insufficient TR token balance to activate premium membership",
      });
    }
    throw err;
  }

  res.status(201).json({
    status: "success",
    data: {
      user: {
        ...updatedUser,
        _id: updatedUser.id,
      },
      tokenBalance: updatedBalance,
      tokenCost: premiumTokenCost,
    },
  });
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: getUserId(req.user) },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  payments.forEach((payment) => {
    mapId(payment);
    mapId(payment.listing);
  });

  res.status(200).json({
    status: "success",
    results: payments.length,
    data: payments,
  });
});

exports.retryPayment = catchAsync(async (req, res, next) => {
  let payment = req.payment;

  if (!payment) {
    payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });
  }

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  if (!isSanctionedProviderPaymentType(payment)) {
    return next(new AppError("Provider retry/status is only available for booking payments", 400));
  }

  if (payment.userId !== getUserId(req.user)) {
    return next(new AppError("Forbidden", 403));
  }

  if (!["failed", "pending"].includes(payment.status)) {
    return next(new AppError("Payment cannot be retried", 400));
  }

  const maxRetries = Number.parseInt(process.env.MAX_PAYMENT_RETRIES, 10) || 3;

  if (payment.retryCount >= maxRetries) {
    return next(new AppError("Payment retry limit reached", 400));
  }

  const cooldownMinutes = Number.parseInt(process.env.RETRY_COOLDOWN_MINUTES, 10) || 5;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  if (payment.lastRetryAt && Date.now() - new Date(payment.lastRetryAt).getTime() < cooldownMs) {
    return next(new AppError("Payment retry cooldown is still active", 429));
  }

  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { id: true, email: true, phoneNumber: true },
  });

  if (!user) {
    return next(new AppError("Payment user not found", 404));
  }

  const provider = getPaymentProvider(payment);
  const result = await provider.retryPayment(payment, {
    ...user,
    _id: payment.userId,
    phone: req.body.phone || user.phoneNumber,
  });
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionRef: result.transactionRef,
      providerIntentId: result.providerIntentId || payment.providerIntentId || null,
      providerMeta: result.providerMeta || payment.providerMeta || null,
      retryCount: payment.retryCount + 1,
      lastRetryAt: new Date(),
      status: "pending",
      webhookVerified: false,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      transactionRef: updatedPayment.transactionRef,
      instructions: result.instructions,
      paymentId: updatedPayment.id,
    },
  });
});

exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  let payment = req.payment;

  if (!payment) {
    payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });
  }

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  if (!isSanctionedProviderPaymentType(payment)) {
    return next(new AppError("Provider retry/status is only available for booking payments", 400));
  }

  if (payment.userId !== getUserId(req.user)) {
    return next(new AppError("Forbidden", 403));
  }

  res.status(200).json({
    status: "success",
    data: {
      status: payment.status,
      amountPaid: payment.amountPaid,
      amountDue: payment.amountDue,
      retryCount: payment.retryCount,
    },
  });
});
