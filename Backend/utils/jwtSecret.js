const DEVELOPMENT_JWT_SECRET = "lime_fallback_secret_key_2026";

export const getJwtSecret = () => {
  const configuredSecret = (
    process.env.JWT_SECRET_KEY ||
    process.env.JWT_SECRET ||
    ""
  ).trim();

  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET_KEY must be configured in production.");
  }

  return DEVELOPMENT_JWT_SECRET;
};
