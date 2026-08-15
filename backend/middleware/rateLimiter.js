const rateLimit = require("express-rate-limit");

const shouldBypassRateLimit = (req) => {
  // Existing SEED_API_KEY header bypass for authorized seeding tools
  const configuredSeedKey = process.env.SEED_API_KEY;
  if (configuredSeedKey && req.get("x-seed-api-key") === configuredSeedKey) {
    return true;
  }

  // Temporary, narrow IP whitelist for E2E runners (comma-separated list)
  // Example: RATE_LIMIT_WHITELIST_IPS=203.0.113.42,198.51.100.7
  const whitelist = process.env.RATE_LIMIT_WHITELIST_IPS;
  if (whitelist) {
    const ips = whitelist.split(",").map((s) => s.trim()).filter(Boolean);
    // Normalize IPv6-mapped IPv4 addresses like '::ffff:127.0.0.1'
    let ip = req.ip || (req.connection && req.connection.remoteAddress) || "";
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
      ip = ip.split("::ffff:")[1];
    }
    if (ips.includes(ip)) {
      return true;
    }
  }

  return false;
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: shouldBypassRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests, please try again later.",
  },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: shouldBypassRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many payment requests, please try again later.",
  },
});

module.exports = {
  globalLimiter,
  paymentLimiter,
};
