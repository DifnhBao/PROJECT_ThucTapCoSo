const { getTestDatabaseConfig } = require('../../config/test-database');
module.exports = async function resetTestDatabase() {
  const config = getTestDatabaseConfig(process.env, { destructive: true });
  const connection = await require('mysql2/promise').createConnection({ host: config.host, port: config.port, user: config.username, password: config.password, database: config.database });
  try {
    const [[target]] = await connection.query('SELECT DATABASE() AS name');
    if (target.name !== config.database) throw new Error('Unexpected database; reset refused');
    const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    for (const row of tables) await connection.query('DROP TABLE ??', [Object.values(row)[0]]);
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    await connection.end();
  }
};
