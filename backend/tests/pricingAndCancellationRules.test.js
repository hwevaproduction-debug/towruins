const assert = require("assert");
const test = require("node:test");
const prisma = require("../utils/prisma");
const { computeRefundAmount, computeCancellationFee } = require("../utils/bookingService");
const { computeQuote } = require("../utils/pricingEngine");
const { validateCoupon } = require("../utils/promotionService");

test.after(async () => {
  await prisma.$disconnect();
});

const booking = (policy, overrides = {}) => ({
  totalPrice: 300,
  pricePerNight: 100,
  nights: 3,
  checkIn: new Date("2026-06-10T14:00:00.000Z"),
  cancellationPolicySnapshot: policy,
  ...overrides,
});

test("computeRefundAmount applies the cancellation fee rules", () => {
  const cancelledTwoDaysOut = new Date("2026-06-08T14:00:00.000Z");
  const cancelledInsideFlexibleWindow = new Date("2026-06-10T00:00:00.000Z");
  const cancelledThreeDaysOut = new Date("2026-06-07T14:00:00.000Z");
  const cancelledEightDaysOut = new Date("2026-06-02T14:00:00.000Z");
  const cancelledInsideOneDay = new Date("2026-06-10T02:00:00.000Z");

  const flexible = booking({ policyType: "FLEXIBLE", freeCancellationHours: 24 });
  assert.strictEqual(computeRefundAmount(flexible, cancelledTwoDaysOut), 300);
  assert.strictEqual(computeRefundAmount(flexible, cancelledInsideFlexibleWindow), 200);
  assert.strictEqual(computeCancellationFee(flexible, cancelledInsideFlexibleWindow), 100);

  const moderate = booking({ policyType: "MODERATE" });
  assert.strictEqual(computeRefundAmount(moderate, cancelledEightDaysOut), 300);
  assert.strictEqual(computeRefundAmount(moderate, cancelledThreeDaysOut), 150);

  const strict = booking({ policyType: "STRICT" });
  assert.strictEqual(computeRefundAmount(strict, cancelledEightDaysOut), 300);
  assert.strictEqual(computeRefundAmount(strict, cancelledThreeDaysOut), 150);
  assert.strictEqual(computeRefundAmount(strict, cancelledInsideOneDay), 0);

  assert.strictEqual(
    computeRefundAmount(booking({ policyType: "NON_REFUNDABLE" }), cancelledEightDaysOut),
    0
  );
  assert.strictEqual(
    computeRefundAmount(booking({ policyType: "CUSTOM", refundPercentage: 30 }), cancelledEightDaysOut),
    90
  );
});

const noPromotionsClient = {
  promotion: {
    findMany: async () => [],
  },
  coupon: {
    findUnique: async () => null,
  },
};

const roomWithTaxRule = (appliesTo) => ({
  id: "room-1",
  accommodationId: "accommodation-1",
  basePricePerNight: 100,
  seasonalRates: [],
  fees: [
    {
      feeType: "CLEANING",
      label: "Cleaning",
      amount: 50,
      isPerStay: true,
      isOptional: false,
    },
    {
      feeType: "LINEN",
      label: "Linen",
      amount: 20,
      isPerStay: true,
      isOptional: false,
    },
  ],
  accommodation: {
    taxRule: {
      label: "Tax",
      percentage: 10,
      isInclusive: false,
      appliesTo,
    },
  },
});

test("computeQuote applies tax only to the configured components", async () => {
  const common = {
    checkIn: "2026-06-01",
    checkOut: "2026-06-03",
    prismaClient: noPromotionsClient,
  };

  const subtotalTax = await computeQuote({ ...common, room: roomWithTaxRule("SUBTOTAL") });
  assert.strictEqual(subtotalTax.subtotal, 270);
  assert.strictEqual(subtotalTax.taxAmount, 20);
  assert.strictEqual(subtotalTax.grandTotal, 290);

  const cleaningTax = await computeQuote({ ...common, room: roomWithTaxRule("CLEANING") });
  assert.strictEqual(cleaningTax.taxAmount, 5);
  assert.strictEqual(cleaningTax.grandTotal, 275);

  const allTax = await computeQuote({ ...common, room: roomWithTaxRule("ALL") });
  assert.strictEqual(allTax.taxAmount, 27);
  assert.strictEqual(allTax.grandTotal, 297);
});

const promotion = (overrides = {}) => ({
  id: "promotion-1",
  name: "Promo",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minNights: 1,
  minSubtotal: null,
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
  isActive: true,
  stackable: false,
  maxUses: null,
  useCount: 0,
  roomId: null,
  accommodationId: null,
  ...overrides,
});

test("validateCoupon rejects coupons outside the promotion stay window", async () => {
  const client = {
    coupon: {
      findUnique: async () => ({
        id: "coupon-1",
        code: "WINDOW",
        isActive: true,
        expiresAt: null,
        maxUses: null,
        useCount: 0,
        promotion: promotion({
          startDate: new Date("2026-06-10T00:00:00.000Z"),
          endDate: new Date("2026-06-12T00:00:00.000Z"),
        }),
      }),
    },
    promotion: {
      findMany: async () => [],
    },
  };

  await assert.rejects(
    () =>
      validateCoupon("WINDOW", { id: "room-1", accommodationId: "accommodation-1" }, 2, 20000, {
        checkIn: "2026-06-01",
        checkOut: "2026-06-03",
        client,
      }),
    /selected stay dates/
  );
});

test("computeQuote drops a non-stackable coupon when an automatic promotion applies", async () => {
  const automaticPromotion = promotion({ id: "automatic-1", name: "Automatic" });
  const couponPromotion = promotion({
    id: "coupon-promotion-1",
    name: "Coupon Promo",
    discountType: "FIXED",
    discountValue: 25,
    stackable: false,
  });
  const client = {
    promotion: {
      findMany: async () => [automaticPromotion],
    },
    coupon: {
      findUnique: async () => ({
        id: "coupon-1",
        code: "SAVE25",
        isActive: true,
        expiresAt: null,
        maxUses: null,
        useCount: 0,
        promotion: couponPromotion,
      }),
    },
  };

  const quote = await computeQuote({
    room: {
      id: "room-1",
      accommodationId: "accommodation-1",
      basePricePerNight: 100,
      seasonalRates: [],
      fees: [],
      accommodation: {},
    },
    checkIn: "2026-06-01",
    checkOut: "2026-06-03",
    couponCode: "SAVE25",
    prismaClient: client,
  });

  assert.strictEqual(quote.promotionDiscount, 20);
  assert.strictEqual(quote.couponDiscount, 0);
  assert.strictEqual(quote.appliedCoupon, null);
});
