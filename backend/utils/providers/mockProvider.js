/**
 * Mock Payment Provider
 *
 * This provider simulates payment processing for development and testing.
 * All transactions are immediately marked as successful.
 */

const mockProvider = {
  /**
   * Legacy listing activation hook used by compatibility tests
   * @param {object} listing - Listing model
   * @param {object} landlord - Landlord user
   * @returns {object} Payment initiation response
   */
  initiateListingFee: async (listing, landlord) => {
    const transactionRef = `mock-${Date.now()}`;

    return {
      transactionRef,
      providerIntentId: transactionRef,
      instructions: "Mock payment - approved immediately",
    };
  },

  /**
   * Legacy premium access hook used by compatibility tests
   * @param {object} user - Tenant user
   * @returns {object} Payment initiation response
   */
  initiatePremiumSubscription: async (user) => {
    const transactionRef = `mock-${Date.now()}`;

    return {
      transactionRef,
      providerIntentId: transactionRef,
      instructions: "Mock payment - approved immediately",
    };
  },

  /**
   * Initiates a mock booking payment
   * @param {object} booking - Booking model
   * @param {object} guest - Guest user
   * @returns {object} Payment initiation response
   */
  initiateBookingPayment: async (booking, guest) => {
    const transactionRef = `mock-booking-${booking._id || booking.id}`;

    return {
      transactionRef,
      providerIntentId: transactionRef,
      instructions: "Mock booking payment",
    };
  },

  initiatePartialPayment: async (booking, guest, amount) => {
    const transactionRef = `mock-partial-${Date.now()}`;

    return {
      transactionRef,
      providerIntentId: transactionRef,
      instructions: "Mock partial payment",
    };
  },

  retryPayment: async (payment, guest) => {
    const transactionRef = `mock-retry-${Date.now()}`;

    return {
      transactionRef,
      providerIntentId: transactionRef,
      instructions: "Mock retry",
    };
  },

  issueRefund: async (payment, amount, reason) => ({
    providerRefId: `mock-refund-${Date.now()}`,
    status: "success",
  }),

  pollPaymentStatus: async (payment) => ({
    status: "paid",
    amountPaid: payment.amountDue,
  }),

  /**
   * Verifies a mock webhook (always succeeds for testing)
   * @param {object} formFields - Webhook payload
   * @returns {object} Webhook verification response
   */
  verifyWebhook: async (formFields) => ({
    valid: true,
    eventId: formFields.eventId || `mock-${formFields.reference}-${formFields.status}`,
    transactionRef: formFields.reference,
    status: "paid",
    amountPaid: formFields.amount ? Number.parseFloat(formFields.amount) : undefined,
  }),
};

module.exports = mockProvider;
