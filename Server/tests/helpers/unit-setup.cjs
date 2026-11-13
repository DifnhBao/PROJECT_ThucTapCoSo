// Unit/API tests never read local .env files or contact MySQL/Cloudinary.
process.env.NODE_ENV = "test";
Object.assign(process.env, {
  TEST_DB_NAME: "tunetrek_test_unit",
  TEST_DB_HOST: "127.0.0.1",
  TEST_DB_PORT: "3306",
  TEST_DB_USER: "unit_only",
  TEST_DB_PASS: "not-a-real-password",
  JWT_SECRET: "unit-test-access-secret-not-for-deployment",
  JWT_REFRESH_SECRET: "unit-test-refresh-secret-not-for-deployment",
  CLOUDINARY_CLOUD_NAME: "unit-test-cloud",
  CLOUDINARY_API_KEY: "unit-test-key",
  CLOUDINARY_API_SECRET: "unit-test-secret",
});
require("dotenv").config = () => ({ parsed: {} });

const { Sequelize } = require("sequelize");
for (const method of ["authenticate", "query", "sync"]) {
  Sequelize.prototype[method] = async () => {
    throw new Error(`Unexpected MySQL ${method} in unit/API test; use an explicit mock`);
  };
}
// Also block callers bypassing the high-level Sequelize methods.
const mysql = require("mysql2");
for (const method of ["createConnection", "createPool"]) {
  mysql[method] = () => { throw new Error("Unexpected MySQL connection in unit/API test"); };
}
const cloudinary = require("cloudinary").v2;
cloudinary.config = () => ({});
for (const method of ["upload", "destroy", "upload_stream"]) {
  cloudinary.uploader[method] = () => {
    throw new Error(`Unexpected Cloudinary ${method} in test; use an explicit mock`);
  };
}
