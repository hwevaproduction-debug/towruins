const { resolvePriceBreakdown } = require("./pricingResolver");
const { findBestPromotion, validateCoupon } = require("./promotionService");

const toNumber = (value) => {
  if (value == null) {
    return 0;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCents = (value) => Math.round(toNumber(value) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));
const RATE_TYPE_PRIORITY = {
  SEASONAL: 5,
  HOLIDAY: 4,
  WEEKEND: 3,
  WEEKDAY: 2,
  LONG_STAY: 1,
};

const pluralizeNight = (count) => `${count} night${count === 1 ? "" : "s"}`;

const startOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const normalizeRateType = (rateType) => String(rateType || "").toUpperCase();

const sortRates = (rates) =>
  [...rates].sort((left, right) => {
    const priorityDiff = Number(right?.priority || 0) - Number(left?.priority || 0);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      (RATE_TYPE_PRIORITY[normalizeRateType(right?.rateType)] || 0) -
      (RATE_TYPE_PRIORITY[normalizeRateType(left?.rateType)] || 0)
    );
  });

const matchesDateRange = (night, rate) => {
  if (!rate?.startDate || !rate?.endDate) {
    return true;
  }

  const start = startOfDay(rate.startDate);
  const end = startOfDay(rate.endDate);

  if (!start || !end) {
    return false;
  }

  return night >= start && night <= end;
};

const matchesDayOfWeek = (night, rate) => {
  if (!Array.isArray(rate?.daysOfWeek) || rate.daysOfWeek.length === 0) {
    return true;
  }

  return rate.daysOfWeek.map(Number).includes(night.getUTCDay());
};

const matchesMinimumStay = (rate, totalNights) => {
  if (normalizeRateType(rate?.rateType) !== "LONG_STAY") {
    return true;
  }

  return totalNights >= Number(rate?.minNightsToApply || 1);
};

const rateMatchesNight = (rate, night, totalNights) => {
  if (rate?.pricePerNight == null || !matchesMinimumStay(rate, totalNights)) {
    return false;
  }

  const hasDateConstraint = Boolean(rate.startDate && rate.endDate);
  const hasDayConstraint = Array.isArray(rate.daysOfWeek) && rate.daysOfWeek.length > 0;

  if (!hasDateConstraint && !hasDayConstraint) {
    return true;
  }

  return matchesDateRange(night, rate) && matchesDayOfWeek(night, rate);
};

const getRateLabelForNight = (room, date, totalNights) => {
  const night = startOfDay(date);
  const rates = Array.isArray(room?.seasonalRates) ? sortRates(room.seasonalRates) : [];
  const matchedRate = night
    ? rates.find((rate) => rateMatchesNight(rate, night, totalNights))
    : null;

  return matchedRate?.label || "Base Rate";
};

const groupNightlyBreakdown = (nightlyBreakdown) => {
  const groups = [];

  nightlyBreakdown.forEach((night) => {
    const amountCents = toCents(night.pricePerNight);
    const last = groups[groups.length - 1];

    if (last && last.amountCents === amountCents && last.rateLabel === night.rateLabel) {
      last.nights += 1;
      last.endDate = night.date;
      return;
    }

    groups.push({
      nights: 1,
      startDate: night.date,
      endDate: night.date,
      rateLabel: night.rateLabel || "Base Rate",
      amountCents,
    });
  });

  return groups;
};

const normalizeTaxAppliesTo = (value) => {
  const appliesTo = String(value || "SUBTOTAL").toUpperCase();

  return ["SUBTOTAL", "CLEANING", "ALL"].includes(appliesTo) ? appliesTo : "SUBTOTAL";
};

const getTaxableBaseCents = ({
  taxRule,
  roomChargeCents,
  cleaningTaxableFeeCents,
  subtotalCents,
  totalDiscountCents,
}) => {
  if (!taxRule) {
    return 0;
  }

  const appliesTo = normalizeTaxAppliesTo(taxRule.appliesTo);
  const selectedBaseCents =
    appliesTo === "ALL"
      ? subtotalCents
      : appliesTo === "CLEANING"
        ? cleaningTaxableFeeCents
        : roomChargeCents;

  if (selectedBaseCents <= 0) {
    return 0;
  }

  const effectiveDiscountCents = Math.min(Math.max(0, totalDiscountCents), subtotalCents);
  if (effectiveDiscountCents <= 0 || subtotalCents <= 0) {
    return selectedBaseCents;
  }

  if (appliesTo === "ALL") {
    return Math.max(0, selectedBaseCents - effectiveDiscountCents);
  }

  const allocatedDiscountCents = Math.round(
    (effectiveDiscountCents * selectedBaseCents) / subtotalCents
  );

  return Math.max(0, selectedBaseCents - allocatedDiscountCents);
};

