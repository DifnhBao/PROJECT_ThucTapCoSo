# T20 — Vận hành Docker local

## Kiến trúc và cấu hình

Stack gồm MySQL 8.0.46 (digest cố định), migration job, Express API và Next production standalone. Node 22.19.0 là runtime đã kiểm chứng. API/web chạy UID 1000, root filesystem read-only; migration CLI chỉ có trong target migration. API không có mật khẩu root/migrator. DB chỉ nằm trên mạng database internal; API có thêm mạng frontend để phục vụ Next và gọi media provider khi cấu hình thật.

Next nhận API_INTERNAL_URL=http://api:5000 khi build image. Browser gọi /api cùng origin; /health/live và /health/ready cũng proxy về API. Đổi upstream phải build lại web image. Đây là image theo môi trường, chưa phải cơ chế promote một image qua mọi upstream.

Compose mặc định là local HTTP: backend APP_NODE_ENV=development để cookie localhost hoạt động, frontend vẫn là production build và backend chạy node trực tiếp. Khi deploy phải đặt APP_NODE_ENV=production, exact HTTPS WEB_ORIGINS và TLS/reverse proxy ở ngoài stack; không đổi production policy để chấp nhận HTTP. T23 kiểm chứng domain/provider thật.

## Chạy từ source sạch

Điền file .env từ .env.example. Giữ file hiện có nếu đã cấu hình; không chép đè credentials. Các password phải khác nhau; JWT secrets ngẫu nhiên, khác nhau, ít nhất 32 ký tự. Có thể sinh bằng node crypto.randomBytes. Không đưa secret vào Git hoặc log.

```powershell
# Chỉ dùng khi chưa có .env
Copy-Item .env.example .env
# Sau khi chỉnh đủ giá trị trong .env:
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
```

Giá trị CLOUDINARY_* cần hợp lệ khi upload; nếu chỉ xem demo local có thể dùng local-demo cho cả 3 biến để vượt kiểm tra cấu hình mà không gọi provider. Đây không phải credential Cloudinary dùng được. Root/migration/app password chỉ đi vào đúng service qua environment, không truyền bằng Docker build args. Không chia sẻ output docker inspect/config chứa environment đầy đủ.

