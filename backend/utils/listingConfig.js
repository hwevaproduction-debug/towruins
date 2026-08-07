const RESTORATION_DURATIONS = [
  { days: 1, label: "1 day", tokensPerDay: 1 },
  { days: 3, label: "3 days", tokensPerDay: 1 },
  { days: 7, label: "7 days", tokensPerDay: 1 },
  { days: 14, label: "14 days", tokensPerDay: 1 },
];

const MIN_TOKENS_PER_DAY = 1;

function getRestorationDurations() {
  return RESTORATION_DURATIONS;
}

function getMinTokensPerDay() {
  return MIN_TOKENS_PER_DAY;
}

function calculateRestorationCost(days) {
  const config = RESTORATION_DURATIONS.find((d) => d.days === days);
  if (!config) {
    return days * MIN_TOKENS_PER_DAY;
  }
  return days * config.tokensPerDay;
}

function isValidRestorationDuration(days) {
  return RESTORATION_DURATIONS.some((d) => d.days === days);
}

module.exports = {
  RESTORATION_DURATIONS,
  MIN_TOKENS_PER_DAY,
  getRestorationDurations,
  getMinTokensPerDay,
  calculateRestorationCost,
  isValidRestorationDuration,
};