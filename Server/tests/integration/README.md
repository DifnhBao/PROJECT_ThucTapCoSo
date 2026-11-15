# MySQL integration tests — T04

This group is separate from `npm test`. See `docs/DATABASE_SETUP_VI.md` at the
repository root. It drops all tables in the explicitly selected disposable test
database before checking fresh migration/seed, HTTP policies and a legacy upgrade.

Set `NODE_ENV=test`, all `TEST_DB_*` values from `Server/.env.test.example`, and
`TEST_DB_RESET_ALLOWED=yes` explicitly in the shell before `npm run test:integration`.
The runner does not load `.env` or fall back to `DB_*`. Both the runner and the
runtime/migration test configuration apply the name/host guard before DB access.
Only local hosts and `mysql-test` are allowed; use a dedicated test DB/user.
Also supply TEST_SEED_PASSWORD and test-only JWT/Cloudinary config from the sample.
Missing configuration or missing integration tests is a nonzero exit / NOT_RUN.

Unit/API tests use `tests/helpers/unit-setup.cjs`: dotenv is disabled, MySQL access
and Cloudinary operations throw unless a test installs its own explicit mock.
