const fetch = require("../helpers/browser-fetch.cjs");
require("../helpers/mock-session-boundary.cjs");
const { fetchPayload } = require("../helpers/fetch-payload.cjs");
const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../../src/app");
let server;
let baseUrl;

before(async () => {
  // Only the test explicitly opens an ephemeral loopback port.
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("root response remains available", async () => {
  const response = await fetchPayload(baseUrl);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "API Backend");
});

test("real protected route rejects an anonymous request without touching DB/cloud", async () => {
  const response = await fetchPayload(`${baseUrl}/api/users/me`);
  assert.equal(response.status, 401);
  assert.equal(typeof (await response.json()).message, "string");
});

test("allowed CORS origin retains credential support", async () => {
  const response = await fetchPayload(baseUrl, { headers: { Origin: "http://localhost:3000" } });
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});
