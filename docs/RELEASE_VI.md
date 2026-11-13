# CI và release

## CI trên pull request và push

Workflow `.github/workflows/ci.yml` dùng Node 22.19.0, `npm ci` và cache theo lockfile. Các action được pin bằng commit SHA. Quyền mặc định chỉ `contents: read`; PR không nhận credential triển khai. Có thể chạy thủ công bằng workflow_dispatch.

| Job | Nội dung bắt buộc |
|---|---|
| UI quality | TypeScript, ESLint, unit/component, production build |
| API quality | ESLint và unit/API; cài UI để dùng ESLint đã khóa phiên bản |
| MySQL and browser E2E | Env ngẫu nhiên, MySQL test mới, migrations/seed/integration, Next production và browser E2E/player/account/responsive |
| Dependency and secret gates | actionlint, npm audit, Gitleaks current tree và commit mới |
| Container builds | Build API, migrator và web sau khi bốn job trên đạt |
| CI required | Chỉ đạt khi cả năm job đều success; failed/skipped/cancelled đều bị từ chối |

Không lấy `.env` cá nhân hay database demo. `prepare-env.cjs` tạo credential test vào thư mục ignored, thêm mask trên GitHub; test runner kiểm tra guard database trước thao tác ghi/reset. Database chỉ tồn tại trong project Compose của job, được `down --volumes` khi kết thúc. Storage bên ngoài được mock; UI, Express và MySQL trong E2E là thật.

Log thô giữ riêng trong workspace tạm, không upload. Artifact allowlist chỉ gồm JSON đã lọc và screenshot E2E có mask ô mật khẩu; không có env, response body, cookie, header, URL query, Playwright trace ZIP hay log SQL. Artifact CI giữ 7 ngày. Vì log lỗi đã lược bỏ dữ liệu nhạy cảm, khi cần debug sâu hãy tái hiện local bằng test env riêng.

Audit chặn high/critical. JSON lỗi hoặc thiếu kết quả cũng làm job fail. Moderate vẫn được ghi nhận; không phải chứng nhận không có lỗ hổng. Ngoại lệ nếu cần phải khớp package/advisory, có owner, lý do và hạn còn hiệu lực; danh sách hiện tại rỗng. Xem [triage](security/CI_RISK_TRIAGE_VI.md).

Secret gate kiểm tra cây nguồn hiện tại và range commit mới, không miễn trừ findings mới. Đây không phải chứng nhận lịch sử cũ đã sạch. Khi phát hiện credential thật: thu hồi/rotate trước, sau đó xử lý lịch sử theo phê duyệt; không tự force-push.

## Thiết lập repository cần thực hiện trên GitHub

Sau khi PR thử nghiệm red rồi green đã chạy thực tế, bật ruleset/branch protection cho `main`: yêu cầu PR, status check `CI required` trên commit mới nhất, yêu cầu cập nhật branch trước merge, chặn force-push/xóa branch. Không dùng check của release làm điều kiện PR. Thiết lập environment `release` có người duyệt nếu gói repository hỗ trợ; workflow không tự tạo các quy tắc này. Chưa có bằng chứng các thiết lập đã được bật.

## Tạo image và nghiệm thu staging

1. Merge qua CI vào main. Ghi lại SHA đầy đủ và URL của lượt CI push xanh đúng SHA đó.
2. Dispatch `Build release images` từ main, nhập SHA. Policy từ chối SHA ngoài lịch sử main hoặc chưa có lượt push CI thành công của cùng repository.
3. Workflow build và push ba image `ghcr.io/<owner>/tunetrek-{api,migrate,web}:<SHA>`. Chỉ job image có `packages: write`; registry login dùng token qua stdin và logout khi thoát. Không dùng tag `latest`.
4. Lưu artifact digest. Tag SHA vẫn là tag registry có thể bị ghi lại; khi triển khai phải chọn digest `image@sha256:...` đã ghi nhận, không dựa vào tính bất biến của tên tag.
5. Deploy thủ công vào staging/demo theo [operations](OPERATIONS_VI.md), cấu hình secrets ở môi trường đích. Backup DB trước migration; chạy migrator một lần trước API. Không chạy synthetic seed trên dữ liệu thật.
6. Smoke `/health/live`, `/health/ready`, đăng ký/đăng nhập, phát nhạc, favorite, playlist, upload/duyệt và tách dữ liệu hai tài khoản. Kiểm tra restart vẫn giữ dữ liệu, log không chứa credential. Ghi lại digest, schema version, URL và kết quả.
7. Chỉ sau staging smoke đạt mới tạo GitHub release/tag phiên bản trỏ đúng SHA. Workflow này không tự deploy hoặc tạo Git release. HTTPS/domain/provider thật và vận hành môi trường đích thuộc T23.

## Rollback

Giữ SHA/digest bản đã smoke trước đó và backup có kiểm tra khôi phục. Khi bản mới lỗi, dừng rollout, thu thập log an toàn và chuyển API/web về digest trước. Kiểm tra schema hiện tại tương thích bản cũ trước khi khởi động; không tự chạy migration down. Nếu schema không tương thích, dùng bản sửa tiến hoặc khôi phục backup vào DB riêng, kiểm tra nghiệp vụ rồi mới chuyển kết nối theo quyết định của người vận hành. Khôi phục backup có thể mất ghi mới; phải xác định mốc phục hồi và bảo toàn DB lỗi để đối chiếu. Smoke lại readiness, phiên và library sau rollback.
