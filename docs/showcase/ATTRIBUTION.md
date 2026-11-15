# Attribution và phạm vi license

Chủ dự án xác nhận đồ án cá nhân và chọn MIT ngày 2026-11-15. [LICENSE](../../LICENSE) áp dụng cho source do tác giả sở hữu; package Server được đồng bộ metadata từ ISC sang MIT. Không đổi license của dependencies hoặc tuyên bố sở hữu nội dung bên thứ ba.

| Nhóm | Nguồn / trạng thái |
|---|---|
| Demo audio | Tone 440Hz tự sinh bằng [generate-demo-audio.cjs](../../scripts/generate-demo-audio.cjs); không dùng bài hát thương mại trong showcase |
| Synthetic fixture/evaluation | Generator và protocol trong Benchmark, T15; không phải dữ liệu nghe thật hoặc dataset đại diện thị trường |
| Screenshot/video showcase | Ghi từ giao diện đang chạy, dữ liệu synthetic; phiên đăng nhập chuẩn bị trước, không quay mật khẩu. Caption overlay phục vụ thuyết minh, không là feature của app |
| Dependency/icon packages | Next/React/Express/Sequelize/Cloudinary SDK/Font Awesome/Lucide/react-icons giữ notices/license riêng theo package lock và gói phân phối; MIT root không thay thế chúng |
| Artwork và dataset/model nghiên cứu legacy | T25 lưu 130 tệp vào archive private có SHA-256, ngoài cây nguồn phát hành; không claim MIT hoặc quyền phân phối cho chúng. Nghiên cứu Python không phải deliverable runtime v1 |
| Branding/badge/ảnh cũ | T25 bỏ NCT/BTM và badge store khỏi UI, archive riêng thư mục ảnh legacy. Không có app mobile được phát hành hoặc endorsement store |
| Default song/avatar/artist + tên TuneTrek | SVG tối giản được tạo bằng code cho demo, không dùng ảnh nghệ sĩ/người thật. Tone tự sinh và các SVG mới thuộc source MIT của dự án |

Không tự gán license cho tập dữ liệu/asset chỉ vì URL truy cập được hoặc repo đã public. Phần nghiên cứu Python chưa có kết quả hoàn chỉnh không được quảng bá như engine production.
