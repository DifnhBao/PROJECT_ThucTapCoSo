# Triage bảo mật CI — 2026-11-13

Owner đề xuất cho các mục còn mở: DifnhBao. Hạn xem xét đề xuất: 2026-12-13. Đây là đề xuất theo dõi, chưa phải quyết định chấp nhận rủi ro của chủ repository.

| Mục | Quan sát | Xử lý / trạng thái |
|---|---|---|
| follow-redirects | Audit ban đầu báo high GHSA-mrwp-f3q8-3g9p | Lockfile UI nâng transitive 1.16.1 lên 1.16.3, clean npm ci và tests đạt; không thay dependency trực tiếp |
| Moderate Server | 7 package entries, gồm đường phụ thuộc sequelize/uuid và sequelize-cli/beautify/editorconfig/glob/minimatch | OPEN: xem khả năng nâng tương thích và kiểm tra migrations trước thay đổi; chưa force-fix/downgrade |
| Moderate UI | 8 package entries trong đường công cụ ESLint/typescript-eslint/minimatch | OPEN: theo dõi bản vá tương thích; vẫn hiển thị trong báo cáo audit |
| JWT trong lịch sử | Full-history Gitleaks ghi nhận 187 findings JWT; T03 ghi nhận literal đã hết hạn | OPEN: rà soát lịch sử/dump và dữ liệu cá nhân; chưa chứng nhận thu hồi khóa hay sạch lịch sử. Không rewrite/force-push tự động |
| Credential cây nguồn hiện tại | Gitleaks current tree: 0 findings ở lượt local | Gate chặn finding mới trong cây nguồn/range commit mới. Scanner không bảo đảm phát hiện mọi credential/PII |

Ngưỡng CI là high/critical; các mục moderate không được coi là exception đã duyệt. `dependency-exceptions.json` hiện là mảng rỗng. Muốn tạm chấp nhận high/critical phải ghi exact package/advisory, owner, lý do và expiresAt; parser từ chối ngoại lệ hết hạn hoặc không khớp.

Audit phụ thuộc theo thời điểm và package entries không tương đương số lỗ hổng độc lập. Advisory của follow-redirects không tự chứng minh đường gọi Axios của ứng dụng khai thác được. Xem [advisory gốc](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p).

Repository remote hiện công khai. Trước khi publish tập thay đổi T00–T21, cần duyệt manifest nguồn; không publish env thật, backup SQL, dependencies, build output hoặc log riêng. Không dùng việc scan range mới để tuyên bố lịch sử cũ đã sạch.
