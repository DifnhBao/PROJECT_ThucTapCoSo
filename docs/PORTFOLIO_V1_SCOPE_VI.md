# Scope portfolio-v1 — chốt tại T00

Ngày: 16/10/2026 (Asia/Saigon). Trạng thái: **scope đã chốt, các tính năng chưa được nghiệm thu**.
Nguồn yêu cầu: [execution plan](INTERN_PORTFOLIO_EXECUTION_PLAN_VI.md).

## Demo path bắt buộc

| Vai trò | Luồng cần hoàn thiện trong T01–T25 |
|---|---|
| Guest | Khám phá catalog bài đã công khai, tìm kiếm và xem chi tiết được phép |
| User | Đăng ký/đăng nhập → phát nhạc → yêu thích → tạo/quản lý playlist → nhận gợi ý |
| Admin | Đăng nhập quản trị → upload → duyệt/từ chối bài → kiểm tra kết quả public |

Các luồng trên cần hoạt động với loading/error/empty states, mobile và kiểm soát
quyền tại backend theo các task tương ứng. T00 chỉ dựng nền tảng; không xác nhận
auth, playback, privacy, upload hoặc recommendation hiện đã đúng.

## Giới hạn kiến trúc và sản phẩm

- Giữ Next.js + Express + MySQL + Cloudinary, recommendation Node làm kiến trúc chính.
- Following, Daily Mix và comment chưa hoạt động: **đưa vào danh sách ẩn/làm sau**;
  rà và ẩn entrypoint khi hoàn thiện UI ở T16, không đưa vào demo path hoặc claim CV v1.
- Không bắt buộc microservices, Kubernetes, Redis, WebSocket, chatbot AI, NCF
  production, Daily Mix tự động, SLA thương mại hoặc lượng người dùng thật.
- Python recommendation giữ như nghiên cứu độc lập, chưa claim tích hợp production.
- Chỉ công bố tính năng đã ship và số liệu có evidence. Giữ các hạn chế trong tài liệu.

## Invariants nền tảng T00

1. Import/tạo Express app không tự listen, mở kết nối DB, tạo timer, đăng ký signal
   shutdown hoặc tạo thư mục upload. Kiểm tra bằng process con thoát tự nhiên,
   các thao tác kết nối/timer/listen/mkdir bị chặn trong probe.
2. Unit/API tests không đọc `.env` thật; MySQL/Cloudinary bị chặn trừ mock rõ ràng.
   API smoke dùng các routes thật nhưng không thực hiện nghiệp vụ có DB.
3. Player unit test chạy module thật trong Node, không browser hoặc DB.
4. DB test chỉ nhận `TEST_DB_*`, tên `tunetrek_test` hoặc `tunetrek_test_<suffix>`,
   host trong allowlist local/test; thiếu config bị từ chối. Integration runner
   yêu cầu thêm `TEST_DB_RESET_ALLOWED=yes` trước khi cho phép nhóm có cleanup/seed.
5. Không reset/clean repo, không chạy migrations/seed hoặc sửa dữ liệu hiện có.
   Danh sách và SHA-256 của các file có sẵn được lưu tại
   [snapshot ban đầu](verification/evidence/T00/initial-files.json).

## Cách làm tiếp

Làm lần lượt T01 → T25, một task/PR hoặc nhóm commit cùng mục đích. Mỗi task logic
thêm regression tests ngay, không chờ T19. MySQL integration bắt đầu sau T04;
browser/E2E, deployment và quality gates được hoàn thiện ở các task tương ứng.
Trạng thái, lệnh và bằng chứng T00 ở [verification T00](verification/T00.md).
