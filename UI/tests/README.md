# Unit and component test foundation

Run `npm test` (Node 22.15+ with module.registerHooks, existing TypeScript/React dependencies only).
`npm run test:unit` exercises the real PlayerService without browser or database.
`npm run test:components` renders real React components with react-dom/server.
The test-only loader transpiles TS/TSX in memory; it does not typecheck.
Run `npm run typecheck` separately. Existing type/lint failures are recorded in T00.

SSR assertions are not browser interaction/accessibility/E2E coverage. Add browser
coverage in the UI tasks/T19. Player shuffle/repeat/pagination fixes belong to T10;
the T00 smoke test is not evidence those known bugs have been fixed.
