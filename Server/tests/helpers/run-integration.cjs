const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { getTestDatabaseConfig } = require("../../config/test-database");

try {
  // Checked before loading any app/model, invoking a test, or touching a database.
  getTestDatabaseConfig(process.env, { destructive: true });
  const directory = path.join(__dirname, "../integration");
  const files = fs.readdirSync(directory).filter((file) => file.endsWith(".test.cjs"));
  if (!files.length) throw new Error("NOT_RUN: MySQL integration suite is deferred to T04 (migrations/seed)");
  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...files.sort().map((file) => path.join(directory, file))], {
    stdio: "inherit", env: process.env,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
