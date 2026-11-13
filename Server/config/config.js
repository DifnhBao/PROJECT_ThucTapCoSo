const { loadEnvironment, getDatabaseConfig } = require("../src/config/env");
loadEnvironment();
module.exports = {
  get development() { return getDatabaseConfig({ ...process.env, NODE_ENV: "development" }); },
  get test() { return require("./test-database").getTestDatabaseConfig(); },
  get production() { return getDatabaseConfig({ ...process.env, NODE_ENV: "production" }); },
};
