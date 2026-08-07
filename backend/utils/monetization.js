const normalizeTokenPayerRole = (value) => {
  const rawValue = String(value || "").trim().toUpperCase();

  if (rawValue === "TENANT" || rawValue === "TENANT_PAID") {
    return "TENANT";
  }

  return "LANDLORD";
};

const TOKEN_PAYER_ROLE = normalizeTokenPayerRole(
  process.env.TOKEN_PAYER_ROLE || process.env.MONETIZATION_MODE || "LANDLORD"
);

// Legacy MONETIZATION_MODE remains as a compatibility fallback for older deployments.

const isPremiumTenant = (user) => {
  return user.premiumExpiry && new Date(user.premiumExpiry) > new Date();
};

module.exports = {
  TOKEN_PAYER_ROLE,
  isPremiumTenant,
};
