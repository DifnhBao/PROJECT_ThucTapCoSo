const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { sequelize } = require("../../src/models");
const { startServer } = require("../../src/server");

test("startup DB failure never opens a port and closes the DB client", async (t) => {
  const authenticate = t.mock.method(sequelize, "authenticate", async () => { throw new Error("mock DB unavailable"); });
  const close = t.mock.method(sequelize, "close", async () => {});
  const listen = t.mock.method(http.Server.prototype, "listen", () => { throw new Error("must not listen"); });
  await assert.rejects(startServer({ port: 0, host: "127.0.0.1", readinessProbe: async () => {} }), /mock DB unavailable/);
  assert.equal(authenticate.mock.callCount(), 1);
  assert.equal(listen.mock.callCount(), 0);
  assert.equal(close.mock.callCount(), 1);
});

test("explicit startup and shutdown release port, timer, signal handlers and DB client", async (t) => {
  const signals = ["SIGINT", "SIGTERM"].map((signal) => process.listenerCount(signal));
  t.mock.method(sequelize, "authenticate", async () => {});
  const close = t.mock.method(sequelize, "close", async () => {});
  const runtime = await startServer({ port: 0, host: "127.0.0.1", readinessProbe: async () => {} });
  t.after(() => runtime.shutdown());
  assert.equal(runtime.server.listening, true);
  assert.deepEqual(["SIGINT", "SIGTERM"].map((signal) => process.listenerCount(signal)), signals.map((count) => count + 1));
  const stopping = runtime.shutdown();
  assert.equal(runtime.shutdown(), stopping);
  await stopping;
  assert.equal(runtime.server.listening, false);
  assert.equal(close.mock.callCount(), 1);
  assert.deepEqual(["SIGINT", "SIGTERM"].map((signal) => process.listenerCount(signal)), signals);
});


test("schema failure never opens a port even when DB authentication succeeds", async (t) => {
  t.mock.method(sequelize,"authenticate",async()=>{});
  const close=t.mock.method(sequelize,"close",async()=>{});
  const listen=t.mock.method(http.Server.prototype,"listen",()=>{throw Error("must not listen");});
  await assert.rejects(startServer({port:0,readinessProbe:async()=>{throw Error("schema missing");}}),/schema missing/);
  assert.equal(listen.mock.callCount(),0);assert.equal(close.mock.callCount(),1);
});
