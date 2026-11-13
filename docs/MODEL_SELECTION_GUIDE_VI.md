# Chọn GPT hoặc Gemini để thực hiện kế hoạch portfolio

Ngày đối chiếu tài liệu: **16/10/2026**. Áp dụng cho [kế hoạch T00–T25](INTERN_PORTFOLIO_EXECUTION_PLAN_VI.md).

## 1. Khuyến nghị chính

**Nếu tiếp tục làm trong Codex với repo hiện tại: dùng GPT-6.1-Sol High làm lựa chọn mặc định.** Dùng GPT-6-Astra High/Extra High cho task cần phân tích sâu hoặc có rủi ro bảo mật/dữ liệu. GPT-6-Luna phù hợp các chỉnh sửa nhỏ, đã có đặc tả rõ và kiểm tra được.

**Nếu dùng Gemini: chọn Gemini 4 Argon cho công việc khó; Gemini 3.8 Flash cho triển khai thông thường hoặc việc có phạm vi rõ.** Chỉ chọn model thực sự có trong tài khoản/công cụ của bạn. Danh mục API không đảm bảo model xuất hiện trong ứng dụng Gemini hoặc IDE đang dùng.

Các tên GPT trên đã có trong model catalog cục bộ của Codex được kiểm tra. Chưa kiểm tra quyền truy cập Gemini của tài khoản người dùng. Không cần mua thêm Gemini chỉ để hoàn thành kế hoạch nếu GPT hiện có đáp ứng công việc và các kiểm tra.

Đây là **đề xuất phân công theo độ khó và rủi ro**, không phải benchmark chứng minh GPT/Gemini nào chính xác hơn trên repo này. Model mạnh vẫn có thể sai; kết quả chỉ được nghiệm thu bằng code review, test và hành vi thực tế.

## 2. Những thông tin đã xác minh với nguồn chính thức

