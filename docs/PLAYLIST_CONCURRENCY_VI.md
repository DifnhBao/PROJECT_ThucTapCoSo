# T09 — Playlist transaction và request đồng thời

## Policy v1

- Chỉ owner được thêm/xóa bài hoặc xóa playlist. Không tìm thấy hoặc không sở hữu
  trả404 PLAYLIST_NOT_FOUND. Identity lấy từ auth middleware, không từ body.
- Thêm bài public approved+visible:200. Bài đã có:409 PLAYLIST_SONG_EXISTS và
  thông báo “Bài hát đã có trong playlist.”, không thay position. Hai request thêm
  cùng bài có một success; frontend hiển thị409, không coi là success hoặc retry.
- Thêm pending/rejected/hidden/deleted:404 SONG_NOT_FOUND, không thay dữ liệu.
  Owner vẫn được **gỡ một membership đã tồn tại của bài vừa bị ẩn**; thao tác này
  không công khai bài hát. Gỡ membership không tồn tại trả200 theo policy cũ.
- Gỡ bài để lại khoảng trống position; lần thêm sau dùng max hiện tại+1, không
  renumber toàn bộ. Position không vượt INT signed2147483647; quá giới hạn trả409.
- Xóa playlist và toàn bộ memberships trong một transaction; lỗi ở bất kỳ bước
  nào rollback cả parent lẫn joins. Xóa lại parent đã mất trả404.

## Transaction và khóa

Mọi add/remove/delete bắt đầu managed transaction, SELECT playlist theo
`playlist_id + signed user_id` với FOR UPDATE. Đây là điểm serial hóa của playlist,
kể cả khi playlist chưa có bài. Không dùng mutex trong memory; nhiều API process
cùng MySQL vẫn phối hợp qua row lock. Playlist khác không bị khóa bởi cơ chế này.

Add tiếp tục SELECT bài public với shared lock/current read trong cùng transaction,
rồi kiểm tra duplicate và max position bằng locking reads trước INSERT. Như vậy
snapshot cũ của REPEATABLE READ không được dùng để cấp position hoặc xác nhận trạng
thái publication. Moderator cập nhật song phải chờ shared lock, hoặc add phải chờ
moderator commit rồi kiểm tra lại. Publication đổi **sau** add commit vẫn có thể
làm bài bị ẩn; các read paths T02/T08 tiếp tục lọc/kiểm tra quyền ở lần đọc mới.

Lock order của add: parent playlist → song → playlist_songs. Remove/delete cùng
khóa parent trước joins. DB primary key `(playlist_id,song_id)` và unique
`(playlist_id,position)` từ T04 giữ làm lớp bảo vệ cuối. Không cần schema migration
hoặc thay index trong T09. Không gọi network/provider khi giữ transaction.

Helper chỉ retry lỗi MySQL1213 deadlock hoặc1205 lock timeout sau managed rollback,
tối đa3 attempts với backoff10/20ms. Hết lượt trả409 PLAYLIST_BUSY; unique conflict
bất ngờ trả409 PLAYLIST_CONFLICT. DB lock-wait timeout vẫn quyết định thời gian chờ
mỗi attempt; đây không phải tổng timeout request cố định. Cần tune cùng ingress/DB
ở môi trường triển khai. Domain errors và COMMIT/network error không tự retry.

Nếu response/ack mất sau add commit, request lặp có thể trả409 vì bài đã được thêm;
client có thể GET playlist để xác nhận trạng thái. Không tuyên bố exactly-once
transport hoặc suy lỗi network là mutation chưa commit.

## Giao diện và phạm vi

Client Axios hiện tại chuyển message/code409 lên AddToPlaylistModal; modal hiển
thị err.message. Kiểm thử gọi actual addSongToPlaylistApi qua HTTP, nhận đúng message
và chỉ một request, không refresh/retry. Không cần đổi product flow.

Dự án chưa có route/UI reorder. T09 không thêm chức năng reorder mới; nếu bổ sung
sau này phải dùng cùng parent lock, validate đủ song IDs và chiến lược cập nhật
không vi phạm unique position giữa các bước. Import/script ghi trực tiếp joins
cũng phải tuân thủ lock protocol; unique constraints một mình không đảm bảo mọi
writer bên ngoài giữ cùng ngữ nghĩa.

## Kiểm chứng

MySQL8 thật, HTTP và auth services thật:12 concurrent adds khác bài có đủ12 rows/
positions1..12;8 adds cùng bài có1x200/7x409; ownership và publication denies;
insert-then-failure rollback; join-delete-then-parent-failure rollback; add/delete,
add/remove races; playlist khác tiếp tục khi một parent bị giữ lock; moderator
commit hide rồi add nhận404. Provider không được gọi trong T09.

Unit helper retry kiểm tra code1213/1205, giới hạn attempts, unique409 và không
replay ambiguous COMMIT. Các unit policy cũ mock transaction boundary rõ ràng để
giữ SQL guard; không dùng mocks đó làm bằng chứng concurrency/rollback.

Nguồn:

- [MySQL locking reads](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html)
- [Sequelize managed transactions và locks](https://sequelize.org/docs/v6/other-topics/transactions/)
