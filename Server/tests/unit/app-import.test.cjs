const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("real app imports and creates without listen, timers, DB, or signal handlers", () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, "../fixtures/import-app.cjs")], {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /without runtime side effects/);
});
