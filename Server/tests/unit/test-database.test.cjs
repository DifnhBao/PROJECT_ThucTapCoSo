const test = require("node:test");
const assert = require("node:assert/strict");
const { getTestDatabaseConfig } = require("../../config/test-database");
const valid = {
  NODE_ENV: "test", TEST_DB_NAME: "tunetrek_test_ci", TEST_DB_HOST: "127.0.0.1",
  TEST_DB_PORT: "3307", TEST_DB_USER: "test_runner", TEST_DB_PASS: "dummy",
};

test("uses explicit test settings including the port", () => {
  const config = getTestDatabaseConfig(valid);
  assert.equal(config.database, "tunetrek_test_ci");
  assert.equal(config.port, 3307);
});

test("missing test variables never fall back to development DB variables", () => {
  for (const key of Object.keys(valid)) {
    const env = { ...valid, DB_NAME: "production", DB_HOST: "production.example" };
    delete env[key];
    assert.throws(() => getTestDatabaseConfig(env), /requires/);
  }
});

test("rejects non-test environments, unsafe names, hosts, and invalid connection fields", () => {
  for (const override of [
    { NODE_ENV: "production" }, { TEST_DB_NAME: "tunetrek" }, { TEST_DB_NAME: "tunetrek_test_prod-db" },
    { TEST_DB_HOST: "production.example" }, { TEST_DB_PORT: "0" }, { TEST_DB_PORT: "3306oops" },
    { TEST_DB_PORT: "65536" }, { TEST_DB_USER: "" },
  ]) assert.throws(() => getTestDatabaseConfig({ ...valid, ...override }));
});

test("destructive integration work needs a separate explicit opt-in", () => {
  assert.throws(() => getTestDatabaseConfig(valid, { destructive: true }), /RESET_ALLOWED/);
  assert.equal(getTestDatabaseConfig({ ...valid, TEST_DB_RESET_ALLOWED: "yes" }, { destructive: true }).database, valid.TEST_DB_NAME);
});

test("runtime and migration config both reject DB_* fallback in a fresh process", () => {
  const { spawnSync } = require("node:child_process");
  const path = require("node:path");
  const env = { ...process.env, NODE_ENV: "test", DB_NAME: "live_database", DB_HOST: "production.example" };
  for (const key of Object.keys(env)) if (key.startsWith("TEST_DB_")) delete env[key];
  const script = `
    const assert = require('node:assert/strict');
    assert.throws(() => require('./src/config/db'), /explicit TEST_DB/);
    assert.throws(() => require('./config/config').test, /explicit TEST_DB/);
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: path.join(__dirname, "../.."), env, encoding: "utf8", timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});
