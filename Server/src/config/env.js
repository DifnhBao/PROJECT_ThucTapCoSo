const path = require("node:path");
const { getTestDatabaseConfig } = require("../../config/test-database");

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function loadEnvironment() {
  if (process.env.NODE_ENV !== "test") {
    require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
  }
}

function required(env, name) {
  const value = env[name];
  if (typeof value !== "string" || !value.trim() || /^(replace[-_ ]|change[-_ ]|your[-_ ])/i.test(value)) {
    throw new ConfigurationError(`Invalid or missing configuration: ${name}`);
  }
  return value;
}

function portNumber(value, name) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new ConfigurationError(`Invalid or missing configuration: ${name}`);
  }
  return Number(value);
}

function getDatabaseConfig(env = process.env) {
  if (env.NODE_ENV === "test") return getTestDatabaseConfig(env);
  const username = required(env, "DB_USER");
  if (env.NODE_ENV === "production" && username.toLowerCase() === "root") {
    throw new ConfigurationError("Production DB_USER must be an application account, not root");
  }
  const tlsMode = env.DB_TLS_MODE || 'disabled';
  if (!['disabled', 'verify_identity'].includes(tlsMode)) throw new ConfigurationError('Invalid configuration: DB_TLS_MODE');
  const poolMax = env.DB_POOL_MAX || '10';
  if (!/^\d+$/.test(poolMax) || Number(poolMax) < 1 || Number(poolMax) > 10) throw new ConfigurationError('Invalid configuration: DB_POOL_MAX');
  let ssl;
  if (tlsMode === 'verify_identity') {
    ssl = { rejectUnauthorized: true, verifyIdentity: true };
    if (env.DB_TLS_CA) {
      const ca = env.DB_TLS_CA.replace(/\\n/g, '\n');
      const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
      try {
        if (!certificates?.length || ca.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '').trim()) throw Error('Invalid CA');
        for (const certificate of certificates) new (require('node:crypto').X509Certificate)(certificate);
      } catch { throw new ConfigurationError('Invalid configuration: DB_TLS_CA'); }
      ssl.ca = ca;
    }
  } else if (env.DB_TLS_CA) throw new ConfigurationError('DB_TLS_CA requires DB_TLS_MODE=verify_identity');
  return {
    username,
    password: required(env, "DB_PASS"),
    database: required(env, "DB_NAME"),
    host: required(env, "DB_HOST"),
    port: portNumber(env.DB_PORT, "DB_PORT"),
    dialect: "mysql",
    logging: false,
    pool: { max: Number(poolMax), min: 0, acquire: 30000, idle: 10000 },
    ...(ssl ? { dialectOptions: { ssl } } : {}),
  };
}

function getRuntimeConfig(env = process.env) {
  if (env.NODE_ENV && !["development", "production", "test"].includes(env.NODE_ENV)) {
    throw new ConfigurationError("Invalid configuration: NODE_ENV");
  }
  const database = getDatabaseConfig(env);
  for (const name of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    if (required(env, name).length < 32) throw new ConfigurationError(`Configuration ${name} must contain at least 32 characters`);
  }
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) throw new ConfigurationError("JWT secrets must be different");
  for (const name of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) required(env, name);
  const origins = env.WEB_ORIGINS || (env.NODE_ENV === "production" ? required(env, "WEB_ORIGINS") : "http://localhost:3000");
  for (const origin of origins.split(",").map((item) => item.trim())) {
    let url;
    try { url = new URL(origin); } catch { throw new ConfigurationError("Invalid configuration: WEB_ORIGINS"); }
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)
      || (env.NODE_ENV === "production" && url.protocol !== "https:")) {
      throw new ConfigurationError("Invalid configuration: WEB_ORIGINS");
    }
  }
  require('./security').getSecurityConfig(env);
  return Object.freeze({ database, port: portNumber(env.PORT || "5000", "PORT"), origins });
}

module.exports = { ConfigurationError, loadEnvironment, getDatabaseConfig, getRuntimeConfig };
