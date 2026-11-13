const { Sequelize } = require("sequelize");
const { loadEnvironment, getDatabaseConfig } = require("./env");
loadEnvironment();
const sequelize = new Sequelize(getDatabaseConfig());

module.exports = sequelize;
