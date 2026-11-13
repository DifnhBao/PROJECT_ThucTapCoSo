# T23 — Chuẩn bị và nghiệm thu deploy demo

Ghi chép phương án Render ban đầu ngày 2026-11-13, **không áp dụng**. Người dùng ban đầu chọn Render, “My workspace”, ngân sách tuyệt đối **0 đồng**. Không tạo dịch vụ tính phí hoặc tự nâng gói.

**Quyết định mới hơn:** Filess thực tế trả MySQL 5.7.44 và một tài khoản DDL, nên người dùng đã chọn MySQL 8 local + HTTPS tunnel miễn phí. Phần Render dưới đây giữ làm lịch sử chuẩn bị, **không phải hạ tầng đang chạy**. Runbook đang áp dụng tại [LOCAL_HTTPS_DEMO_VI.md](LOCAL_HTTPS_DEMO_VI.md); runtime/browser/provider/operations đã được thử thật trên tunnel theo [T23](../verification/T23.md).

## Hiện trạng đã kiểm tra

- Source app đã có Docker API/migration/web và MySQL 8, health/live + ready, production cookies Secure/HttpOnly/SameSite=Lax, WEB_ORIGINS HTTPS chính xác và quyền DB app/migrator tách riêng.
- PR #2 đang draft/open, head `59999f057236e458819d30403e0200a88b4a1963`; chưa merge main. T22 docs và phần chuẩn bị T23 hiện ở workspace. Không coi source chưa qua CI là release đã được kiểm chứng.
- Release workflow hiện yêu cầu SHA nằm trên main và có push CI xanh; không tự hạ policy hoặc dùng main cũ để deploy. Khi có candidate đầy đủ phải chạy CI, chuẩn bị review/merge và chọn đúng SHA trước release.
- Sau khi người dùng xác nhận “My workspace”, đã liệt kê dịch vụ hiện có; không sửa chúng. Chưa tạo dịch vụ TuneTrek hoặc chi phí mới.
- Render hướng dẫn MySQL bằng private service + persistent disk; free service không có disk bền. Không tạo MySQL ephemeral rồi mô tả như database demo có persistence. Nguồn: [Render MySQL](https://render.com/docs/deploy-mysql), [free limits](https://render.com/docs/free), [disks](https://render.com/docs/disks).

## Các điểm cần quyết định khi chọn hạ tầng

| Điểm | Yêu cầu / xử lý |
|---|---|
| Hosting và ngân sách | Đã chọn Render Free, My workspace, 0 đồng; không đổi MySQL sang Postgres. Phải kiểm tra quota/billing hiện tại: Free có quota chung và có thể phát sinh overage nếu workspace có payment method; chỉ tạo khi bảo đảm hành vi dừng dịch vụ thay vì thu tiền |
| Database | DB demo mới, private là mục tiêu ban đầu; app chỉ DML và migrator riêng. Đã thêm DB_TLS_MODE=verify_identity (trust chain + hostname), CA tùy chọn và DB_POOL_MAX cho MySQL ngoài. Chưa có handshake với provider thật. Endpoint MySQL public qua TLS không được ghi là private network; nếu không đáp ứng yêu cầu ban đầu cần ghi rõ/được chủ dự án chấp nhận trước nghiệm thu |
| Seed | Hiện demo seed chỉ chấp nhận development + opt-in + tên tunetrek_demo* và host local/db; không mở guard cho mọi remote host. Render hostname riêng cần cơ chế bootstrap demo explicit hoặc import synthetic từ môi trường riêng đã kiểm tra |
| Provider | Cloudinary credentials cấu hình qua secret store, không gửi vào chat/Git. Fixture tone tự sinh chỉ chứng minh playback; upload/moderation cần gọi provider thật để nghiệm thu T23 |
| Network | Browser gọi /api cùng HTTPS origin qua Next. API_INTERNAL_URL chốt khi build web; hostname nội bộ phải phù hợp môi trường, không dùng nguyên http://api:5000 nếu hostname đó không tồn tại |
| Proxy/rate limits | Chỉ trust CIDR proxy đã xác định; không trust toàn bộ X-Forwarded-For. Kiểm tra trên domain thật để tránh mọi người dùng bị gom chung quota mà không biết |
| Filesystem | Temp upload writable/bounded; cleanup journal .runtime phải được lưu hoặc có quy trình recovery. Không coi free ephemeral filesystem là durable journal |
| Demo accounts | Listener có thể chia sẻ mật khẩu demo riêng nếu chủ dự án đồng ý; admin giữ riêng cho smoke. Không công khai password chung của seed vì seed hiện tạo cả admin/super_admin cùng password |

## Phương án ngân sách 0 đang chuẩn bị

- Một Render web service Free chạy hai tiến trình Node (Next + API); chỉ Next dùng public PORT, API bind 127.0.0.1:5000 trong cùng container. Image tại [deploy/render/Dockerfile](../../deploy/render/Dockerfile), kế hoạch chưa áp dụng tại [service-plan.json](../../deploy/render/service-plan.json). Không thêm paid disk/private service hoặc Render database.
- Launcher dừng tiến trình còn lại khi một tiến trình lỗi, chuyển SIGTERM và có deadline; không chạy migrations/seed trong startup. Nếu WEB_ORIGINS chưa có và Render xác nhận RENDER=true, dùng RENDER_EXTERNAL_URL đã validate HTTPS origin; không suy allowlist từ Host/header request. [Biến mặc định Render](https://render.com/docs/environment-variables).
- Filess.io là **ứng viên** MySQL ngoài: trang chính công bố Free 10MB/db, không cần thẻ, TLS; chưa kiểm chứng version/CA/khả năng tách quyền trên tài khoản thật. Không mặc định mọi shared DB tương thích schema/readiness. [Gói Filess](https://filess.io/).
- Aiven MySQL Free đang bị ngừng, không chọn dựa vào trang quảng bá cũ. [Thông báo](https://aiven.io/free-mysql-database-retired).
- File nhập thông tin DB nằm trong ignored `.local-backups/t23/mysql.env`; không đọc/ghi credential vào report. Người dùng đang cấu hình. Nếu provider cung cấp CA cần dùng CA đúng, không tắt verifyIdentity/rejectUnauthorized.
- Free Render có 512MB RAM, 0.1 CPU; build image đã đạt nhưng chưa đo RSS/cold start với workload thật. Giờ chạy free dùng chung workspace, dịch vụ có thể ngủ, filesystem/journal ephemeral; không quảng bá như hosting 24/7 hoặc persistence đầy đủ. [Giới hạn Free](https://render.com/docs/free), [compute plans](https://render.com/docs/compute-plans).

## Công cụ probe HTTPS đã chuẩn bị

`scripts/deploy/probe-https.cjs` chỉ kiểm tra endpoint thật, không mock ở lần chạy deploy. Không follow redirect khi có khả năng mang credentials; không ghi response body/cookie/password vào evidence. Không thay thế browser và operational smoke.

Tạo ignored `.local-backups/t23/probe.env` từ mẫu [probe/.env.example](probe/.env.example), điền origin thật. Không đưa mật khẩu vào command line. Có thể chạy public health trước, rồi bật session probe bằng credentials listener demo riêng và opt-in trong file.

```powershell
node --env-file=.local-backups/t23/probe.env scripts/deploy/probe-https.cjs
```

Public probe: live, ready, trang login, catalog. Session probe: login, cookie flags, profile, user bị từ chối admin API, refresh, logout, profile sau logout phải 401. Probe chỉ tạo/thu hồi session, không seed/reset/upload hoặc thay đổi bài/playlist.

Kết quả chỉ được tạo ở `docs/verification/evidence/T23/https-probe.json` sau khi target thật đạt. Unit tests dùng transport fixture chỉ xác minh guard/privacy, không chứng nhận domain, TLS, browser hoặc provider hoạt động.

## Ma trận nghiệm thu trên môi trường đích

| Hạng mục | Bằng chứng cần lưu | Hiện tại |
|---|---|---|
| Release provenance | SHA CI xanh, image digest hoặc build/deploy ID, URL, timestamp | NOT_RUN |
| Fresh DB + migrations + seed | Migration versions, synthetic-only, app DDL denied, DB không public | NOT_RUN |
| Browser listener | Login/search/audio actual progress/favorite/playlist/recommendation, không localhost/network mock | NOT_RUN |
| Auth/session | Secure cookies, refresh/logout/session expiry và user bị chặn admin, hostile Origin bị chặn | NOT_RUN |
| Moderation/provider | User upload pending → admin preview/approve/reject → public/hidden đúng, provider thật | NOT_RUN |
| Cold start/media failure | Thời gian đo thực và thông báo/khả năng thử lại | NOT_RUN |
| Restart/logs/readiness | Dữ liệu còn, requestId an toàn, ready phản ánh lỗi DB; không ảnh hưởng dữ liệu ngoài demo | NOT_RUN |
| Backup/restore | Backup có hash, restore DB riêng và business smoke; không ghi đè DB nguồn | NOT_RUN |
| Rollback code | Digest/SHA trước đã kiểm tra, schema tương thích, smoke lại | NOT_RUN |

Không chạy reset định kỳ tùy tiện trên demo có người sử dụng. Reset phải dừng writers, backup, xác định đúng DB demo và thông báo gián đoạn; không tái sử dụng lệnh test reset cho database khác. Chỉ publish tag sau smoke theo [release runbook](../RELEASE_VI.md).
