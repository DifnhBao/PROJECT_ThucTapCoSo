# TuneTrek UI

Frontend Next.js/React cho đồ án cá nhân TuneTrek. Xem [README dự án](../README.md) để chạy toàn bộ ứng dụng, DB/migrations/seed và xem demo, showcase, giới hạn đã biết.

Từ thư mục UI, cài dependency bằng `npm ci`. Tạo `.env.local` từ `.env.example` nếu chưa có; đặt `API_INTERNAL_URL` thành origin backend đang chạy (local mặc định `http://127.0.0.1:5000`). Không ghi đè cấu hình có sẵn hoặc đưa secret backend vào biến `NEXT_PUBLIC_*`.

```powershell
npm run dev
```

Mở http://localhost:3000/Home. API và MySQL phải được chuẩn bị theo [hướng dẫn cấu hình](../docs/CONFIGURATION_SETUP_VI.md); chạy UI riêng không tạo database. Nếu dùng Docker toàn stack, không cần chạy thêm dev server trên cùng cổng.

```powershell
npm run check
npm start
```

`check` chạy typecheck, lint, unit tests và production build. Chỉ chạy `start` sau build thành công; giữ cùng API_INTERNAL_URL lúc build/chạy. [Browser/integration tests](tests/README.md) có cấu hình và guard riêng. Bản kiểm chứng T24 ghi trong [báo cáo](../docs/verification/T24.md).

Recommendation được phục vụ bởi Node API. Python trong experiments là nghiên cứu riêng, không phải backend bắt buộc của UI. Các kết quả và feature đã kiểm chứng nằm ở README root; không coi đường dẫn/menu hiển thị là bằng chứng chức năng hoàn chỉnh.
