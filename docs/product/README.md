# Tài liệu nghiệp vụ portfolio-v1

Cập nhật 2026-11-13, T22. Đây là đặc tả **as-built** của code hiện tại, không phải danh sách tính năng dự định làm. Báo cáo T01/T02 ghi trạng thái tại thời điểm triển khai; bằng chứng integration/E2E hoàn thiện sau đó nằm ở T19/T21.

| Tài liệu | Dùng để trả lời |
|---|---|
| [Use cases](use-cases.md) | Ai dùng, muốn đạt mục tiêu gì, đi qua những bước nào? |
| [Ma trận quyền](permission-matrix.md) | Ai được đọc/ghi tài nguyên nào? |
| [Business rules](business-rules.md) | Điều kiện và trạng thái nào quyết định kết quả? |
| [Event và KPI](event-dictionary.md) | Hệ thống ghi gì, đo gì và còn thiếu gì? |
| [Acceptance criteria](acceptance-criteria.md) | Khi nào từng user story được coi là đạt? |
| [Traceability](traceability.md) | Yêu cầu liên quan API, dữ liệu, test và màn demo nào? |

## Quyết định và tradeoff

- **Modular monolith:** Next.js phục vụ UI, Express chia route/service/policy, MySQL giữ transaction. Một ứng dụng đủ cho demo, dễ truy vết quyền và nghiệp vụ; chưa có số liệu tải yêu cầu tách microservices. Không claim đã thiết kế vận hành đa vùng.
- **Node recommendation phục vụ chính:** dùng chung lõi ranking giữa serving và evaluator; Python ở `experiments/` là nghiên cứu độc lập. Tránh phục vụ hai engine lệch rule; không claim NCF/Python production.
- **Chưa cần Redis/worker mới:** receipt, session và snapshot có trạng thái bền trong DB; client retry có giới hạn. Upload cleanup hiện chạy bằng lệnh vận hành, chưa có scheduler. RAM queue mất khi đóng tab là giới hạn đã biết, không phải durable message queue.
- **Eligibility khi đọc:** trạng thái public được kiểm tra tại catalog, recommendation và media gateway; playlist không cần xóa quan hệ mỗi lần bài bị ẩn. Nội dung đã tải/buffer không thể bị thu hồi từ thiết bị người nghe.

## Assumptions và phần chưa triển khai

| ID | Loại | Nội dung |
|---|---|---|
| A01 | Giả định demo | Dùng tài khoản và dữ liệu synthetic, không đại diện người nghe thật |
| A02 | Giới hạn đo lường | Thời gian nghe do client đo và server validate; không chứng minh người dùng thực sự nghe hoặc chống gian lận |
| A03 | Giới hạn evaluator | T15 dùng frozen training/global cutoff, chỉ synthetic; Hybrid không hơn Content-only trong fixture hiện tại |
| A04 | Giới hạn storage | Asset mới có authenticated gateway; URL legacy đã public không được bảo đảm thu hồi, provider thật chưa được nghiệm thu chỉ từ mock |
| O01 | Chưa triển khai | Following, Daily Mix, comment, forgot-password, promote/demote routes, đổi privacy playlist từ UI, nhật ký favorite/rating đầy đủ và dashboard KPI |
| O02 | Chưa nghiệm thu môi trường thật | Deploy HTTPS/domain, provider cloud thật, smoke/rollback demo thuộc T23; CI xanh không thay thế các bước này |
| O03 | Quyết định còn mở | Chưa có TTL tự xóa activity/receipt; cần chủ dữ liệu chốt retention, quyền riêng tư và tác động mất dedupe trước khi triển khai thật |

Không nâng các giả định trên thành requirement đã ship. Bộ tài liệu này không thay đổi runtime, schema, quyền hoặc chính sách lưu dữ liệu.

Nguồn kỹ thuật: [scope](../PORTFOLIO_V1_SCOPE_VI.md), [T19](../verification/T19.md), [T21](../verification/T21.md), [evaluation](../evaluation/README.md), [operations](../OPERATIONS_VI.md). Kết quả đánh giá recommendation không phải KPI kinh doanh hoặc số liệu traffic production.
