# T07 — Quota, cookie, origin và proxy

## Topology và CSRF

V1 dùng browser → frontend cùng origin → rewrite `/api` đến backend riêng.
`WEB_ORIGINS` là allowlist **exact origin** của frontend: scheme + host + port,
không path, wildcard hoặc credentials. Production bắt buộc HTTPS. Không suy ra
origin từ Host, X-Forwarded-Host hoặc X-Forwarded-Proto.

Mọi mutation POST/PUT/PATCH/DELETE trên API, kể cả login/register/refresh/logout,
phải có Origin trong allowlist; absent/null/không được phép trả403 trước body
parser, auth service hoặc ghi file. `Sec-Fetch-Site: cross-site` cũng bị403.
GET/HEAD không cần Origin; Origin hiện diện nhưng lạ vẫn bị chặn. OPTIONS hợp lệ
do CORS xử lý; CORS không thay authentication. Bearer API client/CLI cũng phải
gửi Origin được cấu hình khi mutation. Không có ngoại lệ missing-Origin cho CLI.
Đây là thiết kế browser cùng origin, không hỗ trợ cross-site cookies trong v1.

Cookie access/refresh: HttpOnly, SameSite=Lax, Path=/, host-only; Secure khi
NODE_ENV=production. Local HTTP development/test không bật Secure. TTL và revoke
giữ T06: access tối đa30 phút, family7 ngày tuyệt đối. Clear dùng cùng options.
Đổi chính sách T06 trước đây `SameSite=None; Secure` sang policy này cần deploy
frontend/backend đồng bộ. Không công bố backend làm frontend origin thứ hai.

UI chỉ gọi `/api`; không gửi Origin thủ công từ JS (browser tự quản lý header).
Scripts như benchmark/curl phải thêm Origin, ví dụ `Origin: http://localhost:3000`
trong development. CSRF không bảo vệ trước XSS hoặc credential đã bị đánh cắp.

## Trusted proxy và IP

`TRUSTED_PROXY_CIDRS` mặc định rỗng: Express dùng socket peer, bỏ qua mọi
X-Forwarded-* cho việc xác định IP. Chỉ chấp nhận IP/CIDR cụ thể; không chấp nhận
`true`, hop count, alias loopback/uniquelocal hay /0.

Khi có reverse proxy:

1. Chỉ cho ingress đến backend từ proxy đã chọn; không để client truy cập trực
   tiếp đường có thể giả nguồn trusted peer.
2. Proxy ngoài cùng phải ghi đè/sanitize X-Forwarded-For/Host/Proto từ client;
   các proxy phía trong chỉ append chuỗi đã được kiểm soát.
3. Điền đúng địa chỉ/CIDR hạ tầng vào TRUSTED_PROXY_CIDRS, không copy subnet rộng
   theo ví dụ. Express duyệt chain từ peer gần API ra client không trusted đầu tiên.
4. Kiểm tra trên hạ tầng thật trước khi mở demo. Với default rỗng qua Next proxy,
   toàn bộ clients có thể cùng quota IP của proxy: an toàn nhưng dễ over-limit;
   không tuyên bố đã nhận diện client thật khi chưa cấu hình proxy.

IPv4-mapped IPv6 được chuẩn hóa; native IPv6 gom theo /64 để hạn chế đổi địa chỉ
trong cùng subnet. IP/account keys được hash trong memory, không ghi vào log.
Account limiter gom username trim/NFKD/bỏ combining marks/lowercase; không coi
đây là bản sao đầy đủ của mọi MySQL collation. IP limiter vẫn áp dụng độc lập.

## Quota ban đầu cho một instance demo

| Nhóm | Key | Max | Window |
|---|---|---:|---:|
| API tổng | IP | 600 | 60s |
| Login user+admin | IP | 20 | 15m |
| Login user+admin | Account digest, dùng chung hai scope | 10 | 15m |
| Register | IP | 10 | 1h |
| Refresh user+admin | IP | 60 | 60s |
| Song/avatar upload | Signed userId, chung scope | 5 | 1h |
| Activity | Signed userId | 120 | 60s |
| Recommendations | IP | 60 | 60s |
| Rebuild | Global trong instance | 1 | 5m |

Tất cả ngưỡng/window có env `RATE_<GROUP>_MAX` và `RATE_<GROUP>_WINDOW_MS` trong
Server/.env.example. Giá trị phải là số nguyên dương; không cho disable bằng0.
Window tối đa1 ngày. Các request sai input/credential vẫn tính lượt để không
bỏ qua limiter qua payload lỗi. User/admin không nhân đôi quota account/IP.

