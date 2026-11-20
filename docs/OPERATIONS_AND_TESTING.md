# Vận hành và kiểm thử

Lệnh chạy từ root trừ khi ghi khác. Dùng Node 22.19.0 như CI, MySQL 8, Docker Compose v2/Linux containers. Cài bằng `npm ci --prefix Server` và `npm ci --prefix UI`; không force-upgrade dependency.

## Cấu hình

| File mẫu → file local | Mục đích |
|---|---|
| [.env.example](../.env.example) → `.env` | Docker toàn stack |
| [Server/.env.example](../Server/.env.example) → `Server/.env` | API host |
| [UI/.env.example](../UI/.env.example) → `UI/.env.local` | Next dev/build |
| [Server/.env.test.example](../Server/.env.test.example) → file test ignored | Integration/DB disposable |

Không ghi đè env đã có. Root/app/migrator dùng password riêng; `JWT_SECRET` và `JWT_REFRESH_SECRET` ngẫu nhiên, khác nhau, ít nhất 32 ký tự. Runtime dùng `DB_HOST/PORT/NAME/USER/PASS`; migrations cần `MIGRATION_DB_USER/PASS`. `WEB_ORIGINS` khớp origin web; production cần HTTPS và `APP_NODE_ENV=production`. Upload cần `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` thật; `local-demo` chỉ là placeholder cho demo không gọi provider.

Next cần `API_INTERNAL_URL` lúc build: host `http://127.0.0.1:5000`, Compose `http://api:5000`. Đổi upstream phải build lại. Không đưa secret vào `NEXT_PUBLIC_*`. Port web mặc định 3000; đổi `WEB_PORT` cần đổi origin.

## Docker local

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Điền cấu hình trước khi khởi động.
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose --profile demo run --rm --build seed
```

Mở `http://localhost:3000/Home`. Seed chỉ dùng một lần trên DB rỗng tên `tunetrek_demo` hoặc `tunetrek_demo_<suffix>`, `DEMO_SEED_PASSWORD` thực tế 12–72 ký tự. Compose bật `DEMO_SEED_ALLOWED=yes`, `DEMO_LOCAL_MEDIA=yes`: 28 bài synthetic dùng tone 440Hz tự sinh. Accounts: demo_userA, demo_userB, demo_admin, demo_super_admin, demo_cold_start; password từ env. Không seed lại khi restart.

Stack DB → migrate → API → web. DB không publish port mặc định; khi cần API host dùng [local override](../docker-compose.local.yml). API chỉ có DML, migrator có DDL riêng. [Init hook](../db/10-app-permissions.sh) chỉ chạy trên volume mới; volume cũ cần cấp quyền có phối hợp, không xóa volume để ép hook chạy lại.

## Chạy thủ công và migrations

Chuẩn bị MySQL, DB rỗng, app/migrator accounts và env trên. Sau đó:

```powershell
npm ci --prefix Server
npm ci --prefix UI
npm --prefix Server run db:migrate -- --env development
npm --prefix Server run db:seed:demo
npm --prefix Server run recommendations:rebuild
npm --prefix Server run dev
# Terminal thứ hai:
npm --prefix UI run dev
```

Seed host cần `NODE_ENV=development`, `DEMO_SEED_ALLOWED=yes` và password hợp lệ; bật `DEMO_LOCAL_MEDIA=yes` để phát tone demo. Nếu không bật, seed có thể dùng URL example.test không phát được. Rebuild explicit sau seed hoặc đổi catalog/signals/config; chưa rebuild thì personal dùng trending, similar có thể rỗng.

[Migrations](../Server/migrations/) là nguồn schema; legacy ở thư mục con không chạy tự động. Không sửa applied migrations hoặc thay baseline bằng SQL dump. DB cũ cần đủ lịch sử/schema mới tự nhận diện được. MySQL DDL implicit commit: backup, thử clone và lên lịch bảo trì trước nâng cấp. Session migration buộc phiên legacy login lại.

