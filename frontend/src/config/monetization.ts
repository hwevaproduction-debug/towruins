export type TokenPayerRole = "LANDLORD" | "TENANT";

const normalizeTokenPayerRole = (value: string): TokenPayerRole => {
  const normalized = value.trim().toUpperCase();

  if (normalized === "TENANT" || normalized === "TENANT_PAID") {
    return "TENANT";
  }

  return "LANDLORD";
};

const rawRole =
  process.env.REACT_APP_TOKEN_PAYER_ROLE ||
  process.env.REACT_APP_MONETIZATION_MODE ||
  process.env.MONETIZATION_MODE ||
  "LANDLORD";

// Legacy monetization env vars remain as compatibility fallbacks for older deployments.
export const TOKEN_PAYER_ROLE: TokenPayerRole = normalizeTokenPayerRole(rawRole);

export const isPremiumTenant = (user: any): boolean => {
  return user?.premiumExpiry && new Date(user.premiumExpiry) > new Date();
};