- OpenAI đề xuất GPT-6.1 Sol cho coding phức tạp và Astra cho công việc khó nhất; Luna cho việc rõ, lặp lại. Reasoning effort cao hơn có thể hữu ích nhưng tăng thời gian/token; phần lớn task không cần Max/Ultra. Nguồn: [OpenAI Models](https://learn.chatgpt.com/docs/models), [Model selection](https://developers.openai.com/api/docs/guides/model-selection).
- Google mô tả Gemini 4 Argon là model reasoning cho các bài toán software engineering phức tạp và Gemini 3.8 Flash cho software engineering/agent workflows với ưu tiên hiệu quả. Nguồn: [Gemini 4 Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).
- Argon và Flash trên hỗ trợ thinking low/medium/high qua API. Tên control trên ứng dụng/IDE có thể khác. Không quy đổi GPT High thành cùng một ngân sách hay mức chất lượng với Gemini High. Nguồn: [Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking).

Giá/quota thay đổi theo sản phẩm và tài khoản. Hướng dẫn này không suy ra chi phí thuê bao từ giá API, không đưa tỷ lệ “model A tốt hơn B” khi chưa có phép đo.

## 3. Quy ước model trong bảng

| Ký hiệu | Model / mức khởi đầu | Dùng khi |
|---|---|---|
| **S-M** | GPT-6.1-Sol · Medium | Công việc nhiều file nhưng logic rõ, sửa UI/config thông thường |
| **S-H** | GPT-6.1-Sol · High | Triển khai backend/frontend có liên hệ nhiều module, debugging |
| **A-H** | GPT-6-Astra · High | Policy, schema, transaction, phân tích thuật toán và tradeoffs |
| **A-X** | GPT-6-Astra · Extra High (`xhigh`) | Session/race khó, data correctness, evaluation và final review |
| **L-H** | GPT-6-Luna · High | Chỉnh tài liệu/format nhỏ từ bằng chứng đã được chốt |
| **G-M / G-H** | Gemini 4 Argon · Medium / High | Lựa chọn Gemini cho phân tích/triển khai khó |
| **F-M / F-H** | Gemini 3.8 Flash · Medium / High | Lựa chọn Gemini cho task scope rõ, sửa UI/tests/config |

Các mức trên là điểm bắt đầu đề xuất cho repo này. Có thể giảm nếu task đã nhỏ và rõ; tăng khi có bế tắc được xác định. Không cần chọn mức cao nhất cho mọi lượt. Khả năng đọc repo, sửa file, chạy terminal/tests của công cụ cũng quan trọng; một model chỉ nhận đoạn code dán trong chat không tự kiểm chứng được toàn ứng dụng.

## 4. Model tương ứng cho từng task

Cột GPT và Gemini là **hai phương án thay thế**, không bắt buộc chạy cả hai để viết code. Một model thực hiện tại một thời điểm; task rủi ro cao có thêm lượt review độc lập.

| Task | Công việc | GPT đề xuất | Gemini thay thế | Điểm cần kiểm chứng / review |
|---|---|---|---|---|
| T00 | Scope, baseline, khung test | S-M | F-M | Import app không listen/timer; test không trỏ DB thật |
| T01 | RBAC, self-check, object authorization | A-H | G-H | **Review riêng** permission matrix, deny cases và HTTP+DB tests |
| T02 | Publication và playlist privacy | A-H | G-H | **Review riêng** mọi public read path, không chỉ UI |
| T03 | Secrets, dependencies, env config | S-H | G-H | Scan thật; advisory triage; không lộ secret trong report |
| T04 | Migrations, schema và seed | A-H | G-H | **Review riêng** fresh DB, schema drift, partition/unique/FK và data preservation |
| T05 | Validation, errors, API contract | S-H | F-H | Review contract; kiểm tra mọi frontend consumer bị ảnh hưởng |
| T06 | Refresh rotation và revoke session | A-X | G-H | **Review riêng** race, scope, revoke, cookie và transaction boundary |
| T07 | Rate limits, origin, cookie/CSRF | A-H | G-H | **Review riêng** trên topology thật; trusted proxy và quota bypass |
| T08 | Upload và partial failure | S-H | G-H | **Review riêng** cloud success/DB fail, cleanup fail, retry/idempotency |
| T09 | Playlist transaction/concurrency | A-H | G-H | **Review riêng** concurrent requests bằng MySQL thật |
| T10 | Player state, shuffle, pagination | S-H | F-H | Review state transitions; regression queue0/1/20/21 và network failure |
| T11 | Listening events và deduplication | A-X | G-H | **Review riêng** ACK/durability, duplicate, partition và double count |
| T12 | HTTP client, refresh, user cache | S-H | G-H | Review auth races; logoutA/loginB; retry POST không gây trùng |
| T13 | Types, dead code, quality gates | S-M; S-H nếu refactor rộng | F-M/F-H | Compiler/lint/build thật; tránh xóa module còn được gọi |
| T14 | Recommendation correctness/serving | A-H | G-H | **Review riêng** eligibility, bounded query, snapshot version và fallback |
| T15 | Metrics, holdout và evaluation | A-X | G-H | **Review riêng** temporal split/leakage; metric tính tay; baseline đúng |
| T16 | Pages, deep links, UI states | S-M | F-M | Browser tests: tab mới, stale search response, loading/error/empty |
| T17 | Responsive/accessibility | S-M | F-M | Browser screenshots, keyboard/focus và zoom; đọc CSS chưa đủ |
| T18 | Frontend performance | S-H | F-H | Profiler/Lighthouse trước-sau; không nhận số đo tưởng tượng |
| T19 | Regression/integration/E2E suite | S-H | G-H | Review assertion và coverage rủi ro; tests không chỉ mirror implementation |
| T20 | Docker, probes, logs/shutdown | S-H | G-H | Review migration/runtime/env/secrets; fresh-stack và restart test |
| T21 | CI/release | S-M | F-H | Chạy workflow thật; không có production secrets trong PR job |
| T22 | Product/BA documentation | S-M | G-M | Kiểm tra traceability và consistency với code/test thực tế |
| T23 | Deploy demo và smoke | S-H | G-H | Kiểm chứng live HTTPS/auth/media; model phải có công cụ phù hợp |
| T24 | README, showcase, CV | L-H để soạn; S-M để kiểm chứng | F-M | Đối chiếu facts/metrics với evidence trước khi công bố |
| T25 | Final acceptance | A-X | G-H | **Review riêng** toàn release; đọc evidence, tự chạy checks quan trọng |
| X01 | Feedback/onboarding recommendation | S-H | G-H | Ranking thay đổi đúng feedback, không fake explanation |
| X02 | Jobs/worker/Daily Mix | A-X | G-H | **Review riêng** durable enqueue, retry, idempotency, kill/restart |
| X03 | Python service thật | A-H | G-H | **Review riêng** ID contract, training/serving versions, timeout/fallback |

Không để model nhỏ tự quyết thay đổi auth/schema chỉ vì thay đổi nhìn ngắn. Một dòng self-check có thể rủi ro hơn một component UI dài hàng trăm dòng.

## 5. Ba cách sử dụng phù hợp ngân sách

### Phương án khuyến nghị: tiếp tục trong Codex

1. Dùng S-H làm mặc định; S-M cho T00/T13/T16/T17/T21/T22.
2. Dùng A-H/A-X ở các task đã chỉ định trong bảng, hoặc ở bước thiết kế/review khi Sol triển khai theo đặc tả đã chốt.
3. Chỉ dùng L-H cho việc nhỏ có đầu vào rõ như sửa chính tả README hoặc chuyển evidence thành bảng; phần xác thực claim vẫn dùng code/test.
4. Giữ một chat triển khai cho task đang làm; khi chuyển task cung cấp commit, trạng thái và evidence. Không cần mang toàn lịch sử dài nếu có handoff tốt.

### Phương án Gemini

1. G-H cho auth/schema/concurrency/evaluation; F-M/F-H cho phần triển khai có scope rõ theo bảng.
2. Dùng coding agent/IDE có quyền đọc repo và terminal test. Nếu chỉ dùng web chat, thực hiện patches có review và tự chạy các lệnh nghiệm thu; yêu cầu model ghi NOT_RUN cho bước không chạy được.
3. Tên model API hiện được xác minh: `gemini-4-argon`, `gemini-3.8-flash`. Nếu client/tài khoản không có, kiểm tra model picker và tài liệu hiện tại; không giả định nhãn “Pro”, “Thinking” hoặc “Fast” luôn ánh xạ tới các ID này.

### Phương án dùng cả hai

Một model triển khai, model còn lại review cùng một commit/diff. Ví dụ Sol/Astra viết; Argon tìm đường bypass/edge cases. Có thể đảo lại nếu Gemini là công cụ triển khai chính.

Không cho hai agent sửa cùng file đồng thời. Reviewer chỉ đọc và đề xuất findings; implementer xử lý findings rồi chạy lại tests. Hai model đồng ý vẫn chưa phải bằng chứng đúng. Nếu ngân sách hạn chế, ưu tiên lượt review khác cho T01/T02/T04/T06/T07/T09/T11/T14/T15/T25.

## 6. Quy trình tăng độ chính xác cho mỗi task

1. **Đưa đúng đầu vào:** task tương ứng, nguồn audit, branch/commit, file liên quan, business rules và trạng thái dependencies. Không upload `.env`, private key hoặc dump người dùng thật.
2. **Xác định invariants trước:** ví dụ admin không reset super_admin; event retry không tăng count; shuffle giữ current song. Model phải chỉ ra test/kiểm tra chứng minh invariant.
3. **Thay đổi vừa đủ:** một task/PR; nếu cần sửa prerequisite thì ghi rõ. Không yêu cầu model “hoàn thành toàn bộ26 task” trong một prompt.
4. **Thực thi và kiểm tra:** test hành vi/negative cases, MySQL thật cho concurrency, browser cho UI, pipeline thật cho CI/deploy. Phân biệt PASS/FAIL/NOT_RUN.
5. **Review:** reviewer đọc source và diff, tự tìm counterexample; không chỉ đọc tóm tắt của implementer. Review cùng commit để tránh nhận xét trên bản cũ.
6. **Đóng task:** cập nhật `docs/verification/Txx.md` và checklist khi có bằng chứng. Chưa chạy được thì giữ IMPLEMENTED, không VERIFIED.

Chuyển sang model mạnh hơn khi có design uncertainty hoặc đã thử có căn cứ mà vẫn lỗi. Trước đó kiểm tra thiếu context, test fixture sai, env sai hoặc dependency chưa hoàn thành. Đổi model không sửa được môi trường sai.

## 7. Prompt mẫu để giao việc

### Prompt triển khai một task

```text
Thực hiện task Txx trong docs/INTERN_PORTFOLIO_EXECUTION_PLAN_VI.md.
Đọc phần task và audit liên quan, kiểm tra dependencies và source hiện tại.
Hoàn thành task này với các thay đổi cần thiết và giữ các thay đổi đang có của tôi.

Trước khi sửa, chỉ rõ business invariants và cách kiểm tra tương ứng.
Với bug logic/bảo mật, thêm regression test tái hiện lỗi trước khi sửa khi khả thi.
Đọc đầy đủ luồng route/controller/service/model/client bị ảnh hưởng.
Không bỏ qua validation, typecheck hoặc tests để làm trạng thái xanh.
Không dùng production database/secrets cho test.

Chạy các kiểm tra nghiệm thu phù hợp. Ghi rõ PASS/FAIL/NOT_RUN,
lệnh đã chạy và hạn chế. Cập nhật docs/verification/Txx.md.
Chỉ đánh dấu VERIFIED khi có đủ evidence; nêu việc còn lại nếu chưa đạt.
```

### Prompt review độc lập

```text
Review thay đổi của task Txx tại commit/diff tôi cung cấp.
Chỉ đọc, không sửa file. Đọc đặc tả task, source hiện tại và tests.

Tìm bug, bypass permission, race, data loss, contract mismatch,
missing assertions và regression. Ưu tiên finding có trigger cụ thể,
file/dòng, tác động và cách tái hiện. Phân biệt xác nhận với nghi ngờ.
Không coi nhận xét của model trước là bằng chứng.
Nếu không thấy finding có căn cứ, nói rõ phạm vi đã kiểm tra và giới hạn.
Không tuyên bố đã chạy test nếu môi trường không cho phép.
```

### Prompt nghiệm thu T25

```text
Nghiệm thu portfolio-v1 theo task T25 và AT01–AT26 trong execution plan.
Kiểm tra đúng release commit; đối chiếu code, tests, docs và demo evidence.
Tự chạy checks khả dụng, nêu NOT_RUN cho phần không thực hiện được.
Lập bảng PASS/FAIL/NOT_RUN + evidence, liệt kê blocker P0/P1 còn tồn tại.
Không đánh dấu release hoàn tất dựa vào checklist tick sẵn hoặc lời model khác.
```

## 8. Cách tự chọn giữa GPT và Gemini bằng dự án này

Nếu muốn quyết định bằng bằng chứng, chọn ba bài thử đại diện: T01 policy, T10 player invariant và T15 metric fixture. Cho hai model cùng source/spec trong hai nhánh hoặc patch độc lập; chưa merge thay đổi thử nghiệm.

So sánh số acceptance cases đạt, bug phát hiện sau review, số vòng sửa, chất lượng giải thích, thời gian và mức tiêu thụ thực tế. Không chấm bằng độ dài câu trả lời hay việc model nói “đã hoàn thành”. Các task bảo mật vẫn cần review/test dù một model thắng bài thử.

Với môi trường hiện tại, không cần chờ phép so sánh này mới bắt đầu: **T00 dùng Sol Medium; T01/T02 dùng Astra High; tiếp tục theo bảng và các cổng nghiệm thu.**