Fixed-window counters nằm trong Map **riêng mỗi app/process**, không timer nền,
reset khi restart; không durable hoặc quota toàn hệ nhiều replicas/workers.
`RATE_STORE_MAX_ENTRIES` mặc định10000, tối đa100000. Map đầy thì xóa expired keys;
nếu vẫn đầy thì fail closed429 RATE_STORE_FULL, không evict active quota để bypass.
V1 có thể có burst quanh ranh giới hai window. Phải triển khai shared store trước
khi scale nhiều instance hoặc tuyên bố quota toàn hệ; không có Redis trong T07.

429 trả envelope T05, `Retry-After` số giây, Cache-Control:no-store và thông báo
tiếng Việt. Fetch/Axios chuyển thời gian chờ thành message + retryAfterSeconds;
không tự refresh/retry429. Logs chỉ có event/code/requestId, không có credential,
IP, account, request body/query hay raw exception.

## Giới hạn tài nguyên

- API JSON100KiB; activity JSON mặc định8KiB (`ACTIVITY_BODY_MAX_BYTES`, tối đa100KiB).
  URL-encoded8KiB/50params. Origin + global/login-IP limiter chạy trước parser.
- Upload quota chạy sau xác thực và trước Multer. Content-Length vượt22MiB
  (`UPLOAD_REQUEST_MAX_BYTES`, chỉ được hạ ngưỡng) bị413 trước ghi file. Multer
  giữ10MiB/file, tối đa2files,10fields,12parts,16KiB/field,100-byte field names.
  Chunked requests vẫn bị giới hạn theo file/parts/fields của parser, không dựa
  riêng Content-Length. Ngưỡng Content-Length thấp tùy biến không phải tổng-byte
  counter riêng cho chunked stream; giới hạn cứng của multipart vẫn áp dụng.
- Song/avatar dùng chung quota user. Bảo đảm magic bytes và cleanup asset/temp khi
  parser/provider/DB fail thuộc T08; không diễn giải quota là hoàn tất upload safety.
- T14 thay thế fallback realtime bằng active snapshot có version. Serving không
  dựng metadata/behavior matrix; cold-start chỉ lấy trending public có limit.
- HTTP rebuild yêu cầu admin/super_admin nhưng luôn trả 409
  `OFFLINE_REBUILD_REQUIRED`. CLI offline có giới hạn catalog/signals, khóa DB
  cross-process và publish nguyên tử. Các tham số quota/rebuild cũ không bật lại
  HTTP maintenance. Xem [RECOMMENDATION_ENGINE_VI.md](RECOMMENDATION_ENGINE_VI.md).

## Headers và vận hành

API bỏ X-Powered-By; thêm nosniff, X-Frame-Options:DENY, Referrer-Policy:no-referrer,
CORP:same-origin, Permissions-Policy camera/mic/location off và CSP
`default-src 'none'; frame-ancestors 'none'; base-uri 'none'`. Production có HSTS
max-age31536000, không includeSubDomains. CSP này áp dụng response backend API,
không áp lên Next HTML hoặc media/font CDN, nên không thêm allowlist media giả định.
TLS termination, timeout/body limit ingress, headers Next và demo HTTPS thật vẫn
cần kiểm tra trong các task deploy/T20/T23.

## Kiểm thử và nguồn

- API/unit quota tests dùng clock được inject để kiểm tra expiry mà không ngủ;
  production không nhận clock/config từ HTTP request. CSRF tests dùng native fetch.
  Các suite cũ dùng browser-fetch helper để mô phỏng Origin của browser.
- Test MySQL vẫn chạy guard/reset test DB của T04. Browser opt-in:
  set T07_BROWSER_TESTS=yes, PLAYWRIGHT_MODULE_PATH tới package Playwright đã cài,
  PLAYWRIGHT_CHANNEL=msedge (hoặc chromium trên máy có browser tương ứng), rồi chạy
  runner test:integration với disposable env. Không thêm Playwright vào app dependency.
- Browser test thực sự login/refresh/profile/logout với HttpOnly cookies và kiểm tra
  request khác origin nhưng cùng site mang cookie vẫn bị403. Test dùng reverse-proxy
  fixture `/api`, chưa chạy Next production server hoặc HTTPS deployment thực tế.
- [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html):
  Origin và Fetch Metadata là các lớp kiểm tra request; SameSite là phòng thủ bổ sung.
- [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/): trust proxy
  phụ thuộc đường đi mạng và việc sanitize forwarded headers của proxy.
