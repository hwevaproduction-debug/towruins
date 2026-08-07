const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const toNumber = (value) => {
  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : 0;
};

const clampCurrency = (value, min, max) => Math.min(Math.max(value, min), max);

const getOneNightCharge = (booking, totalPrice) => {
  const pricePerNight = toNumber(booking?.pricePerNight);

  if (pricePerNight > 0) {
    return clampCurrency(pricePerNight, 0, totalPrice);
  }

  const nights = toNumber(booking?.nights);

  if (nights > 0) {
    return clampCurrency(roundCurrency(totalPrice / nights), 0, totalPrice);
  }

  return totalPrice;
};

const getCancellationPolicy = (accommodation) => accommodation?.cancellationPolicy || null;

exports.snapshotCancellationPolicy = (accommodation) => {
  const policy = getCancellationPolicy(accommodation);

  if (!policy) {
    return null;
  }

  return {
    policyType: policy.policyType || null,
    freeCancellationHours: policy.freeCancellationHours ?? null,
    refundPercentage: policy.refundPercentage == null ? null : toNumber(policy.refundPercentage),
    customDescription: policy.customDescription ?? null,
  };
};

exports.computeBookingFinancials = (totalPrice, commissionRate) => {
  const price = toNumber(totalPrice);
  const rate = toNumber(commissionRate);
  const commissionAmount = roundCurrency((price * rate) / 100);
  const netPayout = roundCurrency(price - commissionAmount);

  return {
    commissionAmount,
    netPayout,
  };
};

exports.computeRefundAmount = (booking, cancelledAt = new Date()) => {
  const snapshot = booking?.cancellationPolicySnapshot || null;
  const totalPrice = toNumber(booking?.totalPrice);
  const policyType = String(snapshot?.policyType || snapshot?.policy || "").trim().toUpperCase();
  const checkIn = new Date(booking?.checkIn);
  const cancelled = new Date(cancelledAt);

  if (!snapshot || Number.isNaN(checkIn.getTime()) || Number.isNaN(cancelled.getTime())) {
    return 0;
  }

  const hoursUntilCheckIn = (checkIn.getTime() - cancelled.getTime()) / 3600000;
  const daysUntilCheckIn = hoursUntilCheckIn / 24;

  let cancellationFee = totalPrice;

  switch (policyType) {
    case "FLEXIBLE": {
      const freeCancellationHours = toNumber(snapshot.freeCancellationHours);
      cancellationFee =
        hoursUntilCheckIn >= freeCancellationHours ? 0 : getOneNightCharge(booking, totalPrice);
      break;
    }
    case "MODERATE":
      cancellationFee = daysUntilCheckIn < 5 ? totalPrice * 0.5 : 0;
      break;
    case "STRICT":
      cancellationFee =
        hoursUntilCheckIn < 24 ? totalPrice : daysUntilCheckIn < 7 ? totalPrice * 0.5 : 0;
      break;
    case "NON_REFUNDABLE":
      cancellationFee = totalPrice;
      break;
    case "CUSTOM": {
      const refundPercentage = clampCurrency(toNumber(snapshot.refundPercentage), 0, 100);
      cancellationFee = totalPrice - (totalPrice * refundPercentage) / 100;
      break;
    }
    default:
      cancellationFee = totalPrice;
      break;
  }

  return roundCurrency(totalPrice - clampCurrency(cancellationFee, 0, totalPrice));
};

exports.computeCancellationFee = (booking, cancelledAt = new Date()) => {
  const refund = exports.computeRefundAmount(booking, cancelledAt);
  return roundCurrency(toNumber(booking?.totalPrice) - refund);
};
