const prisma = require("./prisma");
const notificationService = require("./notificationService");

const BOOKING_PAYMENT_TYPES = ["booking_payment", "partial_booking_payment"];
const LEGACY_NON_BOOKING_PAYMENT_TYPES = [
  "listing_fee",
  "listing_activation",
  "premium_subscription",
  "premium_access",
];

const isLegacyNonBookingPaymentType = (payment) =>
  LEGACY_NON_BOOKING_PAYMENT_TYPES.includes(payment?.type);

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

const getProviderId = (booking) =>
  booking?.room?.providerId || booking?.room?.accommodation?.ownerId || booking?.providerId;

const applyListingPaymentSuccess = async (payment, prismaClient) => {
  const earlyAccess =
    payment?.providerMeta?.earlyAccess === true && process.env.PAYMENT_PROVIDER !== "paynow";

  await prismaClient.listing.update({
    where: { id: payment.listingId },
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
};

const applyPremiumPaymentSuccess = async (payment, prismaClient) => {
  const user = await prismaClient.user.findUnique({
    where: { id: payment.userId },
  });
  const base =
    user?.premiumExpiry && user.premiumExpiry > new Date() ? user.premiumExpiry : new Date();

  await prismaClient.user.update({
    where: { id: payment.userId },
    data: {
      premiumExpiry: new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });
};

const applyBookingPaymentSuccess = async (payment, prismaClient) => {
  const booking = await prismaClient.booking.findUnique({
    where: { id: payment.bookingId },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true },
          },
        },
      },
      guest: {
        select: { id: true, email: true, username: true, phoneNumber: true },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const paidAggregate = await prismaClient.payment.aggregate({
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
  const fullyPaid = totalPrice > 0 && amountPaid >= totalPrice;
  const paymentStatus = fullyPaid ? "PAID" : "PARTIALLY_PAID";
  const shouldConfirmInstantBooking =
    fullyPaid &&
    normalizeEnumInput(booking.status) === "PENDING_PAYMENT" &&
    normalizeEnumInput(booking.room?.bookingMode) === "INSTANT";

  const updatedBooking = await prismaClient.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus,
      paymentRef: payment.transactionRef,
      ...(shouldConfirmInstantBooking ? { status: "CONFIRMED" } : {}),
    },
    include: {
      room: {
        include: {
          accommodation: {
            select: { ownerId: true },
          },
        },
      },
      guest: {
        select: { id: true, email: true, username: true, phoneNumber: true },
      },
    },
  });

  mapId(updatedBooking);
  mapId(updatedBooking.room);
  mapId(updatedBooking.guest);

  const providerId = getProviderId(updatedBooking);
  const bookingProvider = providerId
    ? await prismaClient.user.findUnique({
        where: { id: providerId },
        select: {
          id: true,
          email: true,
          username: true,
          phoneNumber: true,
          providerProfile: true,
        },
      })
    : null;

  mapId(bookingProvider);

  const emailContext = {
    booking: updatedBooking,
    room: updatedBooking.room,
    guest: updatedBooking.guest,
    provider: bookingProvider,
  };

  if (fullyPaid) {
    void notificationService.enqueue("booking.payment_success", emailContext);

    if (shouldConfirmInstantBooking) {
      void notificationService.enqueue("booking.confirmed_instant", emailContext);
    }

    return updatedBooking;
  }

  void notificationService.enqueue("booking.payment_partial", {
    ...emailContext,
    amountPaid,
    remainingBalance: Math.max(0, totalPrice - amountPaid),
  });

  return updatedBooking;
};

const applyPaymentSuccess = async (payment, prismaClient = prisma) => {
  if (!payment) {
    return null;
  }

  if (isLegacyNonBookingPaymentType(payment)) {
    throw new Error("Legacy non-booking payment must be handled manually");
  }

  if (payment.type === "listing_fee" || payment.type === "listing_activation") {
    return applyListingPaymentSuccess(payment, prismaClient);
  }

  if (payment.type === "premium_subscription" || payment.type === "premium_access") {
    return applyPremiumPaymentSuccess(payment, prismaClient);
  }

  if (BOOKING_PAYMENT_TYPES.includes(payment.type)) {
    return applyBookingPaymentSuccess(payment, prismaClient);
  }

  return null;
};

module.exports = {
  applyPaymentSuccess,
  BOOKING_PAYMENT_TYPES,
  LEGACY_NON_BOOKING_PAYMENT_TYPES,
  isLegacyNonBookingPaymentType,
};
