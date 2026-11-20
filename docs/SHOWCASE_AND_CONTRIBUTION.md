# Showcase và đóng góp

## Media đã tuyển chọn

- [Walkthrough](showcase/assets/walkthrough.mp4)
- [Desktop](showcase/assets/desktop.png), [mobile](showcase/assets/mobile.png)
- [Playlist](showcase/assets/playlists.png), [recommendation](showcase/assets/recommendation.png), [moderation](showcase/assets/moderation.png)

Đây là artifacts đã lưu từ bản demo trước; Phase 1 chỉ giữ file/đường dẫn, không xem lại hay quay mới media. Chúng không chứng minh working tree hiện tại vượt mọi test/edge case. Video cũ có thể còn lời giới thiệu “đồ án cá nhân”; attribution đúng nằm bên dưới và cần dùng khi trình bày.

Luồng demo: Home/search → playback → login/library/playlist → recommendation và giới hạn dữ liệu → admin moderation → CI/test và điều kiện vận hành. Dữ liệu synthetic, audio tone tự sinh; không quảng bá hosting 24/7, app mobile đã phát hành hoặc recommendation đã kiểm chứng trên người dùng thật. Mở demo theo [Operations](OPERATIONS_AND_TESTING.md); URL tunnel lịch sử không cam kết dịch vụ đang online.

## Attribution hai giai đoạn

1. **Giai đoạn 1 — đồ án cơ sở tại trường, nhóm 2 người:** Lê Đình Bảo và Huỳnh Đình Thạch. Nền tảng là sản phẩm chung, không mô tả toàn bộ lịch sử thành đồ án cá nhân.
2. **Giai đoạn 2 — refactoring và enhancement cho portfolio, do Lê Đình Bảo thực hiện cá nhân:** củng cố cấu trúc, tài liệu, kiểm thử và các luồng ứng dụng trên nền dự án nhóm. Không tự nhận toàn bộ code gốc, không bịa tỷ lệ phần trăm đóng góp.

Hai giai đoạn đóng góp khác với Phase 1–4 của roadmap audit hiện tại. Không suy ownership module từ tên thư mục hoặc số commit. CV/phỏng vấn chỉ nhận phần có thể giải thích, tái hiện và đối chiếu lịch sử; ghi rõ công cụ hỗ trợ phát triển/kiểm thử khi thích hợp.

## Quyền sử dụng và giới hạn

[LICENSE](../LICENSE) áp dụng trong phạm vi quyền của chủ sở hữu source; không tự đổi quyền của code đồng tác giả, dependency, artwork hay dataset bên thứ ba. Dependency/icon packages giữ notices riêng. [Audio generator](../scripts/generate-demo-audio.cjs) tạo tone demo; benchmark synthetic không phải dữ liệu nghe thật.

Media/dataset/model legacy ngoài release tree do quyền phân phối chưa được xác minh. Không đưa lại vào public candidate chỉ vì có bản local. `.local-backups/`, env, SQL backup, evidence thô không thuộc showcase. CI/test lịch sử không chứng minh production readiness hoặc lịch sử Git sạch secret.
