# Publication policy v1 — T02

Ngày: 16/10/2026. Bài được đọc/phát qua API người dùng phải đồng thời có
`status = approved` và `is_visible = true`. Bài bị xóa không tồn tại trong kết quả.
Query dùng chung `publicSongWhere`; không hạ điều kiện khi catalog công khai rỗng.

- Áp dụng cho danh sách/search/detail, nghệ sĩ, favorites, playlist songs,
  similar/recommendation/trending, rating/view và thêm bài vào playlist.
- Lọc eligibility trước limit/top-K, kể cả seed và ứng viên recommendation.
- Playlist public: guest xem được. Playlist private: owner hoặc admin/super_admin
  xem được; mọi người khác nhận 404 giống resource không tồn tại. Detail và danh
  sách playlist của mình đều chỉ chứa bài đủ điều kiện công khai, kể cả khi bài
  vừa bị ẩn sau lúc thêm vào playlist. Playlist rỗng vẫn được trả về.
- Preview bài chưa công khai chỉ qua `GET /api/songs/admin/:id` và danh sách admin
  đã được bảo vệ. Người dùng không được bật preview bằng query/body.
- Debug song-pair chỉ admin/super_admin; guest 401, user thường 403. Public similar
  chỉ trả thông tin bài public, điểm và lý do; không trả raw debug/detail nội bộ.
- Public resource thiếu/không được biết tồn tại trả 404; ID lỗi trả 400.
  Optional auth ở playlist: không có credential là guest; credential lỗi trả 401.

## Ranh giới storage

Policy này bảo vệ API. Media đã upload Cloudinary theo delivery type `upload`
có thể truy cập trực tiếp bằng URL đã biết, dù API không còn trả URL đó. Không
coi việc ẩn URL là bảo vệ storage hoặc tự thay đổi provider asset của dữ liệu cũ.

Trước khi coi pending media là bí mật ở tầng storage, cần chuyển asset sang
authenticated/private delivery, cấp signed delivery cho preview hợp lệ và có flow
publish/rollback khi duyệt bài (T08). Cần kiểm chứng trực tiếp URL cũ tại provider;
không claim đã thu hồi URL hoặc bảo vệ Cloudinary chỉ từ tests dùng mock.