Docker nâng cấp: backup → `docker compose stop api web` → `docker compose run --rm migrate` → `docker compose up -d --build --wait --wait-timeout 240`. Không chạy nhiều migration jobs đồng thời, không dùng `down -v` để dọn ứng dụng.

## Health, cleanup, backup và HTTPS

- `/health/live` kiểm tra process; `/health/ready` kiểm tra DB/migrations, trả 503 khi chưa sẵn sàng. Xem `docker compose ps` và `docker compose logs --tail 100 api migrate`.
- `npm --prefix Server run uploads:cleanup` dùng đúng runtime/provider env. Persist journal `.runtime`. Chỉ dùng `-- --recover-stale-writers-stopped` khi đã dừng mọi upload writer; recovery dành cho processing stale hơn 30 phút. Chưa có scheduler.
- Backup: dừng writes, chạy `node scripts/stack-backup.cjs backup --stack-env .env --project <project>`. Restore dùng file ignored có `RESTORE_ALLOWED=yes`, chạy `node --env-file=.local-backups/restore.env scripts/stack-backup.cjs restore --stack-env .env --project <project> --file <backup.sql> --target tunetrek_restore_check`. Target phải mới, helper kiểm tra provenance/hash. Giữ bản đã thử restore ngoài máy; SQL không chứa Cloudinary assets.
- `node scripts/deploy/tunnel-demo.cjs start`, `status`, `stop` dành cho máy đã có private env/manifest/pinned images. Không phải bootstrap checkout mới; không tự triển khai source đang sửa. Tunnel URL có thể đổi, máy/Docker phải online.
- `UI/hash.js` là utility thủ công nhận `HASH_PASSWORD` để tạo bcrypt hash, không tham gia UI runtime. Không công khai password/output nhạy cảm.

## Tests và CI

```powershell
npm --prefix Server test
npm --prefix UI test
npm --prefix Server run lint
npm --prefix UI run check
```

Backend lint dùng ESLint cài trong UI; UI `check` gồm typecheck/lint/test/build và cần `API_INTERNAL_URL`. Unit/API mock DB/provider; không thay integration hay provider smoke.

Full regression: tạo file ignored `.local-backups/t04/test.env` từ mẫu test, điền `NODE_ENV=test`, `TEST_DB_*`, `TEST_DB_RESET_ALLOWED=yes`, `TEST_SEED_PASSWORD`, JWT/provider test. Chọn tên/host DB được guard cho phép. Suite **drop toàn bộ bảng DB test**; không dùng DB demo/cá nhân, không chạy hai reset suites cùng DB đồng thời.

```powershell
docker compose --env-file .local-backups/t04/test.env -f docker-compose.test.yml -p tunetrek-t04-test up -d --wait --wait-timeout 180
$env:API_INTERNAL_URL = 'http://127.0.0.1:5000'
npm --prefix UI run build
npm --prefix UI start -- --port 3016
# Terminal khác, đặt PLAYWRIGHT_MODULE_PATH tới package Playwright trên máy:
node --env-file=.local-backups/t04/test.env scripts/verify-t19.cjs
```

[Runner](../scripts/verify-t19.cjs) cần Next đang chạy; `T19_NEXT_URL` mặc định `http://127.0.0.1:3016`. Playwright/browser cài riêng. E2E dùng API/MySQL thật, storage mock. Evidence sinh lại trong thư mục ignored, không thuộc candidate. Integration riêng: `node --env-file=.local-backups/t04/test.env Server/tests/helpers/run-integration.cjs`.

[CI](../.github/workflows/ci.yml): UI, API, MySQL/browser, dependency/secret gates, container builds, required aggregator. [Release workflow](../.github/workflows/release.yml) không thay smoke: review/stage, chạy CI trên commit, kiểm tra migration/health/media riêng rồi tag/publish thủ công. Rollback code phải tương thích schema. Security gate chặn high/critical theo [exception policy](security/dependency-exceptions.json); moderate và history còn cần rà soát, không coi scan hiện tại là chứng nhận sạch lịch sử. Không khẳng định CI working tree đã xanh khi chưa chạy.