exports.computeQuote = async ({
  room,
  checkIn,
  checkOut,
  adultCount = 1,
  childCount = 0,
  infantCount = 0,
  couponCode,
  prismaClient,
}) => {
  const resolvedNightlyBreakdown = resolvePriceBreakdown(room, checkIn, checkOut);
  const nights = resolvedNightlyBreakdown.length;
  const nightlyBreakdown = resolvedNightlyBreakdown.map((night) => ({
    ...night,
    rateLabel: getRateLabelForNight(room, night.date, nights),
  }));
  const accommodationSubtotalCents = nightlyBreakdown.reduce(
    (sum, night) => sum + toCents(night.pricePerNight),
    0
  );

  const rule = room?.occupancyPricingRule || null;
  const payingGuests = Number(adultCount || 0) + Number(childCount || 0);
  const extraGuests = rule ? Math.max(0, payingGuests - Number(rule.baseGuestCount || 0)) : 0;
  const occupancySurchargeCents = rule
    ? toCents(rule.extraGuestFeePerNight) * nights * extraGuests
    : 0;

  const requiredFees = Array.isArray(room?.fees)
    ? room.fees.filter((fee) => !fee.isOptional)
    : [];
  const feeLineItems = requiredFees.map((fee) => {
    const amountCents = toCents(fee.amount) * (fee.isPerStay ? 1 : nights);
    return {
      label: fee.label || String(fee.feeType || "Fee"),
      type: String(fee.feeType || "FEE").toLowerCase(),
      amountCents,
      isDiscount: false,
    };
  });
  const feeSubtotalCents = feeLineItems.reduce((sum, fee) => sum + fee.amountCents, 0);
  const cleaningTaxableFeeCents = feeLineItems
    .filter((fee) => fee.type === "cleaning")
    .reduce((sum, fee) => sum + fee.amountCents, 0);
  const cleaningFeeCents = feeSubtotalCents;
  const roomChargeCents = accommodationSubtotalCents + occupancySurchargeCents;
  const subtotalCents = roomChargeCents + feeSubtotalCents;

  const bestPromotion = await findBestPromotion(room, checkIn, checkOut, nights, subtotalCents, {
    client: prismaClient,
  });
  const promotionDiscountCents = bestPromotion?.discountCents || 0;
  const automaticPromotion = bestPromotion?.promotion || null;

  let couponDiscountCents = 0;
  let appliedCoupon = null;
  let couponPromotion = null;

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, room, nights, subtotalCents, {
      checkIn,
      checkOut,
      client: prismaClient,
    });
    couponPromotion = couponResult.promotion;

    if (couponPromotion.stackable || !automaticPromotion) {
      couponDiscountCents = couponResult.discountCents;
      appliedCoupon = couponResult.coupon;
    }
  }

  const totalDiscountCents = promotionDiscountCents + couponDiscountCents;
  const taxRule = room?.accommodation?.taxRule || null;
  const discountedSubtotalCents = Math.max(0, subtotalCents - totalDiscountCents);
  const taxableCents = getTaxableBaseCents({
    taxRule,
    roomChargeCents,
    cleaningTaxableFeeCents,
    subtotalCents,
    totalDiscountCents,
  });
  const taxPercentage = toNumber(taxRule?.percentage);
  const isInclusiveTax = Boolean(taxRule?.isInclusive);
  let taxCents = 0;

  if (taxRule) {
    taxCents = isInclusiveTax
      ? Math.round(taxableCents - taxableCents / (1 + taxPercentage / 100))
      : Math.round((taxableCents * taxPercentage) / 100);
  }

  const grandTotalCents = discountedSubtotalCents + (isInclusiveTax ? 0 : taxCents);
  const lineItems = [];

  groupNightlyBreakdown(nightlyBreakdown).forEach((group) => {
    lineItems.push({
      label: `${pluralizeNight(group.nights)} - ${group.rateLabel}`,
      type: "accommodation",
      amount: fromCents(group.amountCents * group.nights),
      isDiscount: false,
    });
  });

  if (occupancySurchargeCents > 0) {
    lineItems.push({
      label: `Extra guest surcharge (${extraGuests} x ${pluralizeNight(nights)})`,
      type: "occupancy",
      amount: fromCents(occupancySurchargeCents),
      isDiscount: false,
    });
  }

  feeLineItems.forEach((fee) => {
    lineItems.push({
      label: fee.label,
      type: fee.type,
      amount: fromCents(fee.amountCents),
      isDiscount: false,
    });
  });

  if (automaticPromotion && promotionDiscountCents > 0) {
    lineItems.push({
      label: automaticPromotion.name,
      type: "promotion",
      amount: fromCents(-promotionDiscountCents),
      isDiscount: true,
    });
  }

  if (appliedCoupon && couponDiscountCents > 0) {
    lineItems.push({
      label: `Coupon ${appliedCoupon.code}`,
      type: "coupon",
      amount: fromCents(-couponDiscountCents),
      isDiscount: true,
    });
  }

  if (taxRule && taxCents > 0) {
    lineItems.push({
      label: taxRule.label || "Tax",
      type: "tax",
      amount: fromCents(taxCents),
      isDiscount: false,
    });
  }

  return {
    nights,
    nightlyBreakdown: nightlyBreakdown.map((night) => ({
      date: night.date,
      pricePerNight: fromCents(toCents(night.pricePerNight)),
      rateLabel: night.rateLabel,
    })),
    accommodationSubtotal: fromCents(accommodationSubtotalCents),
    occupancySurcharge: fromCents(occupancySurchargeCents),
    cleaningFee: fromCents(cleaningFeeCents),
    subtotal: fromCents(subtotalCents),
    promotionDiscount: fromCents(promotionDiscountCents),
    couponDiscount: fromCents(couponDiscountCents),
    taxAmount: fromCents(taxCents),
    grandTotal: fromCents(grandTotalCents),
    lineItems,
    appliedPromotion: (appliedCoupon ? couponPromotion : automaticPromotion)
      ? {
          id: (appliedCoupon ? couponPromotion : automaticPromotion).id,
          name: (appliedCoupon ? couponPromotion : automaticPromotion).name,
        }
      : null,
    appliedCoupon: appliedCoupon
      ? {
          id: appliedCoupon.id,
          code: appliedCoupon.code,
        }
      : null,
    currency: "USD",
  };
};
