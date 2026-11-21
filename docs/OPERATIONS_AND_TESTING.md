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
node scripts/generate-demo-audio.cjs
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose exec -T ingress nginx -t
docker compose --profile demo run --rm --build seed
docker compose exec -T api npm run recommendations:rebuild
```

Mở `http://localhost:3000/Home`. Seed chỉ dùng một lần trên DB rỗng tên `tunetrek_demo` hoặc `tunetrek_demo_<suffix>`. Đặt `DEMO_SEED_PASSWORD` cho `demo_userA`, `demo_userB`, `demo_cold_start` và `DEMO_ADMIN_PASSWORD` cho `demo_admin`, `demo_super_admin`. Hai giá trị phải khác nhau, mỗi giá trị ít nhất 12 ký tự và tối đa 72 byte UTF-8. Seed từ chối giá trị mẫu hoặc bỏ trống. Compose bật `DEMO_SEED_ALLOWED=yes` và `DEMO_LOCAL_MEDIA=yes` để tạo 28 bài synthetic dài 25–30 giây với cao độ, giai điệu và nhịp khác nhau. Với DB demo đã seed bằng mật khẩu chung, đăng nhập từng tài khoản đặc quyền và đổi mật khẩu qua `POST /api/users/admin/change-password` trước khi dùng lại DB đó. Test fixtures tiếp tục dùng `TEST_SEED_PASSWORD`.

Stack khởi động theo thứ tự DB → migrate → API → web → ingress. Ingress giữ cổng `127.0.0.1:${WEB_PORT:-3000}`, định tuyến `/api` và `/health` thẳng tới API và chuyển các request còn lại tới Next.js. DB không publish port mặc định. Khi cần API host dùng [local override](../docker-compose.local.yml). API chỉ có DML, migrator có DDL riêng. [Init hook](../db/10-app-permissions.sh) chỉ chạy trên volume mới; volume cũ cần cấp quyền có phối hợp, không xóa volume để ép hook chạy lại.

Ingress ghi đè `X-Forwarded-For` bằng IP TCP peer. Compose cấu hình `TRUSTED_PROXY_CIDRS` cho API bằng IP ingress `/32` (mặc định `172.30.248.2/32`). Nếu subnet trùng mạng hiện có hoặc chạy nhiều stack, đặt `COMPOSE_FRONTEND_SUBNET` khác nhau và chọn `COMPOSE_INGRESS_IP` tương ứng trong mỗi subnet. Nếu Docker Desktop, NAT hoặc tunnel gộp nhiều kết nối thành cùng một IP mà ingress thấy, các kết nối đó sẽ dùng chung bucket. Để giữ IP gốc qua một lớp ingress khác, cần cấu hình lớp nhận IP xác thực từ proxy đó và giới hạn kết nối tới ingress theo topology đã triển khai. Với API chạy ngoài Compose, chỉ đặt `TRUSTED_PROXY_CIDRS` cho IP/CIDR hẹp của proxy có kiểm soát header và giữ API ở mạng riêng. Để trống khi chạy API trực tiếp hoặc dùng Next rewrites qua localhost.

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

Seed host cần `NODE_ENV=development`, `DEMO_SEED_ALLOWED=yes` và cặp mật khẩu demo như trên. Bật `DEMO_LOCAL_MEDIA=yes` để phát nhạc synthetic demo. Nếu không bật, seed có thể dùng URL example.test không phát được. Rebuild explicit sau seed hoặc đổi catalog/signals/config; chưa rebuild thì personal dùng trending, similar có thể rỗng.

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

### Audio và gợi ý cho demo

Chạy `node scripts/generate-demo-audio.cjs` từ root trước khi khởi động/build UI để tạo 28 tệp WAV riêng trong `UI/public/demo` (Next phục vụ qua `/demo/track-01.wav` … `/demo/track-28.wav`). Mỗi bài dài 25–30 giây; phát liên tục hơn 20 giây để đủ điều kiện ghi nhận lượt nghe, không tua để thay thế thời gian nghe thật. Quy tắc 20 giây không thay đổi; test seed vẫn dùng fixture cũ.

Ngay sau `npm --prefix Server run db:seed:demo`, chạy `npm --prefix Server run recommendations:rebuild` để có snapshot gợi ý active. Với Docker, ngay sau seed chạy `docker compose exec -T api npm run recommendations:rebuild`. Các lệnh này cần MySQL hoạt động và cấu hình môi trường tương ứng.

Trang `/administrator` và đường dẫn cũ `/administrator/Statistics` đều chuyển đến `/administrator/PendingSongs`.

## Nghiệm thu Phase 4/5 trên MySQL thật

Docker/MySQL không chạy trong lượt kiểm tra Phase 5 local; các bước dưới đây là checklist cần chạy trên máy cá nhân trước push. `config --quiet` chỉ kiểm tra cấu hình, không chứng minh image build, Nginx routing hoặc DB transaction đã hoạt động.

