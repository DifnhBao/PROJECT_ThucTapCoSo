# HTTP, refresh và cache theo tài khoản — T12

Hoàn tất ngày29/10/2026. Áp dụng cho client Next.js; không thay authorization
hoặc cookie/session contract phía server của T06/T07.

## Một transport cho API

`api-request.ts` giữ base `/api`, credentials/include, no-store và timeout15 giây.
Trên browser chỉ cho URL cùng origin. `api-transport.ts` sở hữu việc refresh và
replay401. `http.ts` giữ Axios làm facade cho các consumers cũ, dùng fetch adapter
chung thay vì network adapter/interceptor refresh riêng. `utils/refreshToken.ts`
chỉ còn các tên tương thích userFetch/adminFetch trỏ về transport chung.

JSON vẫn dùng envelope T05 và chỉ unwrap một lớp. Axios errors giữ status/code/
message/requestId/details,429 giữ Retry-After. Multipart không ép JSON hoặc tự đặt
boundary; fetch tạo boundary từ FormData. Native media và sendBeacon là các
adapter riêng, không đi qua JSON adapter. Các public reads catalog/search/artist/
rating summary/similar không tự refresh phiên; private reads dùng scope rõ ràng.

## Refresh, account generation và trạng thái UI

Auth state độc lập theo user/admin, có principal, epoch và accessVersion. Epoch
đổi khi tài khoản thay đổi/hết phiên; AbortController hủy request cũ. Dù transport
bỏ qua abort, kiểm tra epoch vẫn loại response cũ. Profile response chỉ được cập
nhật principal khi epoch còn khớp. Frontend identity chỉ dùng để quản lý UI/cache,
không thay quyền được backend xác minh.

Một refresh flight cho mỗi scope+epoch **trong một tab**. Refresh timeout10 giây,
không refresh chính login/register/logout/refresh endpoint. Một request gốc chỉ
replay một lần sau401, giữ method/body/key. accessVersion nhận biết401 đến muộn
từ request bắt đầu trước refresh đã hoàn tất, nên không refresh thêm lần nữa.

Refresh lỗi hoặc replay tiếp tục401 đưa scope về expired, xóa principal/cache.
Các private requests tiếp theo bị chặn đến khi có lần đăng nhập/discovery mới;
không tạo vòng lặp refresh. Đổi user không làm hết phiên admin và ngược lại.
Không tự refresh public request hoặc tự retry POST vì lỗi mạng/5xx.

Login/logout được xếp hàng theo scope trong tab, dùng cùng Web Lock với refresh
nếu browser hỗ trợ để hạn chế ghi cookie lệch thứ tự giữa tab. Thao tác cũ bị
thay thế không được trả identity cũ cho UI. Khi một thao tác bị thay thế từ tab
khác, UI đọc lại profile hiện hành thay vì kẹt ở trạng thái changing.
Web Locks xếp hàng giữa tab, không phải một distributed single-flight cache;
server rotation/grace T06 vẫn chịu trách nhiệm xử lý concurrency ngoài tab.

BroadcastChannel thông báo begin/end theo scope, không truyền token/profile.
Tab nhận xóa state cũ và đọc lại profile từ server; có storage-event fallback.
Nếu cả hai cơ chế bị browser chặn, chỉ bảo đảm invalidation trong tab hiện tại;
tab khác đồng bộ lại khi có request/check phiên. Không cam kết mọi thứ tự network
vô hạn giữa các browser/device.

## Cache, playlist, player và upload

AccountCacheBoundary tạo SWR provider Map mới theo epoch và remount vùng dữ liệu
private khi đổi phiên. Keys chứa scope + userId + epoch + resource; mutate dùng
bound SWR mutation, không dùng global key `users`/`admins` cho tài khoản khác.
Playlist hooks dùng SWR với cùng quy ước. Các component giữ state cục bộ phía
trong boundary cũng bị reset; callback/response cũ không thể ghi vào cache mới.
Shared ModalProvider xóa modal/data khi epoch user hoặc admin đổi, không giữ form
private của tài khoản cũ. Refresh cùng epoch không đóng modal.

Queue và audio được dừng/reset khi boundary đổi. Player state v3 bổ sung owner,
chỉ restore sau khi xác định auth và owner khớp; không restore legacy state không
có owner/v2 vì không biết thuộc tài khoản nào. Login/logout/account change xóa
player keys cũ. Reload cùng owner vẫn restore paused. Không lưu token vào cache.

Upload intent key gắn scope/user và nội dung. Đổi tài khoản trong lúc hash file
làm intent cũ bị từ chối.401 replay giữ cùng key/FormData; lỗi mạng không khiến
transport gửi lại upload tùy ý. T08 vẫn quyết định idempotency ở server.
Listening delivery dùng cùng transport và giữ UUID/body T11. Refresh cùng account
giữ phiên nghe hiện tại (chỉ epoch đổi mới discard); đổi account bỏ
session/pending event cũ. Pagehide beacon/keepalive không khởi tạo refresh mới và
vẫn là best effort, không có persistent outbox/exactly-once delivery.

## Favorites và optimistic mutation

SWR Infinite tải20 bài/trang, có Tải thêm bài hát đến hết totalPages. Trang lỗi
giữ các trang đã tải, hiển thị retry, không tự retry liên tục. Deduplicate theo
song ID. Cache status riêng giữ cả true/false của bài ngoài trang đầu; tải trang
mới không thay toàn bộ status map bằng các ID trong trang đó.

Mỗi bài chỉ có một toggle đang chạy. UI đổi ngay rồi dùng `liked` từ response để
chốt; lỗi thì rollback đúng phiên/version và hiển thị toast. Response GET cũ không
đè optimistic mutation mới. Nếu POST có kết quả mơ hồ do mất response, đọc lại
status bằng GET và revalidate list; **không gửi lại POST toggle**. Nếu GET cũng
lỗi, giữ rollback và thông báo để người dùng tải lại. Sau thành công, revalidate
các trang đã tải; mất response/thất bại của A không rollback hoặc hiện toast lên B.

Pagination vẫn theo offset của backend. Bộ test41 bài xác nhận tải đủ3 trang cho
danh sách ổn định; không tuyên bố có snapshot nhất quán khi nhiều thiết bị cùng
thêm/xóa giữa các trang. Có thể cần tải lại danh sách khi dữ liệu thay đổi ngoài tab.

Kiểm chứng, lệnh chạy và giới hạn: [verification/T12.md](verification/T12.md).
