# T19 — Chạy bộ kiểm thử

## Phạm vi

- Unit/API backend: không đọc env runtime, DB và provider phải được mock rõ ràng.
- UI unit/component: mapper, player, delivery, refresh/cache và form behavior.
- MySQL integration: fresh migration/seed, permission/publication, session, upload, listening durability, playlist concurrency, recommendation snapshot và legacy migration. Schema lifecycle là một scenario tuần tự; các bước không được chạy riêng/race với reset khác.
- Full-stack browser: Next production UI thật, Express thật và MySQL test thật. Ca admin giữ request kiểm tra phiên ban đầu đến sau khi nhập username, rồi trả response thật để xác nhận draft không bị reset. Gateway test chuyển /api tới Express test; không stub response nghiệp vụ. Chỉ Cloudinary adapter được mock, seed media là WAV/PNG synthetic.
- Browser regression riêng: player errors/queue/listening, account cache/refresh, routes/keyboard/responsive; các bộ này dùng fixture API và bổ sung failure coverage cho full-stack journey.

## Chuẩn bị

Node 22.15+, dependencies cài từ lockfile trong UI và Server. MySQL 8 test disposable theo DATABASE_SETUP_VI.md, env ignored chứa NODE_ENV=test, TEST_DB_* và TEST_DB_RESET_ALLOWED=yes; cần TEST_SEED_PASSWORD, JWT secrets test và config provider test. Không dùng Server/.env hoặc credentials production.

Docker test (repo root):

```powershell
docker compose --env-file .local-backups/t04/test.env -f docker-compose.test.yml -p tunetrek-t04-test up -d --wait --wait-timeout 180
```

Frontend production (terminal riêng, dừng dev trước build):

```powershell
cd D:\code\TTCS-PROJECT\UI
$env:API_INTERNAL_URL = "http://127.0.0.1:5000"
npm run build
npm start -- --port 3016
```

Không cần khởi động API demo. E2E tự dựng Express và gateway local, dùng MySQL test, đóng browser/HTTP/DB khi xong. Backend test không load Server/.env. Server Next thuộc terminal người dùng, giữ mở đến hết bộ suite.

## Chạy bắt buộc từ repo root

```powershell
$env:PLAYWRIGHT_MODULE_PATH = "C:/Users/DINH BAO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
node --env-file=.local-backups/t04/test.env scripts/verify-t19.cjs
```

PLAYWRIGHT_MODULE_PATH là đường dẫn thư mục package Playwright có sẵn trên máy; thay cho máy khác. Script không cài dependency tự động. T19_NEXT_URL đổi origin Next local, mặc định http://127.0.0.1:3016. Gateway chỉ cho Next trên loopback; browser chỉ đọc/ghi database test đã guard.

Runner chạy tuần tự, dừng ngay khi một stage fail; stage chưa chạy là NOT_RUN, không được coi là pass. suite-summary.json chỉ PASS khi mọi stage bắt buộc đạt. Cross-origin browser/media và các nhóm player/listening/account được bật rõ trong runner, không skip ngầm để xanh. Lưu evidence dưới docs/verification/evidence/T19, không ghi đè T07/T08/T14/T17.

Có thể chạy một suite để debug bằng scripts package, nhưng kết quả đó không thay thế toàn bộ runner:

```powershell
node --env-file=.local-backups/t04/test.env Server/tests/helpers/run-integration.cjs
node --env-file=.local-backups/t04/test.env --test UI/tests/e2e/full-stack.test.mjs
```

Không chạy hai suite có reset cùng một database đồng thời. Mỗi E2E tạo schema/seed mới và danh tính riêng; không dựa vào dữ liệu cuối integration. Seed song/publication và private playlist được điều chỉnh chỉ trong database disposable. UI tạo playlist public; test chuyển đúng playlist mình sở hữu thành private để kiểm tra isolation, không giả định UI có nút privacy.

## Coverage và giới hạn

Runner ghi experimental Node coverage cho backend unit/API trong backend-unit-api.log. Dùng để xác định vùng chưa chạm, không target 100%. Integration/MySQL và browser evidence chứng minh những đường không thể phản ánh đủ bằng coverage unit. Chưa có provider Cloudinary thật, HTTPS/domain thật, clone sạch Docker toàn stack hay CI release; thuộc T20/T21/T23. Không dùng kết quả T19 để claim chứng nhận bảo mật hoặc production readiness.


Coverage ngày 2026-11-08 (backend unit/API, chưa gộp integration/browser): ví dụ song.service.js 22.07% lines, upload.service.js 10.62%, snapshot.service.js 20.00%, session.service.js 37.00%. Những đường ghiDB/transaction bị mock ở unit được kiểm chứng riêng bởi MySQL integration và E2E; không được suy ra chúng đã cover chỉ từ tỷ lệ tổng (có cả files test/helper). Còn rủi ro cần kiểm chứng khi deploy: timeout/throttling/provider thực, HTTPS cookie/proxy/domain, backup/restore và CI clone sạch. Xem raw coverage cuối backend-unit-api.log và bảng AT ở báo cáo T19.


## Regression phát hiện trong T19

Form đăng nhập admin từng nằm trong các cache boundary có key theo epoch. Khi auth bootstrap đổi epoch, form bị unmount và mất username đang gõ. Bản sửa giữ cache user ngoài admin subtree và giữ cache admin chỉ trên các trang riêng đã đăng nhập. UI login không bị remount bởi quá trình khám phá phiên. Full-stack test giữ request bootstrap admin, nhập username, thả response thật rồi kiểm tra draft giữ nguyên; bản build cũ tái hiện thất bại có kiểm soát trong admin-bootstrap-before.log. Không thêm retry hoặc sleep để che lỗi.

Finding từ QA ảnh E2E: T19-F01 — thiếu UI/public/images/default-song.jpg, empty player hiển thị ảnh fallback hỏng. Các fixture image trước đó che khác biệt này. Đã xử lý T20: SVG placeholder có trong image và load thành công; chưa có asset-completeness assertion toàn site.
