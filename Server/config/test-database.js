// No dotenv or development fallback: tests must opt in to an isolated database.
function getTestDatabaseConfig(env = process.env, { destructive = false } = {}) {
  const required = ["TEST_DB_NAME", "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASS"];
  if (env.NODE_ENV !== "test" || required.some((key) => env[key] === undefined)) {
    throw new Error("Test database requires NODE_ENV=test and explicit TEST_DB_* variables");
  }
  if (!/^tunetrek_test(?:_[a-z0-9]+)*$/.test(env.TEST_DB_NAME)) {
    throw new Error("Test database name must be tunetrek_test or tunetrek_test_<suffix>");
  }
  if (!["localhost", "127.0.0.1", "::1", "mysql-test"].includes(env.TEST_DB_HOST)) {
    throw new Error("Test database host is not in the local/test allowlist");
  }
  const port = Number(env.TEST_DB_PORT);
  if (!/^\d+$/.test(env.TEST_DB_PORT) || !Number.isInteger(port) || port < 1 || port > 65535 || !env.TEST_DB_USER.trim()) {
    throw new Error("Test database port/user is invalid");
  }
  if (destructive && env.TEST_DB_RESET_ALLOWED !== "yes") {
    throw new Error("Destructive tests require TEST_DB_RESET_ALLOWED=yes");
  }
  return {
    database: env.TEST_DB_NAME,
    username: env.TEST_DB_USER,
    password: env.TEST_DB_PASS,
    host: env.TEST_DB_HOST,
    port,
    dialect: "mysql",
    logging: false,
  };
}

module.exports = { getTestDatabaseConfig };
