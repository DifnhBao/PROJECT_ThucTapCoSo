require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER, // Thay thế bằng tên biến trong .env của bạn
    password: process.env.DB_PASS, // Thay thế bằng tên biến trong .env của bạn
    database: process.env.DB_NAME, // Thay thế bằng tên biến trong .env của bạn
    host: process.env.DB_HOST, // Thường là 127.0.0.1 hoặc localhost
    port: process.env.DB_PORT, // Ví dụ: 3307
    dialect: "mysql",
    logging: false,
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
  },
};