Mở http://localhost:3000/Home (WEB_PORT có thể đổi; khi đổi port phải cập nhật WEB_ORIGINS tương ứng). Chỉ publish web trên loopback mặc định. Nếu cần Workbench từ host, dùng override rõ ràng:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --wait
```

DB_PORT mặc định 3306; đổi nếu trùng MySQL Windows. Không dùng override này khi deploy.

## Migration và seed

Migration job đợi DB khỏe rồi chạy đúng một lần; API chỉ được mở port sau khi authenticate và kiểm tra schema thành công. Mỗi lần nâng cấp source/schema cần chạy job trước API mới. Không chạy nhiều migration jobs đồng thời, không đưa DDL vào startup mọi replica. Migration target có Sequelize CLI; runtime API npm ci --omit=dev và không có CLI.

```powershell
docker compose stop api web
docker compose run --rm migrate
docker compose up -d --wait --wait-timeout 240
```

Không sửa applied migrations hoặc tự đánh dấu SequelizeMeta để vượt readiness. MySQL DDL không rollback toàn bộ như transaction; backup/restore và forward fix là đường phục hồi. Init db/10-app-permissions.sh chỉ chạy trên volume mới: app account chỉ DML; migrator có quyền trong đúng DB. Volume cũ cần DBA cấp riêng migrator sau khi backup, không xóa volume để ép init chạy lại.

Seed chỉ chạy một lần trên database rỗng có tên tunetrek_demo hoặc tunetrek_demo_<suffix>; cần DEMO_SEED_PASSWORD 12–72 ký tự và lệnh explicit:

```powershell
docker compose --profile demo run --rm --build seed
```

Seed tạo demo_userA, demo_userB, demo_admin, demo_super_admin, demo_cold_start; password lấy từ file env. Compose bật DEMO_LOCAL_MEDIA=yes:28 bài synthetic dùng cùng tone 440Hz tự sinh 6 giây, ảnh SVG placeholder. Không phải thư viện nhạc thật hay bằng chứng chất lượng gợi ý. Reproduce tone bằng node scripts/generate-demo-audio.cjs. Test seed vẫn giữ protocol/dataset T04/T15 cũ. Upload thực tế cần provider thật; storage mocked chỉ trong integration/E2E riêng.

## Health và logs

```powershell
curl.exe -i http://localhost:3000/health/live
curl.exe -i http://localhost:3000/health/ready
docker compose ps
docker compose logs --tail 100 api migrate
```

live chỉ phản ánh process; ready kiểm tra kết nối MySQL, exact migration names và critical columns, deadline 2.5 giây, không trả lỗi SQL/stack/credentials. DB down hoặc draining trả 503; không giả lập khỏe khi không phục vụ được. Full schema/index/FK checks thuộc integration, health không phải công cụ audit toàn DB. Web container health kiểm tra /login của chính Next; API ready có thể503 trong khi web vẫn chạy để hiển thị trạng thái lỗi.

Access log có event, requestId, method, route template, status và durationMs. Không log raw URL/query/body/cookies/Authorization. Logger không nhận object request hoặc error tùy ý. Docker json-file giới hạn10MB × 3 files/service. Không bật provider/SQL debug trên demo có dữ liệu thật.

## Shutdown, restart và tài nguyên

Docker gửi SIGTERM cho Node qua init. API chuyển draining, ngừng nhận request mới, chờ in-flight, đóng pool; deadline 10 giây, quá hạn force-close và exit1. stop_grace_period 20 giây. Các event shutdown_started/shutdown_complete xác nhận luồng bình thường; timeout không được xem là graceful success.

```powershell
docker compose restart api
docker compose stop db
# ready phải503, live vẫn200
docker compose start db
# đợi ready 200 và kiểm tra dữ liệu
```

DB volume mysql_data và journal volume api_runtime được giữ khi restart/down thông thường. Temp uploads dùng tmpfs 32MB, /tmp API 16MB; Next cache 64MB và /tmp 16MB. Giới hạn RAM: DB 768MB/API 384MB/web 512MB. Local volumes không có portable per-volume disk quota; provision dung lượng disk của Docker/host và cảnh báo khi còn dưới 20%. Không tự xóa dữ liệu DB để giải phóng disk. Journal cleanup nằm trên api_runtime; kiểm tra backlog và chạy cleanup CLI với provider đúng cấu hình theo UPLOAD_LIFECYCLE_VI.md.

## Backup và restore vào DB khác

Mục tiêu: backup transactional của schema/data ứng dụng, không dump system accounts hoặc provider assets. Dừng ghi trong lượt kiểm chứng để so sánh row counts với nguồn ổn định. Backup nằm dưới .local-backups/t20/backups, có SHA256/provenance JSON, không vào image/Git. Mật khẩu chỉ đọc trong container DB qua MYSQL_PWD, không ở command line.

Thay <project> bằng Compose project thật (xem docker compose ls). Helper dùng --stack-env để tránh trùng Node --env-file:

```powershell
docker compose stop api
node scripts/stack-backup.cjs backup --stack-env .env --project <project>
```

Tạo file ignored .local-backups/restore.env chỉ chứa RESTORE_ALLOWED=yes. Chọn tên DB mới tunetrek_restore_<suffix>, không tồn tại; copy đường dẫn backup từ output ở trên:

```powershell
node --env-file=.local-backups/restore.env scripts/stack-backup.cjs restore --stack-env .env --project <project> --file <backup.sql> --target tunetrek_restore_check
```

Helper từ chối thiếu opt-in, target sai prefix/đã tồn tại, file ngoài thư mục backup, provenance/hash sai hoặc SQL đổi database. Restore dùng root chỉ bên trong DB container để tạo DB mới; API không tự chuyển sang DB restore. Helper so sánh số rows mọi bảng; cần thêm business smoke trước cutover thật. Nếu restore lỗi giữ target để điều tra, không tự drop hoặc ghi đè nguồn.

```powershell
docker compose start api
```

Giữ 7 bản daily đã kiểm chứng và một bản trước mỗi migration; đưa bản backup mã hóa ra ngoài máy theo chính sách của bạn. Chỉ dọn bản cũ sau khi có bản thay thế đã restore thành công. Volume trên cùng máy không thay cho backup ngoài máy. Media Cloudinary cần kế hoạch riêng của provider.

## Kiểm chứng T20

node --env-file=.local-backups/t20/stack.env scripts/verify-t20-stack.cjs chỉ dùng project disposable tunetrek-t20-verification và clean clone trong .local-backups/t20. Cần Playwright/Edge, PLAYWRIGHT_MODULE_PATH trỏ package runtime có sẵn. Script yêu cầu stack mới, chưa seed; không dùng cho database demo cá nhân. Root secrets/env không được copy vào clean clone. Snapshot Git cục bộ phục vụ clone được tạo trong ignored backup; không commit repo chính hoặc publish source.

Git trên Windows phải tôn trọng .gitattributes (*.sh eol=lf); bản clone CRLF đã tái hiện lỗi bad interpreter trước bản sửa. Sau thay đổi runtime phải build/start từ clone mới và chạy smoke. Khi kết thúc có thể stop project test, giữ volumes/backup để xem lại. Không dùng lệnh xóa volume của project ứng dụng để làm sạch test.
