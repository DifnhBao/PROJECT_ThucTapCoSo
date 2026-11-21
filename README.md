# TuneTrek

Website nghe nhạc với Next.js/React, Express, MySQL và Cloudinary; recommendation phục vụ bằng Node. Dự án bắt đầu là đồ án nhóm **2 người**, sau đó được Lê Đình Bảo refactor và phát triển thêm cho portfolio cá nhân.

Trọng tâm kỹ thuật: session lifecycle/refresh rotation có phát hiện reuse; playlist transactions và row locks chống race; trusted Nginx ingress tách IP quota; media proxy stream hỗ trợ byte-range và timeout chỉ chờ header; recommendation publish snapshot nguyên tử. Ba hành trình đã triển khai: **F1 — Bài tôi đã gửi & lý do moderation**, **F2 — Nghe gần đây với cursor pagination và revalidation theo tài khoản**, **F3 — cold-start onboarding chọn bài yêu thích**. Các test và giới hạn nghiệm thu nằm trong bốn tài liệu bên dưới.

## Trạng thái hiện tại

| Phạm vi | Demo được | Điều kiện chạy | Giới hạn |
|---|---|---|---|
| Catalog, search, player | Khám phá/phát bài công khai, queue/shuffle/repeat | API + DB; media truy cập được | Chỉ approved + visible; seed dùng 28 bản synthetic 25–30 giây |
| Tài khoản và library | Login/refresh/logout, favorite/rating, playlist | Cookie cùng origin, migrations đầy đủ | Mock tests không thay kiểm thử transaction MySQL thật |
| F1/F2/F3 | Trạng thái bài gửi/lý do từ chối; lịch sử phân trang; chọn 3–10 bài khởi tạo gu nhạc | Migration moderation, activity receipts, snapshot đã rebuild | Lịch sử không phải snapshot bất biến; onboarding không bảo đảm luôn có neighbors |
| Upload và moderation | Upload pending, admin approve/reject/hide | Cloudinary thật để upload | URL public legacy chưa tự được thu hồi |
| Recommendation | Hybrid, explanation, public fallback | Rebuild offline để có neighbors | Synthetic evaluation; chưa chứng minh tốt hơn Content-only |
| Demo HTTPS | Có scripts và showcase đã lưu | Máy/Docker/tunnel online, cấu hình riêng | Không phải hosting 24/7; URL có thể đổi |

Following, Daily Mix tự động, comment, forgot password và Python serving không được coi là chức năng đã hoàn thiện. Kết quả kiểm tra local không thay xác nhận CI GitHub, MySQL thật hoặc demo live.

## Quickstart bằng Docker

Dùng Docker Compose v2/Linux containers. Từ root, tạo `.env` từ mẫu nếu chưa có, điền password riêng, JWT secrets và cấu hình theo [hướng dẫn vận hành](docs/OPERATIONS_AND_TESTING.md).

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Chỉnh .env trước khi chạy:
node scripts/generate-demo-audio.cjs
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose --profile demo run --rm --build seed
docker compose exec -T api npm run recommendations:rebuild
```

Seed chỉ dành cho DB demo rỗng và cần hai mật khẩu khác nhau qua `DEMO_SEED_PASSWORD` (listener) và `DEMO_ADMIN_PASSWORD` (admin và super admin). Mở `http://localhost:3000/Home`. Không seed/reset lại DB đang dùng.

## Bốn tài liệu chính

- [Kiến trúc](docs/ARCHITECTURE.md): auth/session, playlist concurrency, publication/media proxy.
- [Vận hành và kiểm thử](docs/OPERATIONS_AND_TESTING.md): Docker/manual, env, migrations/seed, CI/test, backup.
- [Recommendation và đánh giá](docs/RECOMMENDATION_AND_EVALUATION.md): ranking, atomic snapshots, offline protocol, Python research.
- [Showcase và đóng góp](docs/SHOWCASE_AND_CONTRIBUTION.md): screenshot/video, attribution hai giai đoạn và quyền sử dụng.

### Audio và gợi ý cho demo

Chạy `node scripts/generate-demo-audio.cjs` từ root trước khi khởi động/build UI để tạo 28 tệp WAV riêng trong `UI/public/demo` (Next phục vụ qua `/demo/track-01.wav` … `/demo/track-28.wav`). Mỗi bài dài 25–30 giây; phát liên tục hơn 20 giây để đủ điều kiện ghi nhận lượt nghe, không tua để thay thế thời gian nghe thật. Quy tắc 20 giây không thay đổi; test seed vẫn dùng fixture cũ.

Ngay sau `npm --prefix Server run db:seed:demo`, chạy `npm --prefix Server run recommendations:rebuild` để có snapshot gợi ý active. Với Docker, ngay sau seed chạy `docker compose exec -T api npm run recommendations:rebuild`. Các lệnh này cần MySQL hoạt động và cấu hình môi trường tương ứng.

Trang `/administrator` và đường dẫn cũ `/administrator/Statistics` đều chuyển đến `/administrator/PendingSongs`.
