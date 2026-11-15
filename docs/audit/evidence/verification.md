# Verification notes

Audit completed 2026-10-16 (Asia/Saigon). Workspace: D:/code/TTCS-PROJECT.

## Commands actually executed

- `node --version`: v22.19.0; `npm --version`: 10.9.3; `python --version`: 3.13.9.
- In UI: `node_modules/.bin/tsc --noEmit --incremental false`: exit1.

```text
app/context/MusicDataContext.tsx(3,32): error TS2305: Module '"@/app/types/music"' has no exported member 'Artist'.
app/features/mix/mixService.ts(1,25): error TS2307: Cannot find module '@/app/utils/axiosClient' or its corresponding type declarations.
```

- In UI: `npm run lint -- --format json --output-file <audit-evidence-file>`: exit1, 116 files, 72 errors, 76 warnings. Full machine-readable messages in ui-eslint.json. Source/output properties removed to avoid unnecessary copies of source text.
- In UI and Server: `npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000`: exit1 because vulnerabilities were found. Initial sandbox network calls failed DNS; read-only registry requests outside the sandbox succeeded. Saved successful reports here.
- `docker compose config --services`: exit0; output `db` only. No containers started or databases modified.
- Git inventory: 403 tracked paths; existing tracked files approximately130.8MiB, tracked MP3 approximately66.0MiB.

## Isolated logic reproductions

These are source-level tests with mock dependencies, not live HTTP penetration tests. They used actual source modules executed in memory; no production credentials, database writes or network API calls.

1. **Privilege escalation:** `Server/src/services/user.service.js` loaded with mock User/bcrypt/password validation. Requester `{userId:2, role:'admin'}` and target `{user_id:99, role:'super_admin'}`. `resetUserPassword` called target.save. At line257, both `targetUser.id` and `requester.user_id` evaluate to undefined; isSelf becomes true.
2. **Refresh persistence:** installed jsonwebtoken with dummy secret, username100 characters and matching claim shape. Refresh JWT length333 exceeds model VARCHAR255. Same payload signed within one second produces identical JWTs without a random identifier. Database insertion behavior itself was not exercised.
3. **Shuffle:** actual PlayerService transpiled using installed TypeScript. Tracks1,2,3, current1, deterministic RNG0; setShuffle(true) changed service current to2. No browser/audio runtime used.
4. **Recommendation:** actual recommendation.service loaded with in-memory Song/model stubs. Empty approved result followed by pending visible fixture caused getTrendingSongs to return pending fixture. getSongPairDebug returned pending fixture with audio URL.

## Security handling

- No secret values are intentionally included in the report. Benchmark source contains a JWT literal; only its location and decoded expiry were documented. Expiry2026-06-18T04:35:09Z, already expired on audit date.
- Server/.env and AI_Services/.env ignored and untracked at inspected paths. Local git log for these paths did not show commits; this is not a complete secret scan across all historical paths.
- SQL user data was not copied into the audit report. Treat existing seed dumps as requiring review/replacement with synthetic data before publication.
- npm audit output identifies affected package nodes, not independently demonstrated exploitable application vulnerabilities. Advisory conditions must be triaged.

## Not executed

No application source fixes, migration/seed, package upgrades, full-stack boot, production build, Playwright/Lighthouse, load test, full-history secret scanner, live deployment verification or production API probing. Existing user working-tree edits preserved.