Với DB cũ: backup và dừng writers trước migration. Với checkout mới: quickstart bên trên tự chạy toàn bộ migrations trước API. Migration [20261120000100](../Server/migrations/20261120000100-song-moderation-metadata.js) thêm `songs.rejection_reason VARCHAR(500) NULL` và `reviewed_at DATETIME NULL`, forward-only; không tự backfill lý do cũ.

```powershell
docker compose stop api web
docker compose run --rm --build migrate
docker compose up -d --build --wait --wait-timeout 240
docker compose exec -T ingress nginx -t
# Mở mysql client; dùng mật khẩu app từ .env khi được hỏi (không dán secret vào shell history):
docker compose exec db sh -c 'exec mysql -u"$MYSQL_USER" -p "$MYSQL_DATABASE"'
```

Trong MySQL client, chạy các câu sau; chọn user có receipts và thay cursor boundary bằng timestamp/song ID có thật để kiểm tra trang tiếp theo:

```sql
SELECT name FROM SequelizeMeta ORDER BY name;
SHOW COLUMNS FROM songs LIKE 'rejection_reason';
SHOW COLUMNS FROM songs LIKE 'reviewed_at';
SHOW INDEX FROM UserActivities;
SHOW INDEX FROM song_artists;
SHOW INDEX FROM artists;
SHOW INDEX FROM songs;
SET @uid = (SELECT user_id FROM UserActivities GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 1);
SET @cursor_time = '2026-11-21 00:00:00.000000';
SET @cursor_id = 2147483647;
EXPLAIN SELECT s.song_id, s.title, recent.last_played
FROM (SELECT song_id, MAX(created_at) AS last_played
      FROM UserActivities WHERE user_id = @uid GROUP BY song_id) recent
JOIN songs s ON s.song_id = recent.song_id
WHERE s.status = 'approved' AND s.is_visible = 1
  AND (recent.last_played < @cursor_time
       OR (recent.last_played = @cursor_time AND s.song_id < @cursor_id))
ORDER BY recent.last_played DESC, s.song_id DESC LIMIT 21;
EXPLAIN SELECT s.song_id FROM songs s
WHERE s.status = 'approved' AND s.is_visible = 1
  AND (s.title LIKE '%Jazz%' OR EXISTS (
    SELECT 1 FROM song_artists sa JOIN artists a ON a.artist_id = sa.artist_id
    WHERE sa.song_id = s.song_id AND a.name LIKE '%Jazz%'))
ORDER BY s.view_count DESC, s.song_id ASC LIMIT 20 OFFSET 0;
```

Xác nhận `idx_user_song_created` có đúng thứ tự `(user_id,song_id,created_at)` và PK song_artists `(song_id,artist_id)`. Lưu `possible_keys`, `key`, `rows`, `Extra` của EXPLAIN; optimizer có thể chọn scan với fixture nhỏ, aggregate/sort có thể cần temporary/filesort. Không tuyên bố “index-only/no filesort” hoặc search dùng index cho `%keyword%`. Chạy lại truy vấn F2 bỏ predicate cursor để đối chiếu trang đầu; dùng API lấy cursor thật, kiểm tra không trùng song và giữ thứ tự khi timestamp bằng nhau.

Full regression giống CI, trên DB test riêng (runner reset dữ liệu):

```powershell
# Tạo test.env theo phần Tests và CI; TEST_DB_RESET_ALLOWED=yes, chỉ DB disposable.
docker compose --env-file .local-backups/t04/test.env -f docker-compose.test.yml -p tunetrek-t04-test up -d --wait --wait-timeout 180
npm install --prefix .local-backups/phase5/browser --no-save --package-lock=false --ignore-scripts playwright@1.62.1
& ./.local-backups/phase5/browser/node_modules/.bin/playwright.cmd install chromium
$env:PLAYWRIGHT_MODULE_PATH = (Resolve-Path .local-backups/phase5/browser/node_modules/playwright).Path
$env:PLAYWRIGHT_CHANNEL = 'chromium'
$env:API_INTERNAL_URL = 'http://127.0.0.1:5000'
npm --prefix UI run build
node --env-file=.local-backups/t04/test.env scripts/ci/run-stack.cjs
```

Runner tự start/stop Next cổng 3016 rồi chạy MySQL integration, full-stack E2E, player, account và accessibility; không chạy đồng thời với runner reset DB khác. Khi cần E2E riêng với Next đã chạy: `node --env-file=.local-backups/t04/test.env --test --test-concurrency=1 UI/tests/e2e/full-stack.test.mjs`. Provider vẫn mock trong suite; upload Cloudinary thật cần smoke riêng. Sau seed demo và rebuild, kiểm tra thủ công Library F1/F2, moderation reason, nghe mới rồi load-more, đổi tài khoản, và onboarding của `demo_cold_start`.

