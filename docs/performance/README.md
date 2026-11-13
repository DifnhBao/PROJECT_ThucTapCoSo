# T18 — Frontend performance

Trạng thái: VERIFIED trong demo path, hoàn tất 2026-11-08. Không phải số đo Core Web Vitals của người dùng thật.

## Kết quả đã đo

React development Profiler bọc TrackSection thật, PlayerProvider/AudioController thật, fixture API/media, Next navigation shim, Edge headless. Danh sách 20 bài; audio tạm dừng để loại bỏ các cập nhật playback tự nhiên. Mỗi lượt phát 20 sự kiện timeupdate cách nhau 20 ms, currentTime từ 0.1 đến 2 giây; 3 lượt cùng harness.

| Phép đo | Trước | Sau |
|---|---|---|
| List commits mỗi lượt | 20 / 20 / 20 | 0 / 0 / 0 |
| Median, range | 20, 20–20 | 0, 0–0 |

Đây là số commits, không phải latency hoặc phần trăm tăng tốc. Development StrictMode được giữ ở cả hai phía. Sau sửa slider vẫn phải cập nhật đến 0:02, bảo đảm không đạt kết quả bằng cách ngừng nhận progress. Đây là thử nghiệm sự kiện có kiểm soát; suite riêng vẫn kiểm tra phát audio, queue, shuffle, repeat và listening.

Evidence: [before](../verification/evidence/T18/before/player/profiler.json), [after](../verification/evidence/T18/after/player/profiler.json).

## Thay đổi

- PlayerControls được memo và không chứa progress; list/detail/recommendation subscribe usePlayerControls. usePlayerProgress dành cho tiến độ; usePlayer giữ compatibility cho player và integrations cần cả hai. Callback cũ ổn định được giữ nguyên.
- Ảnh cover chính có width/height giữ tỉ lệ vuông; CSS tiếp tục quyết định kích thước hiển thị, ảnh list/card lazy và async decode, cover detail/player tải bình thường. Không tuyên bố giảm byte ảnh: chưa resize URL provider hoặc thêm Next Image với host chưa được xác minh.
- Font Awesome vẫn cần cho các class fa-*; thay CDN 6.5 bằng CSS/font cùng package 7.0.1 đã cài. Giữ react-icons cho SVG imports có dùng và lucide cho controls hiện hữu. Bỏ Google Inter @import ở Auth, dùng font fallback hiện tại. Không đổi icon toàn bộ hoặc dynamic import khi chưa có bằng chứng module nặng.

## Production lab — hiện trạng ngày 2026-11-08

Server Next production do người dùng khởi động trên port3016 sau khi lệnh agent bị kiểm duyệt chặn. Đã warmup HTTP route trước khi đo; build không thay đổi trong quá trình đo. Dùng Edge headless, route /songs/41 thật, fixture API/media, viewport375×812, DPR1, CPU4x, latency40ms, down1.6Mbps/up750Kbps, cache CDP disabled, server warm, 3 lượt tuần tự. Script lưu browser version, Node, CPU và RAM trong lab.json. Không chạy browser regression song song phép đo. Quan sát LCP/CLS đến sau heading, fonts.ready và khoảng chờ1.8s ổn định; đây là phép đo lab có cửa sổ hữu hạn.

LCP median 3.160s (range 2.928–3.208s); loadEventEnd median 2.244s; CLS 0/0/0; JS+CSS encoded body 252,043 bytes/lượt.

[Raw samples và điều kiện](../verification/evidence/T18/final/production/lab.json), [summary](../verification/evidence/T18/final/production/summary.json), [ảnh mobile](../verification/evidence/T18/final/production/production-375.png).

Đây là baseline hiện tại sau tối ưu; **không có production baseline trước tối ưu**, nên không tính phần trăm tăng tốc tải trang. Bằng chứng trước/sau là Profiler commits ở trên, điều kiện khác với production lab; không trộn hai phép đo. LCP lab này còn trên2.5s; không tuyên bố đạt mọi ngưỡng CWV. Fixture ảnh1×1 và API interception không đại diện media/backend thật. Chưa chạy Lighthouse hoặc đo field traffic.

## Layout, font và hồi quy

Production kiểm tra cover load/naturalWidth, document không overflow ngang, Font Awesome CSS/pseudo content và font faces tải thành công. Ảnh375/1440 được xem trực tiếp. Bộ accessibility chạy lại trên cùng production server:375/768/1440, màn hình thấp, reflow200% mô phỏng (không phải GUI browser zoom), tiêu đề dài; tìm/phát/like/add playlist, modal trap/Escape/restore đều PASS, không page errors. CLS0 chỉ được xác nhận trên fixture route; không chứng nhận toàn site hoặc artwork thực tế.

[Browser evidence](../verification/evidence/T18/final/accessibility/browser.json). Player/listening regression và progress vẫn cập nhật đến0:02 trong lúc list không commit; Profiler chạy lại ngày11/08 vẫn [0,0,0]. Typecheck,56/56 tests, build đạt. Lint còn24 no-img-element warnings đã biết; không tắt rule để che warning. Test scripts mới lint riêng đạt.

Bundle inventory toàn output hiện tại: [bundle-inventory.json](../verification/evidence/T18/final/bundle-inventory.json). Đây là tổng assets trên nhiều routes, không phải lượng tải của một trang; gzipBytes do Node gzip, không phải wire transfer thực tế. Số bytes theo route nằm trong raw resources. Không có baseline bundle lịch sử nên không claim mức giảm.

## Tái lập

Build: đặt API_INTERNAL_URL trỏ local test rồi npm --prefix UI run build. Dừng dev server trước khi build; không build trong lúc production tests đang chạy. Khởi động npm start -- --port3016 trong UI, giữ server mở. Các tests bên dưới dùng fixture API, không cần DB/Cloudinary.

Đặt PLAYWRIGHT_MODULE_PATH tới runtime Playwright nếu không cài trong UI. Đặt PERFORMANCE_EVIDENCE_DIR=docs/verification/evidence/T18/recheck/production, chạy npm --prefix UI run test:performance:browser; T16_URL đổi origin. Script warmup HTML, kiểm tra3 lượt, lưu screenshot/raw JSON và báo lỗi khi CLS>0.1, cover/icon lỗi, overflow hoặc pageerror. Script không tự tạo summary.json; đó là bản tổng hợp raw samples trong lần nghiệm thu này.

Responsive: đặt ACCESSIBILITY_EVIDENCE_DIR=docs/verification/evidence/T18/recheck/accessibility; chạy npm --prefix UI run test:accessibility:browser. Không ghi đè T17.

Profiler: đặt T18_PERFORMANCE=yes, T18_EXPECT_ISOLATED=yes, PLAYER_EVIDENCE_DIR=docs/verification/evidence/T18/recheck/player; chạy npm --prefix UI run test:player:browser. Bản baseline cũ không bật EXPECT_ISOLATED. Không ghi đè evidence T10/T17.

Production server thuộc terminal người dùng; không tự dừng server đó sau đo. Có thể Ctrl+C khi xem xong. Không commit/push/deploy hoặc thay đổi dữ liệu thật.
