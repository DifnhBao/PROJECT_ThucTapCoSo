# TuneTrek

Website nghe nhạc với Next.js/React, Express, MySQL và Cloudinary; recommendation phục vụ bằng Node. Dự án bắt đầu là đồ án nhóm **2 người**, sau đó được Lê Đình Bảo refactor và phát triển thêm cho portfolio cá nhân.

## Trạng thái hiện tại

| Phạm vi | Demo được | Điều kiện chạy | Giới hạn |
|---|---|---|---|
| Catalog, search, player | Khám phá/phát bài công khai, queue/shuffle/repeat | API + DB; media truy cập được | Chỉ approved + visible; seed dùng tone synthetic |
| Tài khoản và library | Login/refresh/logout, favorite/rating, playlist | Cookie cùng origin, migrations đầy đủ | Quyền owner/admin theo API; chưa test lại mọi edge case ở Phase 1 |
| Upload và moderation | Upload pending, admin approve/reject/hide | Cloudinary thật để upload | URL public legacy chưa tự được thu hồi |
| Recommendation | Hybrid, explanation, public fallback | Rebuild offline để có neighbors | Synthetic evaluation; chưa chứng minh tốt hơn Content-only |
| Demo HTTPS | Có scripts và showcase đã lưu | Máy/Docker/tunnel online, cấu hình riêng | Không phải hosting 24/7; URL có thể đổi |

Following, Daily Mix tự động, comment, forgot password và Python serving không được coi là chức năng đã hoàn thiện. Phase 1 hiện tại chỉ dọn repo/tài liệu; không xác nhận CI hoặc demo live của working tree đã đạt.

## Quickstart bằng Docker

Dùng Docker Compose v2/Linux containers. Từ root, tạo `.env` từ mẫu nếu chưa có, điền password riêng, JWT secrets và cấu hình theo [hướng dẫn vận hành](docs/OPERATIONS_AND_TESTING.md).

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Chỉnh .env trước khi chạy:
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose --profile demo run --rm --build seed
```

Seed chỉ dành cho DB demo rỗng và cần `DEMO_SEED_PASSWORD`. Mở `http://localhost:3000/Home`. Không seed/reset lại DB đang dùng.

## Bốn tài liệu chính

- [Kiến trúc](docs/ARCHITECTURE.md): auth/session, playlist concurrency, publication/media proxy.
- [Vận hành và kiểm thử](docs/OPERATIONS_AND_TESTING.md): Docker/manual, env, migrations/seed, CI/test, backup.
- [Recommendation và đánh giá](docs/RECOMMENDATION_AND_EVALUATION.md): ranking, atomic snapshots, offline protocol, Python research.
- [Showcase và đóng góp](docs/SHOWCASE_AND_CONTRIBUTION.md): screenshot/video, attribution hai giai đoạn và quyền sử dụng.
