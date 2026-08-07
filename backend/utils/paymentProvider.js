/**
 * Payment Provider Abstraction
 *
 * This module defines the contract for payment providers and the factory to retrieve them.
 * All payment providers must implement the following methods:
 *
 * @interface PaymentProvider
 * @method initiateListingFee(listing, landlord)
 *   - Legacy hook for listing activation flows
 *   - Returns: { transactionRef, instructions }
 *
 * @method initiatePremiumSubscription(user)
 *   - Legacy hook for premium access flows
 *   - Returns: { transactionRef, instructions }
 *
 * @method verifyWebhook(formFields)
 *   - Verifies and processes a webhook event from the payment provider
 *   - Returns: { valid: Boolean, transactionRef, status }
 */

const MockProvider = require('./providers/mockProvider');
const PaynowProvider = require('./providers/paynowProvider');
const StripeProvider = require('./providers/stripeProvider');

const normalizeProviderName = (name) => String(name || 'mock').trim().toLowerCase();

const getProviderByName = (name) => {
  const paymentProvider = normalizeProviderName(name);

  if (paymentProvider === 'paynow') {
    return PaynowProvider;
  }

  if (paymentProvider === 'stripe') {
    return StripeProvider;
  }

  return MockProvider;
};

/**
 * Factory function to get the appropriate payment provider
 * @returns {PaymentProvider} The configured payment provider instance
 */
const getProvider = () => {
  return getProviderByName(process.env.PAYMENT_PROVIDER);
};

module.exports = {
  getProvider,
  getProviderByName,
};
