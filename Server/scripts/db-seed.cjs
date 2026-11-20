const mode = process.argv[2];
if (mode === 'test') process.env.NODE_ENV = 'test';
if (mode === 'demo') require('../src/config/env').loadEnvironment();
require('../database/seed.cjs').seed(mode).then((result) => {
  console.log(JSON.stringify(result));
  if (mode === 'demo') console.log('Next (required): npm --prefix Server run recommendations:rebuild — create active recommendation snapshots immediately after seeding. In Docker: docker compose exec -T api npm run recommendations:rebuild');
}).catch((error) => {
  console.error(error.message.startsWith('Seed refused:') ? error.message : 'Seed failed/refused. Verify explicit environment, password, migrations and empty target database; no credentials logged.');
  process.exitCode = 1;
});
