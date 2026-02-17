import dotenv from "dotenv";

dotenv.config();

const missing = [];

//$ Helper function to get required env
function required(key) {
  const value = process.env[key];
  if (!value) {
    missing.push(`${key} env is not set`);
    return "";
  }
  return value;
}

//$ Helper function to get required env as number
function requiredInt(key) {
  const value = process.env[key];
  if (!value) {
    missing.push(`${key} env is not set`);
    return 0;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    missing.push(`${key} must be number, got "${value}"`);
    return 0;
  }
  return parsed;
}

//$ Load all environment variables
const env = {
  HTTP_PORT: requiredInt("HTTP_PORT"),
  GRPC_PORT: requiredInt("GRPC_PORT"),

  DATABASE_URL: required("DATABASE_URL"),
  DB_MAX_OPEN_CONN: requiredInt("DB_MAX_OPEN_CONN"),
  DB_MIN_IDLE_CONN: requiredInt("DB_MIN_IDLE_CONN"),
  DB_IDLE_TIMEOUT_MS: requiredInt("DB_IDLE_TIMEOUT_MS"),
  DB_CONNECTION_TIMEOUT_MS: requiredInt("DB_CONNECTION_TIMEOUT_MS"),

  JWT_SECRET_KEY: required("JWT_SECRET_KEY"),
  JWT_EXPIRES_IN: required("JWT_EXPIRES_IN"),

  LOG_LEVEL: required("LOG_LEVEL"),

  METAL_PRICE_API_KEY: required("METAL_PRICE_API_KEY"),

  RABBITMQ_HOST: required("RABBITMQ_HOST"),
  RABBITMQ_PORT: required("RABBITMQ_PORT"),
  RABBITMQ_USER: required("RABBITMQ_USER"),
  RABBITMQ_PASSWORD: required("RABBITMQ_PASSWORD"),
  RABBITMQ_VIRTUAL_HOST: required("RABBITMQ_VIRTUAL_HOST"),
};

//$ Exit if any env is missing
if (missing.length > 0) {
  console.error("\n❌ Missing environment variables:");
  missing.forEach((m) => console.error(`   - ${m}`));
  console.error("\n");
  process.exit(1);
}

Object.freeze(env);

export default env;
