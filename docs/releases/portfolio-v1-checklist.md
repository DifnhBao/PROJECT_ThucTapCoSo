# Portfolio-v1 — checklist phát hành

Người kiểm tra: trợ lý thực thi, chủ dự án LE DINH BAO. Ngày: 2026-11-15 (Asia/Saigon).
Đây là checklist tại source candidate, không tự chứng nhận release đã đạt. SHA/CI/runtime và checklist đã chốt được đính kèm [release notes portfolio-v1](https://github.com/DifnhBao/PROJECT_ThucTapCoSo/releases/tag/portfolio-v1) sau kiểm tra. Nếu chưa có release/tag, các gate dưới đây vẫn là NOT_RUN hoặc chờ xác nhận cuối; không lấy CI cũ thay cho CI exact SHA.

## Audit → xử lý

| Audit | Xử lý trong scope | Bằng chứng / giới hạn |
|---|---|---|
| A1, A4 | Quality gates bật, code chết gỡ, nghiên cứu tách khỏi runtime | T00/T13, CI; archive nghiên cứu giữ riêng T25 |
| A2, U4 | Transport thống nhất, refresh theo scope, cache theo account, library pagination | T12/T19, account browser |
| A3, E4, E5 | Upload use case/adapter/receipt/cleanup, transaction boundary | T08/T09/T11, MySQL integration |
| A5, U8 | Tách progress subscriptions, đo development Profiler | T18; không claim production speedup, image warnings còn là polish |
| S1, S2 | Principal/role/owner policy, recommendation /me | T01, AT01/02, HTTP + MySQL policy tests |
| S3 | Publication/private playlist enforced tại backend và gateway | T02/T08, AT03–07, integration/E2E |
| S4, E2 | Digest refresh/rotation/revoke; khởi động validate env | T03/T06/T20, AT08–10; không lưu JWT refresh thô mới |
| S5, O3 | Current tree/range scan, bỏ dump/MP3/ZIP; dataset/model/ảnh legacy lưu private | T03/T25; lịch sử Git cũ có JWT đã hết hạn, không tuyên bố history sạch, không rewrite lịch sử |
| S6, D6, E1 | Zod/AppError/envelope/OpenAPI | T05, invalid inputs/status/error tests |
| S6 | Cookie/origin/CSRF/quota/proxy policy và validation | T05/T07, security browser/integration; hạn mức RAM theo một instance đã ghi rõ |
| S7 | Dependency audit chặn high/critical, không tự force-fix | T03/T21 và audit trên candidate T25; moderate theo dõi riêng |
| D1, D2 | Canonical migrations/guard/seed synthetic; quyền app tách migrator | T04/T20, fresh DB schema + legacy migration tests |
| D3 | Lock parent/transaction append/reorder/delete | T09, concurrent playlist integration |
| D4, D5 | Snapshot/top-K/batch/bounded fallback; index/query evidence | T14; rebuild có budget, không claim hết mọi chi phí N² offline |
| E6, U3 | Audio error/retry/stall/queue, dialog keyboard và slider labels | T10/T17, player/account/responsive browser |
| E3, U5 | Durable listening receipt, source snapshot, retry/dedup | T11, 8 concurrent duplicates chỉ cộng một lần; không claim exactly-once delivery |
| U1, U2, U7 | Responsive/states/search cancellation/deep links | T16/T17/T19; thêm regression direct /login → Home tại T25 |
| U6, O4 | Bỏ metric giả/feature chưa ship, evaluator đúng tên và baseline | T15/T16/T24; Hybrid bằng Content-only trong synthetic fixture |
| O1, O2 | Docker non-root/health/CI/README/showcase | T20–T25; hosting là PC+tunnel, không Render/24-7 |
| O5 | Python không serving, đánh giá INCOMPLETE; archive ngoài release | T13/T15/T25; không “sửa xong Python” bằng cách đổi tên |

Audit gốc được giữ nguyên như lịch sử phát hiện: [technical audit](../audit/TECHNICAL_AUDIT_VI.md). Không dùng mô tả lỗi cũ làm trạng thái hiện tại.

## Gates cần chốt trên đúng commit

- [ ] Gate A: authorization/publication/session/abuse/config + fresh DB.
- [ ] Gate B: upload/playlist/listening/account/player correctness.
- [ ] Gate C: explanation/evaluation/deep links/responsive/performance evidence.
- [ ] Gate D: CI exact SHA, setup sạch, HTTPS, docs/assets/source provenance, 3 câu chuyện kỹ thuật.
- [ ] AT01–AT26: gắn kết quả lịch sử và kiểm chứng cuối, không đổi NOT_RUN thành PASS.
- [ ] Không P0/P1 còn mở ảnh hưởng demo path; audit high/critical và secrets phải đạt, không hạ ngưỡng để xanh.
- [ ] Demo pin images đúng source, có rollback, seed không chạm DB đang dùng.
- [ ] Public tag/release chỉ tạo sau khi các gate đạt; không bypass branch protection.

## Ngoài scope / tồn đọng không chặn demo

- X01 onboarding/negative feedback, X02 durable jobs/Daily Mix, X03 mở rộng/production operations vẫn là backlog sau v1.
- Moderate dependency findings cần theo dõi đúng advisory; không phải exception high/critical. JWT/dump lịch sử cần rà riêng nếu muốn chứng nhận sạch toàn lịch sử; release không rewrite public history.
- Archive nghiên cứu/ảnh chưa xác minh quyền được bảo toàn private; không phân phối trong source tree/release mới. Source tác giả MIT; notices dependency giữ riêng.
- Không có người dùng/traffic thật hay SLA; synthetic evaluation không chứng minh uplift. Video im lặng, không phải bản thu âm.

## Ba câu chuyện để phỏng vấn

1. Lỗi bodyless PATCH qua proxy bị 415: transport gửi JSON rỗng đúng framing, regression bảo toàn multipart/idempotency (T23).
2. Giữ monolith + MySQL transactions, receipt và snapshot publication để ưu tiên correctness trước distributed jobs/cache (T09/T11/T14).
3. Profiler cho thấy list commits giảm 20/20/20 → 0/0/0 trong fixture; Hybrid Recall@5 vẫn bằng Content-only, nên không claim tăng chất lượng thực tế (T15/T18).
