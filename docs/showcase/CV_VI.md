# CV bullets — bản nháp có bằng chứng

Đồ án cá nhân: TuneTrek. Chọn 3–4 bullet theo vị trí ứng tuyển; đây là kết quả đồ án, không phải kinh nghiệm làm việc doanh nghiệp.

- Phát triển website nghe nhạc Next.js/Express/MySQL với phân quyền user/admin, publication policy và media gateway; kiểm chứng luồng listener/moderation qua CI và browser HTTPS thật. [T19](../verification/T19.md), [T23](../verification/T23.md).
- Xây dựng receipt nghe nhạc có UUID/digest, unique key và transaction để retry không cộng lượt nghe lặp; kiểm thử 8 request đồng thời chỉ ghi/cộng một lần. Không cam kết exactly-once delivery. [T11](../LISTENING_EVENTS_VI.md), [integration case](../../Server/tests/integration/listening-events.cjs).
- Tách player progress khỏi list subscribers; React development Profiler ghi nhận 20/20/20 xuống 0/0/0 list commits cho 20 timeupdate/lượt, trong khi slider vẫn cập nhật. Đây là fixture kiểm soát, không phải phần trăm tăng tốc production. [T18](../performance/README.md).
- Xây dựng evaluator recommendation theo temporal split và baseline, đồng thời lập 10 user stories/12 business rules với traceability tới API, dữ liệu và tests. Hybrid Recall@5=0.8000 trên synthetic, bằng Content-only; chưa chứng minh uplift người dùng thật. [T15](../evaluation/README.md), [BA docs](../product/README.md).

Có thể thay bullet thứ tư bằng Docker/CI theo vị trí backend/DevOps: “Dựng CI cho type/lint/unit/MySQL integration/E2E/container build; kiểm chứng red → green và demo HTTPS tạm với backup/restore, API rollback.” Không ghi đã deploy Render khi demo hiện dùng PC + tunnel.
