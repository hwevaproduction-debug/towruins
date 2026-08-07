/**
 * Paynow Payment Provider
 *
 * This provider integrates with the Paynow payment gateway for EcoCash and card payments.
 * It handles payment initiation and webhook verification using the Paynow SDK.
 */

const { Paynow } = require('paynow');
const AppError = require('../appError');

// Initialize Paynow with credentials from environment
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID,
  process.env.PAYNOW_INTEGRATION_KEY
);

// Set result and return URLs for payment callbacks
paynow.resultUrl = process.env.PAYNOW_RESULT_URL;
paynow.returnUrl = process.env.PAYNOW_RETURN_URL;

const parseConfiguredAmount = (envKey) => {
  const rawValue = process.env[envKey];
  const amount = Number.parseFloat(rawValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`Invalid or missing ${envKey} configuration`, 500);
  }

  return amount;
};

const validatePayerContact = (payerType, payer) => {
  if (!payer?.email) {
    throw new AppError(`Missing ${payerType} email for Paynow transaction`, 400);
  }

  if (!payer?.phone) {
    throw new AppError(`Missing ${payerType} phone for Paynow transaction`, 400);
  }
};

const getRecordId = (record) => record?._id || record?.id;

const buildIntentResult = (reference, response) => ({
  transactionRef: response.reference || reference,
  providerIntentId: response.pollUrl || null,
  instructions: response.instructions,
  pollUrl: response.pollUrl || null,
  providerMeta: {
    status: response.status,
    pollUrl: response.pollUrl || null,
    redirectUrl: response.redirectUrl || null,
    instructions: response.instructions || null,
  },
});

const initiateMobilePayment = async ({ reference, email, phone, label, amount }) => {
  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new AppError("Invalid Paynow payment amount", 400);
  }

  try {
    const payment = paynow.createPayment(reference, email);

    payment.add(label, parsedAmount);

    const response = await paynow.sendMobile(payment, phone, 'ecocash');

    if (!response.success) {
      throw new AppError(response.error || 'Failed to initiate Paynow payment', 502);
    }

    return buildIntentResult(reference, response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(error.message || 'Paynow payment initiation error', 502);
  }
};

const initiateBookingAmount = async (booking, guest, amount, referenceSuffix = '') => {
  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new AppError("Invalid booking payment amount", 400);
  }

  validatePayerContact("guest", guest);

  const bookingId = getRecordId(booking);
  const reference = `booking-${bookingId}${referenceSuffix}`;

  return initiateMobilePayment({
    reference,
    email: guest.email,
    phone: guest.phone,
    label: "Stay Booking Payment",
    amount: parsedAmount,
  });
};

const paynowProvider = {
  /**
   * Legacy listing activation hook for compatibility
   * @param {object} listing - Listing model
   * @param {object} landlord - Landlord user
   * @returns {object} Payment initiation response
   */
  initiateListingFee: async (listing, landlord) => {
    const amount = parseConfiguredAmount('LISTING_FEE_AMOUNT');
    validatePayerContact('landlord', landlord);

    return initiateMobilePayment({
      reference: `listing-${getRecordId(listing)}`,
      email: landlord.email,
      phone: landlord.phone,
      label: 'Listing Activation Tokens',
      amount,
    });
  },

  /**
   * Legacy premium access hook for compatibility
   * @param {object} user - Tenant user
   * @returns {object} Payment initiation response
   */
  initiatePremiumSubscription: async (user) => {
    const amount = parseConfiguredAmount('TENANT_PREMIUM_AMOUNT');
    validatePayerContact('user', user);

    return initiateMobilePayment({
      reference: `premium-${getRecordId(user)}-${Date.now()}`,
      email: user.email,
      phone: user.phone,
      label: 'Tenant Premium Tokens',
      amount,
    });
  },

  /**
   * Initiates a Paynow booking payment
   * @param {object} booking - Booking model
   * @param {object} guest - Guest user
   * @returns {object} Payment initiation response
   */
  initiateBookingPayment: async (booking, guest) => {
    const amount = Number.parseFloat(booking?.totalPrice ?? booking?.amount);

    return initiateBookingAmount(booking, guest, amount);
  },

  initiatePartialPayment: async (booking, guest, amount) => {
    return initiateBookingAmount(booking, guest, amount, `-partial-${Date.now()}`);
  },

  retryPayment: async (payment, guest) => {
    const amount = Number.parseFloat(payment?.amountDue ?? payment?.amount);
    const bookingId = payment?.bookingId || payment?.id;

    validatePayerContact("guest", guest);

    return initiateMobilePayment({
      reference: `booking-${bookingId}-retry-${Date.now()}`,
      email: guest.email,
      phone: guest.phone,
      label: "Stay Booking Payment Retry",
      amount,
    });
  },

  issueRefund: async (payment, amount, reason) => {
    console.log(
      `[paynow] Manual refund required for payment ${payment.id}: amount=${amount}, reason=${reason || "refund"}`
    );

    return {
      providerRefId: null,
      status: "manual_required",
    };
  },

  pollPaymentStatus: async (payment) => {
    if (!payment?.providerIntentId) {
      return { status: "unknown" };
    }

    try {
      const response = await paynow.pollTransaction(payment.providerIntentId);
      const status = response?.status ? String(response.status).toLowerCase() : "unknown";

      return {
        status,
        amountPaid: status === "paid" ? Number(payment.amountDue || payment.amount || 0) : undefined,
        providerMeta: {
          status: response?.status,
          pollUrl: response?.pollUrl || payment.providerIntentId,
        },
      };
    } catch (error) {
      throw new AppError(error.message || "Paynow status polling error", 502);
    }
  },

  /**
   * Verifies a Paynow webhook/payment status
   * Checks webhook signature and validates payment completion
   * @param {object} formFields - Webhook payload or payment status data
   * @returns {object} Webhook verification response
   */
  verifyWebhook: async (formFields) => {
    const valid = paynow.verifyHash(formFields);
    const amountPaid = formFields.amount ? Number.parseFloat(formFields.amount) : undefined;

    return {
      valid,
      transactionRef: formFields.reference,
      // Normalize status to lowercase for case-insensitive comparison
      status: formFields.status ? formFields.status.toLowerCase() : formFields.status,
      amountPaid: Number.isFinite(amountPaid) ? amountPaid : undefined,
    };
  },
};

module.exports = paynowProvider;
