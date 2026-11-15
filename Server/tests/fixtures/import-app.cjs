require("../helpers/unit-setup.cjs");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");

const signals = ["SIGINT", "SIGTERM"].map((signal) => process.listenerCount(signal));
global.setInterval = () => { throw new Error("Import started an interval"); };
global.setTimeout = () => { throw new Error("Import started a timeout"); };
net.Socket.prototype.connect = () => { throw new Error("Import opened a connection"); };
http.Server.prototype.listen = () => { throw new Error("Import opened a port"); };
for (const method of ["mkdir", "mkdirSync"]) {
  require("node:fs")[method] = () => { throw new Error("Import created an upload directory"); };
}

const { createApp } = require("../../src/app");
const app = createApp();
assert.equal(typeof app, "function");
assert.deepEqual(["SIGINT", "SIGTERM"].map((signal) => process.listenerCount(signal)), signals);
console.log("App import and creation completed without runtime side effects");
// No process.exit(): the parent test requires this process to exit naturally.
