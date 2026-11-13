# Quality gates

Cài sạch bằng `npm ci --no-audit --no-fund` trong `UI` và `Server`.
Không cần secret production cho build; có thể đặt `API_INTERNAL_URL=http://127.0.0.1:5000` trong process build.

- UI: `npm run check` chạy tuần tự typecheck → lint → unit/component tests → production build.
- Backend: `npm test` trong `Server`; MySQL integration dùng database disposable và hướng dẫn DATABASE_SETUP_VI.md.
- Browser: `npm run test:accounts:browser`, `npm run test:player:browser` trong UI. Cần Playwright và browser đã cài; xem báo cáo T13 về biến môi trường fixture.

Không dùng ignoreBuildErrors, type-ignore hàng loạt hoặc disable lint để vượt gate.
API DTO được định kiểu; dữ liệu không rõ kiểu và lỗi dùng unknown cùng narrowing.
Giữ modular monolith; Python nghiên cứu nằm trong experiments, không thuộc serving web.

## Cảnh báo còn lại (theo dõi T18)

Lint hiện có 0 errors và 24 warnings, tất cả là `@next/next/no-img-element`.
Rule vẫn bật. Chưa tuyên bố ảnh được tối ưu hoặc performance đạt yêu cầu.
Thay img bằng optimizer cần kiểm tra URL động, nguồn riêng cần cookie và layout;
không mặc định proxy ảnh riêng qua server optimizer. T18 phải đo và chọn cách phục vụ phù hợp.

| Vị trí | Rule | Lý do / việc tiếp theo |
| --- | --- | --- |
| `UI/app/(Pages)/(main)/Profile/page.tsx:64` | `@next/next/no-img-element` | T18: xác minh nguồn ảnh/avatar và cookie cho media riêng trước khi chọn loader/optimizer. |
| `UI/app/(Pages)/administrator/PendingSongs/SongDetailModal.tsx:52` | `@next/next/no-img-element` | T18: xác minh nguồn ảnh/avatar và cookie cho media riêng trước khi chọn loader/optimizer. |
| `UI/app/(Pages)/administrator/PendingSongs/page.tsx:97` | `@next/next/no-img-element` | T18: xác minh nguồn ảnh/avatar và cookie cho media riêng trước khi chọn loader/optimizer. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:15` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:29` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:52` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:53` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:70` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:71` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:72` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/PlaylistCover.tsx:90` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/FeaturedPlaylists/TrackSection.tsx:80` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/components/layout/Footer/UserPage/Footer.tsx:11` | `@next/next/no-img-element` | T18: tối ưu asset/logo cùng kích thước và đo LCP; giữ renderer hiện tại trong T13. |
| `UI/app/components/layout/Footer/UserPage/Footer.tsx:16` | `@next/next/no-img-element` | T18: tối ưu asset/logo cùng kích thước và đo LCP; giữ renderer hiện tại trong T13. |
| `UI/app/components/layout/Header/AdminPage/Header.tsx:33` | `@next/next/no-img-element` | T18: tối ưu asset/logo cùng kích thước và đo LCP; giữ renderer hiện tại trong T13. |
| `UI/app/components/layout/Header/UserPage/Header.tsx:64` | `@next/next/no-img-element` | T18: xác minh nguồn ảnh/avatar và cookie cho media riêng trước khi chọn loader/optimizer. |
| `UI/app/components/ui/SearchBar/SearchResult.tsx:39` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/artist/components/ArtistSection.tsx:21` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/player/components/Player.tsx:172` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/playlist/components/DetailView.tsx:138` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/recommendation/components/RecommendSongCard.tsx:114` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/recommendation/components/RecommendSongCard.tsx:177` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/song/components/DetailSong/DetailSong.tsx:78` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |
| `UI/app/features/song/components/LibraryTable/LibraryTable.tsx:36` | `@next/next/no-img-element` | T18: cover động nhiều nguồn; cần thống nhất remote policy/loader, kích thước và đo hiệu năng. |

Kết quả và phạm vi kiểm chứng: [T13](verification/T13.md).
