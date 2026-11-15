# Business rules as-built

Đây là requirement đang được code thực hiện. Giả định/chưa triển khai ở [README](README.md); ID được map tới test và dữ liệu ở [traceability](traceability.md).

| Rule | Quy định và giới hạn |
|---|---|
| BR01 Identity | Actor lấy từ principal đã verify, role/scope khớp phiên. Không chọn user bằng body/query; strict schema từ chối trường identity/role thừa tại các contract tương ứng |
| BR02 Publication | Chỉ `status=approved AND is_visible=true` là public; áp dụng cả seed/candidate recommendation, favorites, playlist songs và media gateway. Không fallback sang bài pending khi catalog rỗng |
| BR03 Moderation | User upload tạo pending/invisible; approve/reject chỉ nhận pending, lần lượt thành approved/visible và rejected/invisible. Admin update tổng quát còn cho sửa status; chưa coi đây là state machine đóng hoặc audit trail chuyển trạng thái |
| BR04 Playlist | Chỉ owner user được mutate; public ai cũng đọc, private chỉ owner/admin. Add song cần bài public; duplicate 409. Transaction khóa playlist, giữ thứ tự và rollback khi lỗi; không tự retry khi commit/network mơ hồ |
| BR05 Favorite/rating | User thao tác chính mình trên bài public. Favorite là toggle trạng thái, không phải API idempotent có key; không tự retry mù khi không rõ kết quả. Rating 1–5, một state cho cặp user/song. Không có event journal đầy đủ cho favorite/rating |
| BR06 Upload | Key gắn principal + operation/payload digest. Cùng key/payload replay kết quả đã commit, khác payload 409; đang processing/cleanup pending không tạo resource mới. Trạng thái commit unknown 503 giữ asset; không hứa exactly-once nếu caller mất key hoặc tạo key khác |
| BR07 Media | Asset mới authenticated, gateway kiểm tra ownership/publication mỗi lần đọc và không expose signed URL. Pending/hidden chỉ admin preview; user uploader không được mặc định preview. Không bảo đảm thu hồi URL legacy hoặc bytes đã tải |
| BR08 Listening | Chỉ finalized session thực sự playing được gửi. `qualified` khi duration DB biết, ≥20s và listened ≥20s. Seek/pause/buffer không tự cộng nghe; bài ngắn/unknown vẫn lưu engagement nhưng không tăng view |
| BR09 Dedupe | Unique `(user_id,event_id)` và payload digest. Insert activity + tăng view trong một transaction; retry giống nhận receipt, khác payload 409. Repeat với UUID mới là session mới. Không có DB ACK thì không coi event đã được lưu |
| BR10 Session/account | Refresh/revoke tách scope; đổi account loại cache/private state và pending event cũ. Cùng account refresh giữ phiên nghe. Client retry hữu hạn, không có persistent outbox; đóng tab/mất mạng có thể mất event |
| BR11 Recommendation | Serving Node snapshot + eligibility khi hydrate. Qualified receipts/favorites/high ratings tạo positive; low rating veto. Cold user dùng fallback public; score là điểm xếp hạng, không phải xác suất thích. Snapshot rebuild không publish kết quả dở dang |
| BR12 Account administration | Admin chỉ reset/delete user; super_admin thêm target admin, không self/super_admin. Tạo admin chỉ super_admin. Tự đổi password cần mật khẩu cũ, không dùng reset target để thay thế |

## Trạng thái tài nguyên không đồng nghĩa nhau

`songs.status` quyết định moderation, `songs.is_visible` quyết định hiển thị; approved nhưng hidden vẫn không public. `upload_receipts.processing/completed/failed` theo dõi upload intent, không phải trạng thái duyệt song. `media_assets` theo dõi asset planned/owned/cleanup, không cấp quyền public chỉ từ việc upload xong. `UserActivities.qualified` là receipt đã chốt, không phải client progress tạm thời.

## Tính nhất quán khi tài nguyên thay đổi

Ẩn bài không tự xóa favorite/playlist membership/activity đã lưu. Lần đọc library lọc bài public; ghi interaction mới bị từ chối. Retry receipt listening đã tồn tại vẫn trả được sau khi bài bị ẩn, nhưng auth phải hợp lệ. Xóa user/song có thể cascade xóa activity nên dedupe không được cam kết sau khi receipt bị xóa. Snapshot stale vẫn phải lọc eligibility lúc phục vụ.

Nguồn chi tiết: [publication](../PUBLICATION_POLICY_VI.md), [upload](../UPLOAD_LIFECYCLE_VI.md), [playlist concurrency](../PLAYLIST_CONCURRENCY_VI.md), [listening](../LISTENING_EVENTS_VI.md), [sessions](../SESSION_LIFECYCLE_VI.md), [recommendation](../RECOMMENDATION_ENGINE_VI.md).
