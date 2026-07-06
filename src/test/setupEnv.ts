// Runs before any test file's imports. src/config/index.ts throws at import
// time if JWT_SECRET or MONGO_URL are missing, so these must be set here —
// dotenv.config() (called inside config/index.ts) never overrides values
// that are already present in process.env.
process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-jwt-secret";
process.env.JWT_REFRESH_SECRET ??= "test-jwt-refresh-secret";
process.env.JWT_EXPIRES_IN ??= "15m";
process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";
process.env.MONGO_URL ??= "mongodb://127.0.0.1:27017/test-placeholder";
process.env.BCRYPT_SALT_ROUNDS ??= "4";
