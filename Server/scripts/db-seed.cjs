const { seed, SeedError } = require('../database/seed.cjs');

function describeSeedFailure(error) {
  if (error instanceof SeedError) return error.message;

  // Driver errors can contain credentials and raw SQL. Report fixed messages only.
  switch (error?.parent?.code) {
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_DBACCESS_DENIED_ERROR':
    case 'ER_TABLEACCESS_DENIED_ERROR':
    case 'ER_COLUMNACCESS_DENIED_ERROR':
    case 'ER_SPECIFIC_ACCESS_DENIED_ERROR':
      return 'Seed database permission error. Verify the application database credentials and DML grants.';
    case 'ER_BAD_DB_ERROR':
    case 'ER_NO_SUCH_TABLE':
    case 'ER_BAD_FIELD_ERROR':
    case 'ER_NO_DEFAULT_FOR_FIELD':
      return 'Seed database schema error. Verify the target database and apply its migrations.';
    case 'ER_DUP_ENTRY':
    case 'ER_LOCK_DEADLOCK':
      return 'Seed database conflict. Check for a concurrent seed or other writes to the target.';
    default:
      if (error?.name?.startsWith('SequelizeConnection')) return 'Seed database connection error. Verify the database is reachable.';
      if (error?.parent?.code || error?.name === 'SequelizeDatabaseError') return 'Seed SQL error. The database rejected an operation.';
      return 'Seed failed unexpectedly.';
  }
}

async function main(mode) {
  if (mode === 'test') process.env.NODE_ENV = 'test';
  if (mode === 'demo') require('../src/config/env').loadEnvironment();
  console.log(JSON.stringify(await seed(mode)));
  if (mode === 'demo') console.log('Next (required): npm --prefix Server run recommendations:rebuild — create active recommendation snapshots immediately after seeding. In Docker: docker compose exec -T api npm run recommendations:rebuild');
}

if (require.main === module) {
  main(process.argv[2]).catch((error) => {
    console.error(describeSeedFailure(error));
    process.exitCode = 1;
  });
}

module.exports = { describeSeedFailure };
