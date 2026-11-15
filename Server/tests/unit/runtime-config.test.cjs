const test = require("node:test");
const assert = require("node:assert/strict");
const { getRuntimeConfig, getDatabaseConfig } = require("../../src/config/env");
const { startServer } = require("../../src/server");
const valid = {
  NODE_ENV: "production", DB_HOST: "db", DB_PORT: "3307", DB_NAME: "tunetrek_demo",
  DB_USER: "tunetrek_app", DB_PASS: "local-test-db-password",
  JWT_SECRET: "a".repeat(40), JWT_REFRESH_SECRET: "b".repeat(40),
  CLOUDINARY_CLOUD_NAME: "test-cloud", CLOUDINARY_API_KEY: "test-key", CLOUDINARY_API_SECRET: "test-secret",
  WEB_ORIGINS: "https://demo.example.test", PORT: "5000",
};

test("runtime and migration use the same validated DB settings and port", () => {
  assert.equal(getRuntimeConfig(valid).database.port, 3307);
  assert.deepEqual(getRuntimeConfig(valid).database, getDatabaseConfig(valid));
});

test("missing/unsafe production configuration fails without echoing secret values", () => {
  for (const key of Object.keys(valid).filter((key) => key !== "NODE_ENV" && key !== "PORT")) {
    const invalid = { ...valid }; delete invalid[key];
    assert.throws(() => getRuntimeConfig(invalid), (error) => error.message.includes(key)
      && !error.message.includes(valid.DB_PASS) && !error.message.includes(valid.JWT_SECRET));
  }
  for (const override of [{ DB_PORT: "3306junk" }, { DB_USER: "root" }, { JWT_SECRET: "short" },
    { JWT_REFRESH_SECRET: valid.JWT_SECRET }, { WEB_ORIGINS: "http://public.example.test" }, { WEB_ORIGINS: "https://demo.example.test/path" }]) {
    assert.throws(() => getRuntimeConfig({ ...valid, ...override }));
  }
});

test("configuration failure happens before DB/server startup", async (t) => {
  const original = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  t.after(() => { process.env.JWT_SECRET = original; });
  await assert.rejects(startServer({ port: 0 }), /JWT_SECRET/);
});
