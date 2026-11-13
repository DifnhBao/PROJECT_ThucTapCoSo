# Dependency triage — T03, 16/10/2026

Nguồn quyết định phiên bản: npm registry tại thời điểm sửa và advisory chính thức.
Các báo cáo đầy đủ trong `evidence/T03/*-audit-*.json`; không suppress advisory.

## Thay đổi trực tiếp

| Package | Phiên bản sau vá |
|---|---|
| Next / eslint-config-next | 16.4.2, đồng bộ cùng release |
| React / React DOM | 19.3.1, đồng bộ hai package |
| Axios | 1.20.0 |
| ESLint | 9.39.5, giữ major 9 |
| Express | 5.3.0 |
| Multer | 2.4.0 |
| mysql2 | 3.24.6 |
| Sequelize | 6.37.8 |
| Cloudinary | 2.11.0 |
| sequelize-cli | 6.6.5, backend dev dependency |

Node watch thay nodemon để bỏ chuỗi watcher/glob chưa vá. Update lockfile và dùng
`npm audit fix` trong semver hợp lệ; không dùng `--force`. Ví dụ không chấp nhận
đề xuất downgrade Sequelize về 3.30.0 hoặc eslint-config-next về 14.x chỉ để audit xanh.
Không đổi major của framework/database client.

## Kết quả audit

| Phạm vi | Trước T03 | Sau vá |
|---|---|---|
| Server, cả dev | 18 nodes: 1 critical, 12 high, 4 moderate, 1 low | 2 moderate, 0 high/critical |
| UI, cả dev | 26 nodes: 1 critical, 21 high, 4 moderate | 5 high, 0 critical/moderate |
| Server production (`--omit=dev`) | Baseline production ở T00 | 2 moderate, 0 high/critical |
| UI production (`--omit=dev`) | Baseline production ở T00 | 0 findings |

Các số là package nodes bị ảnh hưởng, không phải số đường khai thác độc lập.

## Finding còn lại và điều kiện áp dụng

### braces / chuỗi lint: 5 nodes high, chỉ dev

Chuỗi: `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
mô tả stack exhaustion khi xử lý brace pattern lồng sâu, chưa có bản vá.

Đánh giá cho ứng dụng này: production audit không chứa các nodes đó; request
browser/API không gọi lint hoặc cấp pattern vào ESLint. Config lint của repo
không nhận glob từ request và không khai báo rootDir lấy từ input bên ngoài.
Vì vậy chưa có đường khai thác qua API/runtime đã xác định. Đây là kết luận
phạm vi code/dependency hiện tại, không khẳng định package vô hại.

Giảm thiểu: chỉ lint source/config được tin cậy; không tạo service nhận glob từ
người dùng, không chạy lint với production secrets trên source PR chưa tin cậy
(CI chi tiết T21). Theo dõi bản vá upstream. Giữ finding trong audit và báo cáo,
không cài package major khác bằng override thiếu kiểm chứng hoặc tắt lint rules.

### uuid / Sequelize: 2 nodes moderate trong production

[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
liên quan bounds check của v3/v5/v6 khi caller cung cấp buffer.

Rà source Sequelize đang cài: `lib/utils.js` dùng UUID v1/v4 không buffer;
`lib/dialects/abstract/query-generator.js` dùng v4. Source ứng dụng không có
call v3/v5/v6 hoặc API nhận buffer cấp cho uuid. Chưa xác định đường khai thác
áp dụng trong scope hiện tại. Không ép đổi major uuid trong dependency Sequelize
hoặc downgrade ORM để xóa finding. Giữ moderate có triage, kiểm tra lại khi nâng ORM.

## Kiểm chứng sau nâng cấp

Chạy npm ci cả hai package, tests auth/authorization, multipart upload với mock
Cloudinary/DB, player/component/API client tests, TypeScript và production build.
Lint preset 16 bật thêm rules hooks nên cần phân biệt diagnostics do rules mới
với lỗi mới trong code; không tắt rules mới để giấu baseline. Phần dọn quality
gate toàn repo tiếp tục ở T13. MySQL/Cloudinary thật và fresh-stack chưa được
chứng nhận chỉ từ audit hoặc mocks.
