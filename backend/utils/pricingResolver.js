const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RATE_TYPE_PRIORITY = {
  SEASONAL: 5,
  HOLIDAY: 4,
  WEEKEND: 3,
  WEEKDAY: 2,
  LONG_STAY: 1,
};

const startOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const eachNight = (checkIn, checkOut) => {
  const nights = [];
  let cursor = startOfDay(checkIn);
  const end = startOfDay(checkOut);

  while (cursor && end && cursor < end) {
    nights.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return nights;
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

  const minNightsToApply = Number(rate?.minNightsToApply || 1);
  return totalNights >= minNightsToApply;
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

const resolveNightPrice = (night, rates, totalNights) => {
  const matchedRate = rates.find((rate) => rateMatchesNight(rate, night, totalNights));

  return matchedRate?.pricePerNight ?? null;
};

exports.resolvePrice = (room, checkIn, checkOut) => {
  const nights = eachNight(checkIn, checkOut);
  const seasonalRates = Array.isArray(room?.seasonalRates) ? room.seasonalRates : [];
  const sortedRates = sortRates(seasonalRates);

  for (const night of nights) {
    const matchedPrice = resolveNightPrice(night, sortedRates, nights.length);
    if (matchedPrice != null) {
      return matchedPrice;
    }
  }

  return room?.basePricePerNight ?? null;
};

exports.resolvePriceBreakdown = (room, checkIn, checkOut) => {
  const nights = eachNight(checkIn, checkOut);
  const seasonalRates = Array.isArray(room?.seasonalRates) ? room.seasonalRates : [];
  const sortedRates = sortRates(seasonalRates);
  const basePrice = room?.basePricePerNight ?? null;

  return nights.map((night) => {
    const matchedPrice = resolveNightPrice(night, sortedRates, nights.length);
    const pricePerNight = Number(matchedPrice ?? basePrice ?? 0);

    return {
      date: night.toISOString().slice(0, 10),
      pricePerNight: Number.isFinite(pricePerNight) ? pricePerNight : 0,
    };
  });
};
