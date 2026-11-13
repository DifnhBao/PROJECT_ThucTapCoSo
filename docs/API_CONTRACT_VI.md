# API contract — T05

Nguồn machine-readable: [OpenAPI 3.1](api/openapi.json). Chạy `npm run docs:api`
trong Server để tạo lại từ request schemas và các route đang mount. Unit test
đối chiếu file đã lưu với generator, route Express thật và schema references.
Không import app hoặc kết nối DB khi chỉ generate tài liệu.

## Envelope và DTO

Mọi JSON response thành công có đúng lớp ngoài `{data, meta: {requestId}}`.
`data` là **DTO nghiệp vụ hiện tại của endpoint**, không phải mọi endpoint đều
trả array hoặc trực tiếp một resource. DTO hiện có trường `data` vẫn giữ trường
đó để không đồng thời thay đổi domain mappers. Ví dụ:

```json
{
  "data": { "page": 1, "limit": 20, "total": 0, "songs": [] },
  "meta": { "requestId": "e490d07b-a092-4f0a-bbfe-118db5797ec5" }
}
```

Song detail có `body.data.data` là bài hát; playlist detail tương tự. Favorites
có `body.data.data` là rows và `body.data.pagination` là phân trang. Login user
có `body.data.data.user`; admin login có `body.data.admin`. Đây là shape được
mô tả trong OpenAPI và được tests kiểm tra, không dùng dò nhiều response formats.
Frontend bỏ **chính xác một** lớp envelope tại transport, giữ các mappers cũ.
Chưa chuyển toàn bộ inner DTO sang kiểu TypeScript nghiêm ngặt; T13 tiếp tục
dọn các `any`/legacy DTO đang có. Generic ApiSuccess<T> cho phép typed callers.

Mọi lỗi dùng:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không hợp lệ.",
    "details": [{ "path": "query.limit", "code": "too_big" }]
  },
  "requestId": "e490d07b-a092-4f0a-bbfe-118db5797ec5"
}
```

Server sinh UUID mới và trả cùng giá trị qua `X-Request-Id`; không tin ID client
để ghi log. Details chỉ gồm path/code, không echo input, SQL, password hoặc stack.
Unexpected errors trả message500 cố định; log request chỉ có requestId/code/event.
Các log nghiệp vụ/lifecycle ngoài request handler chưa được chuẩn hóa ở T05.
Error handler gọi next khi headers đã gửi. Nếu có response204 thì không gửi body.
Root `/` trả text kiểm tra API; không nằm trong JSON contract.

## Status và mã lỗi

| HTTP | Ý nghĩa / ví dụ code |
|---|---|
| 400 | INVALID_JSON, INVALID_URL, VALIDATION_ERROR, INVALID_REQUEST |
| 401 | AUTH_REQUIRED, INVALID_TOKEN, INVALID_CREDENTIALS, INVALID_REFRESH_TOKEN |
| 403 | FORBIDDEN, ORIGIN_FORBIDDEN |
| 404 | ROUTE_NOT_FOUND, SONG_NOT_FOUND, USER_NOT_FOUND, PLAYLIST_NOT_FOUND |
| 409 | DUPLICATE_RESOURCE, PLAYLIST_SONG_EXISTS, REFERENCE_CONFLICT, INVALID_SONG_STATE |
| 413 | PAYLOAD_TOO_LARGE, INVALID_UPLOAD |
| 415 | UNSUPPORTED_MEDIA_TYPE, UNSUPPORTED_ENCODING |
| 422 | INVALID_RESOURCE, INVALID_PASSWORD, PASSWORD_REUSED |
| 429 | Dành cho quota T07; T05 chưa thêm rate limiter |
| 500 | INTERNAL_ERROR; không chứa nguyên văn exception |

400 dùng cho request sai schema/range/type; 422 cho domain/model validation sau
khi request đã đúng cấu trúc. Không phân loại bằng substring thông báo tiếng Việt.
Sequelize unique/FK/validation errors được phân loại bằng class. Private resource
vẫn404 theo policy T01/T02. Login sai credentials nay401; frontend không tự gọi
refresh vì login/register thất bại. Chưa đổi rotation, single-flight hay revoke.

## Quy tắc input

- IDs: integer1–2147483647. URL chấp nhận chuỗi thập phân nguyên, không parse
  prefix kiểu `1abc`, boolean, array/object, số mũ hoặc số vượt phạm vi.
- Page1–1000000, limit1–100, mặc định theo endpoint hiện có. Search q/search là
  string tối đa200 ký tự; q trống trả list rỗng. Repeated/nested query bị từ chối.
- Body JSON dùng đúng kiểu số/boolean, không tự đổi `"5"` thành5 cho rating.
  Multipart duration chấp nhận decimal string vì FormData truyền text.
- Rating là integer1–5. Song duration0–86400; title1–255 ký tự; từng artist tối
  đa255, genre100 trong chuỗi tên phân tách dấu phẩy. Status đúng enum.
- Username1–100, email hợp lệ tối đa100. Password không trim, tối đa72 byte UTF-8
  để tránh bcrypt truncation; password mới giữ rule cũ: ít nhất8, hoa/thường/số/
  ký tự đặc biệt. Login không áp rule độ mạnh lên password đang tồn tại.
- Profile chỉ nhận firstName/lastName/gender/dateOfBirth/phone/address; role,
  userId/user_id, avatar và password injection bị400. Ngày ISO có thật, gender
  male/female/other. Chuỗi rỗng/null cho phép xóa trường profile nullable.
- Mutation bodies và queries strict: unknown fields bị400. Endpoint không nhận
  body chỉ chấp nhận body vắng hoặc object rỗng; Axios refresh/logout gửi `{}`.
- Activity: song/session/source/exit_reason bắt buộc, số hữu hạn không âm,
  duration/time tối đa86400, counter integer0–32767, max_position≤song_duration.
  Không nhận user_id/created_at từ client. T11 yêu cầu event_version=1 và UUID
  session_id;201 sau DB commit, replay200, khác nội dung409. Activity và qualified
  view ghi atomic, không dùng RAM buffer. Xem [listening contract](LISTENING_EVENTS_VI.md).

Authentication vẫn chạy trước schema ở protected routes, sau parser JSON. Do đó
malformed JSON có thể400, nhưng chưa đăng nhập với JSON hợp lệ nhận401. Validation
multipart chạy sau Multer, trước Cloudinary; file tạm của request bị từ chối sẽ
được cleanup. Không thay thế transaction/asset rollback hay MIME sniffing ở T08.

## Frontend và kiểm tra

Axios `http` bỏ envelope khi thành công; lỗi giữ AxiosError và HTTP status,
đưa message/code/requestId/details an toàn vào `error.response.data`. Fetch gọi
`readApiResponse`, lỗi thành ApiError có status/code/requestId/details. HTML lỗi proxy,
JSON hỏng hoặc thiếu envelope bị INVALID_API_RESPONSE, không giả list rỗng.
Refresh flow hiện có giữ nguyên ngoài empty-body/header và loại login khỏi retry.

T05 là đổi wire contract: triển khai backend/frontend cùng phiên bản; frontend
cũ không tự tương thích với envelope mới. Không có deploy trong task này.
Các adapter tests thực thi Axios/fetch và mapper thật với HTTP server thử nghiệm;
MySQL integration kiểm tra conflict409 thật và login/profile. Browser/E2E đầy đủ
và rollout strategy thuộc T19/T21.
