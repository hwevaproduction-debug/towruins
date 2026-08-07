const assert = require("node:assert/strict");
const test = require("node:test");

const { resolvePriceBreakdown } = require("../utils/pricingResolver");
const { toLocalDateString, toUtcMidnight } = require("../utils/dateUtils");
const {
  collectRuleViolations,
  normalizeStayDates,
} = require("../utils/reservationRules");

test("toUtcMidnight interprets YYYY-MM-DD as midnight in the accommodation timezone", () => {
  const utcDate = toUtcMidnight("2026-06-16", "Africa/Harare");

  assert.equal(utcDate.toISOString(), "2026-06-15T22:00:00.000Z");
  assert.equal(toLocalDateString(utcDate, "Africa/Harare"), "2026-06-16");
});

test("resolvePriceBreakdown returns one entry per night with matching seasonal rates", () => {
  const breakdown = resolvePriceBreakdown(
    {
      basePricePerNight: 85,
      seasonalRates: [
        {
          rateType: "SEASONAL",
          pricePerNight: 120,
          startDate: "2026-06-17",
          endDate: "2026-06-17",
          daysOfWeek: [],
          priority: 10,
        },
      ],
    },
    "2026-06-16",
    "2026-06-19"
  );

  assert.deepEqual(breakdown, [
    { date: "2026-06-16", pricePerNight: 85 },
    { date: "2026-06-17", pricePerNight: 120 },
    { date: "2026-06-18", pricePerNight: 85 },
  ]);
});

test("collectRuleViolations returns deterministic booking rule codes in enforcement order", () => {
  const room = {
    minNights: 2,
    maxNights: 4,
    maxAdvanceBookingDays: 30,
    status: "AVAILABLE",
    accommodation: { timezone: "Africa/Harare" },
    occupancyRule: {
      maxGuests: 2,
      maxAdults: 1,
      maxChildren: 1,
      maxInfants: 0,
    },
  };
  const stayDates = normalizeStayDates("2026-06-11", "2026-06-12", "Africa/Harare");
  const violations = collectRuleViolations(
    room,
    stayDates,
    {
      adultCount: 2,
      childCount: 1,
      infantCount: 1,
    },
    toUtcMidnight("2026-06-10", "Africa/Harare")
  );

  assert.deepEqual(
    violations.map((violation) => violation.code),
    [
      "MIN_STAY_VIOLATION",
      "MAX_GUESTS_EXCEEDED",
      "MAX_ADULTS_EXCEEDED",
      "MAX_INFANTS_EXCEEDED",
    ]
  );
});