## Dependency audit — 2026-11-21

Next.js và eslint-config-next nâng từ 16.4.2 lên **16.4.6**, giữ React/React DOM 19.3.1 và major Next 16; lockfile được npm cập nhật. Không tắt security check, không dùng `npm audit fix --force`. Registry `npm view next@16 version` tại thời điểm kiểm tra kết thúc ở 16.4.6. Các advisory Next qua 16.4.4 được mô tả tại [Next.js security advisories](https://github.com/vercel/next.js/security/advisories).

| Audit sau nâng cấp | High/critical | Moderate | Phạm vi còn lại |
|---|---|---:|---|
| UI | 0/0 | 7 | Dev lint: minimatch và chuỗi typescript-eslint |
| Server | 0/0 | 7 | 5 package dev qua sequelize-cli; 2 package runtime sequelize/uuid |

UI: [minimatch globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) đi qua `@typescript-eslint/typescript-estree`, parser/utils/type-utils/eslint-plugin và typescript-eslint. Server dev: cùng minimatch qua editorconfig/glob/js-beautify/sequelize-cli, cộng [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4). Không nhận glob input không tin cậy khi chạy tooling; migrator image có dev dependencies nên vẫn phải giới hạn môi trường vận hành. npm đề xuất downgrade sequelize-cli ngoài range hiện tại; chưa force thay đổi tooling migration trong lúc không có MySQL để kiểm chứng.

**Không gọi tất cả advisory là dev-only:** [uuid buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq) ảnh hưởng dependency runtime của Sequelize. Audit gợi ý downgrade Sequelize xuống 3.30.0 (breaking), nên giữ 6.37.8 và ghi nhận rủi ro còn mở; chưa chứng minh khả năng khai thác trong app và không coi là miễn nhiễm. Kiểm tra lại `npm audit --prefix Server`, `npm audit --prefix UI` trước release vì advisory có thể thay đổi.

### Kết quả local Phase 5 — 2026-11-21

| Lệnh | Kết quả thực chạy |
|---|---|
| `npm --prefix Server test` | 145 pass, 0 fail/skipped |
| `npm --prefix Server run lint` | Exit 0 |
| `npm --prefix UI run typecheck` | Exit 0 |
| `npm --prefix UI run lint` | Exit 0; 0 errors, 21 warnings còn tồn tại |
| `npm --prefix UI test` | 74 pass, 0 fail/skipped |
| `npm --prefix UI run build` | **Lần đầu sau upgrade pass**, Next 16.4.6; compile 12.2 giây, static pages 18/18; 0 SecurityFatalError |
| `docker compose --env-file .env.example config --quiet` | Exit 0; demo profile và local override cũng pass |
| `git diff --check` | Exit 0 |
| `npm ci --prefix UI --dry-run --ignore-scripts --no-audit --no-fund` và tương tự với `Server` | Exit 0; manifest/lockfile nhất quán, không thay thế cài/build container thật |
| Link check README và `docs/*.md` | 5 files, 77 internal links, 0 broken links (kiểm tra target và anchor nếu có) |
| `npm audit --prefix UI --omit=dev` | 0 vulnerabilities |
| `npm audit --prefix Server --omit=dev` | 2 moderate, exit 1; không có high/critical |

Build dùng `API_INTERNAL_URL=http://127.0.0.1:5000`, chuyển `.next` cũ sang backup trước khi chạy; Next vẫn đọc `.env.local` hiện có. Đây là build local sạch cache, chưa phải nghiệm thu container/checkout mới. Log local nằm trong `.local-backups/phase5/` (ignored). Audit đầy đủ có moderate nên exit 1 là kết quả dự kiến, không phải “audit sạch”.

CI đã dùng test seed riêng (`TEST_SEED_PASSWORD`), helper tự chạy migrations, API lint cài cả UI dependencies; không cần thay bằng demo passwords. Compose demo truyền riêng `DEMO_SEED_PASSWORD`/`DEMO_ADMIN_PASSWORD`; ingress là service riêng, build image do upstream cung cấp. Gate container được bổ sung validate demo profile và local DB override, không thay logic ứng dụng. Chưa chạy GitHub Actions/container builds/MySQL E2E trong phiên này.

Readiness trước push: `LICENSE` đang có trên disk nhưng chưa tracked ở thời điểm kiểm tra; cần đưa vào candidate để link tồn tại trên checkout mới. `.dockerignore` root và việc xóa file ghi chú DB là thay đổi đã có trước Phase 5, không được agent sửa/stage/commit. Hai build context `Server/` và `UI/` đã có `.dockerignore` riêng được tracked. Không tự commit trong lượt này.
