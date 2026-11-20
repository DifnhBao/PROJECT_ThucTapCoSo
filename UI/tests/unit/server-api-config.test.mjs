import test from "node:test";
import assert from "node:assert/strict";
import { apiOrigin } from "../../server-api-config.cjs";

test("production proxy origin must be explicit and never leaks credentials in errors", () => {
  assert.throws(() => apiOrigin({ NODE_ENV: "production" }), /API_INTERNAL_URL/);
  assert.equal(apiOrigin({ NODE_ENV: "production", API_INTERNAL_URL: "http://api:5000" }), "http://api:5000");
  for (const value of ["file:///private", "https://user:secret@example.test", "https://api.example.test/path", "https://api.example.test?token=secret"]) {
    assert.throws(() => apiOrigin({ NODE_ENV: "production", API_INTERNAL_URL: value }), (error) => !error.message.includes("secret"));
  }
});

test("only development permits a local proxy default", () => {
  assert.equal(apiOrigin({ NODE_ENV: "development" }), "http://127.0.0.1:5000");
});
