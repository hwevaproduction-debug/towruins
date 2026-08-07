/**
 * Stripe Payment Provider
 *
 * The Stripe client is loaded lazily so mock and Paynow deployments do not
 * require Stripe secrets at process startup.
 */

const AppError = require("../appError");

let stripeClient;

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("Missing STRIPE_SECRET_KEY configuration", 500);
  }

  if (!stripeClient) {
    stripeClient = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const getRecordId = (record) => record?._id || record?.id;

const toCents = (amount) => {
  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new AppError("Invalid payment amount", 400);
  }

  return Math.round(parsedAmount * 100);
};

const getCurrency = () => String(process.env.STRIPE_CURRENCY || "usd").toLowerCase();

const createPaymentIntent = async ({ amount, metadata }) => {
  const intent = await getStripe().paymentIntents.create({
    amount: toCents(amount),
    currency: getCurrency(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    transactionRef: intent.id,
    providerIntentId: intent.id,
    instructions: intent.client_secret,
    providerMeta: {
      clientSecret: intent.client_secret,
      status: intent.status,
    },
  };
};

const mapPaymentIntentStatus = (status) => {
  switch (status) {
    case "succeeded":
      return "paid";
    case "requires_payment_method":
    case "canceled":
      return "failed";
    default:
      return "pending";
  }
};

const stripeProvider = {
  initiateListingFee: async (listing, landlord) =>
    createPaymentIntent({
      amount: process.env.LISTING_FEE_AMOUNT,
      metadata: {
        type: "listing_activation",
        listingId: getRecordId(listing),
        userId: getRecordId(landlord),
      },
    }),

  initiatePremiumSubscription: async (user) =>
    createPaymentIntent({
      amount: process.env.TENANT_PREMIUM_AMOUNT,
      metadata: {
        type: "premium_access",
        userId: getRecordId(user),
      },
    }),

  initiateBookingPayment: async (booking, guest) =>
    createPaymentIntent({
      amount: booking?.totalPrice ?? booking?.amount,
      metadata: {
        type: "booking_payment",
        bookingId: getRecordId(booking),
        userId: getRecordId(guest),
      },
    }),

  initiatePartialPayment: async (booking, guest, amount) =>
    createPaymentIntent({
      amount,
      metadata: {
        type: "partial_booking_payment",
        bookingId: getRecordId(booking),
        userId: getRecordId(guest),
      },
    }),

  retryPayment: async (payment, guest) => {
    if (payment.providerIntentId) {
      const intent = await getStripe().paymentIntents.confirm(payment.providerIntentId);

      return {
        transactionRef: intent.id,
        providerIntentId: intent.id,
        instructions: intent.client_secret,
        providerMeta: {
          clientSecret: intent.client_secret,
          status: intent.status,
        },
      };
    }

    return createPaymentIntent({
      amount: payment.amountDue || payment.amount,
      metadata: {
        type: payment.type,
        bookingId: payment.bookingId || "",
        userId: getRecordId(guest) || payment.userId,
        retryOf: payment.id,
      },
    });
  },

  issueRefund: async (payment, amount, reason) => {
    if (!payment.providerIntentId) {
      throw new AppError("Payment has no Stripe intent to refund", 400);
    }

    const refund = await getStripe().refunds.create({
      payment_intent: payment.providerIntentId,
      amount: toCents(amount),
      metadata: {
        reason: reason || "refund",
        paymentId: payment.id,
        bookingId: payment.bookingId || "",
      },
    });

    return {
      providerRefId: refund.id,
      status: refund.status,
    };
  },

  pollPaymentStatus: async (payment) => {
    if (!payment?.providerIntentId) {
      return { status: "unknown" };
    }

    const intent = await getStripe().paymentIntents.retrieve(payment.providerIntentId);

    return {
      status: mapPaymentIntentStatus(intent.status),
      amountPaid: intent.amount_received ? intent.amount_received / 100 : undefined,
      providerMeta: {
        status: intent.status,
        clientSecret: intent.client_secret,
      },
    };
  },

  verifyWebhook: async (rawBody, headers = {}) => {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error("Missing STRIPE_WEBHOOK_SECRET configuration");
      }

      const event = getStripe().webhooks.constructEvent(
        rawBody,
        headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
      const object = event.data.object;

      return {
        valid: true,
        eventId: event.id,
        transactionRef: object.payment_intent || object.id,
        providerRefId: object.refunds?.data?.[0]?.id || object.id,
        status: event.type,
        amountPaid: object.amount_received ? object.amount_received / 100 : undefined,
        payload: event,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  },
};

module.exports = stripeProvider;
