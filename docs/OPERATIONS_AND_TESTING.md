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
docker compose exec -T ingress nginx -t
docker compose --profile demo run --rm --build seed
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

### Audio và gợi ý cho demo Phase 3

Chạy `node scripts/generate-demo-audio.cjs` từ root trước khi khởi động/build UI để tạo 28 tệp WAV riêng trong `UI/public/demo` (Next phục vụ qua `/demo/track-01.wav` … `/demo/track-28.wav`). Mỗi bài dài 25–30 giây; phát liên tục hơn 20 giây để đủ điều kiện ghi nhận lượt nghe, không tua để thay thế thời gian nghe thật. Quy tắc 20 giây không thay đổi; test seed vẫn dùng fixture cũ.

Ngay sau `npm --prefix Server run db:seed:demo`, chạy `npm --prefix Server run recommendations:rebuild` để có snapshot gợi ý active. Với Docker, ngay sau seed chạy `docker compose exec -T api npm run recommendations:rebuild`. Các lệnh này cần MySQL hoạt động và cấu hình môi trường tương ứng.

Trang `/administrator` và đường dẫn cũ `/administrator/Statistics` đều chuyển đến `/administrator/PendingSongs`.
