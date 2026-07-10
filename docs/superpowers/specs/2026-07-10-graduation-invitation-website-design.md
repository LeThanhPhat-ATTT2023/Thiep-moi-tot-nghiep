# Thiết kế: Website Thiệp mời Tốt nghiệp

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt, sẵn sàng lập kế hoạch triển khai

## Bối cảnh & mục tiêu

Xây dựng một website thiệp mời tốt nghiệp gồm:
- 1 trang mời chung (public) hiển thị thông tin sự kiện và cho khách nhập tên để vào thiệp riêng.
- 1 trang thiệp mời riêng cho từng khách, có nội dung cá nhân hoá và xác nhận tham dự (RSVP).
- 1 trang admin để quản lý danh sách khách, nội dung thiệp riêng, thông tin sự kiện chung, và ảnh.

Đây là dự án cá nhân, quy mô nhỏ (một sự kiện, danh sách khách hữu hạn). Không cần đăng nhập cho khách — bảo mật nội dung riêng từng khách chỉ ở mức "biết tên/ID mới xem được", tương tự các thiệp mời online phổ biến khác. Đây là đánh đổi đã được xác nhận, không phải sơ suất.

## Tech stack

- **Frontend:** React + Vite, React Router.
- **Backend:** Supabase (Postgres + Auth + Row Level Security), gọi trực tiếp từ frontend qua `supabase-js`. Không có backend server riêng.
- **Ảnh:** Cloudinary, upload thẳng từ trình duyệt qua unsigned upload preset.
- **Deploy:** Vercel (static build từ Vite).

### Vì sao không cần backend riêng

Supabase cung cấp đủ Postgres + Auth + RLS để frontend gọi thẳng an toàn. Thêm một lớp API riêng (Vercel Functions) sẽ giấu được Supabase key kỹ hơn nhưng không giải quyết được vấn đề cốt lõi (thiệp không có đăng nhập cho khách nên nội dung vốn không thể giấu tuyệt đối), trong khi tăng đáng kể công sức build/bảo trì cho một dự án cá nhân. Quyết định: dùng thẳng Supabase từ frontend (Hướng A), có RLS chặt cho phần ghi dữ liệu.

## Cấu trúc route

| Route | Trang | Ghi chú |
|---|---|---|
| `/` | PublicInvite | Thông tin sự kiện, đếm ngược, bản đồ, ảnh bìa/album, ô nhập tên |
| `/thiep/:guestId` | GuestInvite | Thiệp riêng, dùng khung viền hoa văn |
| `/admin/login` | AdminLogin | Đăng nhập Supabase Auth |
| `/admin` | AdminDashboard | Danh sách khách + trạng thái RSVP |
| `/admin/khach/:id` (hoặc `new`) | AdminGuestForm | Thêm/sửa khách mời |
| `/admin/su-kien` | AdminEventSettings | Sửa thông tin sự kiện, ảnh bìa, album ảnh |

## Cấu trúc thư mục

```
src/
  pages/        # PublicInvite, GuestInvite, AdminLogin, AdminDashboard, AdminGuestForm, AdminEventSettings
  components/   # CountdownTimer, MapEmbed, NameSearchBox, InviteFrame, RsvpButtons, GalleryGrid
  lib/          # supabaseClient.ts, cloudinary.ts
  hooks/        # useGuestSearch, useAuth
```

## Data model (Supabase / Postgres)

### Bảng `guests`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | tự sinh |
| full_name | text | tên khách, dùng để tìm kiếm |
| salutation | text | "Anh", "Chị", "Bạn", "Thầy/Cô"... |
| greeting_message | text (null) | lời chào/nhắn riêng, có thể để trống |
| rsvp_status | text | `pending` / `attending` / `not_attending`, mặc định `pending` |
| rsvp_responded_at | timestamptz (null) | thời điểm khách xác nhận |
| created_at / updated_at | timestamptz | |

### Bảng `event_settings` (đúng 1 dòng)

| Cột | Kiểu |
|---|---|
| event_name | text |
| event_datetime | timestamptz |
| venue_name | text |
| venue_address | text |
| map_embed_url | text |
| cover_image_url | text (null) |

### Bảng `gallery_photos`

| Cột | Kiểu |
|---|---|
| id | uuid (PK) |
| image_url | text |
| caption | text (null) |
| sort_order | int |
| created_at | timestamptz |

### Row Level Security

- `SELECT` trên `guests`, `event_settings`, `gallery_photos`: công khai (anon) — cần để trang chung tìm tên, hiển thị thiệp riêng, hiển thị album mà không cần đăng nhập.
- `INSERT` / `UPDATE` / `DELETE` trên cả 3 bảng: chỉ tài khoản đã đăng nhập (`auth.role() = 'authenticated'`).
- **Ngoại lệ RSVP:** không cấp quyền `UPDATE` trực tiếp trên `guests` cho anon. Thay vào đó dùng RPC function `submit_rsvp(guest_id uuid, status text)` (SECURITY DEFINER) chỉ được phép ghi đúng 2 cột `rsvp_status` và `rsvp_responded_at`, tránh khách chỉnh sửa các trường khác của chính họ hoặc của người khác.

## Luồng trang mời chung (`/`)

1. Load `event_settings` → hiển thị tên lễ, ngày giờ, địa điểm, ảnh bìa.
2. `CountdownTimer`: tính từ `event_datetime` đến hiện tại (ngày/giờ/phút/giây). Nếu đã qua → hiển thị "Sự kiện đã diễn ra".
3. `MapEmbed`: iframe Google Maps từ `map_embed_url`.
4. `GalleryGrid`: lưới ảnh từ `gallery_photos`, sắp theo `sort_order`.
5. `NameSearchBox`: load toàn bộ `guests` (chỉ `id`, `full_name`, `salutation`) một lần, lọc tức thời bằng fuzzy search (Fuse.js) khi khách gõ. Hiện tối đa ~5 gợi ý. Không có gợi ý khớp → thông báo "Không tìm thấy tên, vui lòng kiểm tra lại chính tả", không chặn thao tác. Bấm đúng tên → điều hướng `/thiep/:guestId`.

## Luồng trang thiệp riêng (`/thiep/:guestId`)

1. Fetch guest theo `id` (đầy đủ cột). Không tồn tại → trang báo lỗi nhẹ, nút quay về trang chủ.
2. Hiển thị trong `InviteFrame`: lời chào cá nhân hoá ("Kính mời {salutation} {full_name}"), `greeting_message` nếu có, thông tin sự kiện (từ `event_settings`).
3. `RsvpButtons`: Tham dự / Không tham dự → gọi RPC `submit_rsvp`. Cập nhật UI ngay (optimistic), disable nút khi đang gửi, cho phép đổi ý sau đó (gọi lại RPC ghi đè).

### `InviteFrame` — khung viền hoa văn (code lại bằng SVG/CSS, không dùng ảnh raster gốc)

Tái hiện theo phong cách ảnh mẫu, không cần khớp pixel-perfect:
- Nền sọc dọc xen kẽ hồng nhạt / vàng kim-kem, dùng `repeating-linear-gradient`.
- Viền lượn sóng dạng scallop vẽ bằng `<path>` SVG, nét hồng đậm (~`#c0447a`), nền trong viền màu kem (~`#faf6e8`).
- Vài icon sparkle 4 cánh màu vàng cam, đặt rải rác góc trên-trái và dưới-phải.
- Nội dung chữ/nút đặt bằng HTML/CSS chồng lên vùng kem ở giữa, có padding an toàn tránh đè lên viền sóng.

## Trang Admin

- **`/admin/login`**: form email/mật khẩu qua `supabase.auth.signInWithPassword`. Mọi route `/admin/*` bọc trong `RequireAuth`, chưa đăng nhập → redirect `/admin/login`.
- **`/admin`**: bảng khách mời (tên, danh xưng, trạng thái RSVP dạng badge màu, thời điểm phản hồi), ô tìm/lọc, thẻ tổng quan (tổng số / đã xác nhận / từ chối / chưa phản hồi), nút thêm khách, nút sửa/xoá từng dòng.
- **`/admin/khach/:id`**: form tên, danh xưng (dropdown + tự nhập), lời chào riêng (textarea). Lưu = insert hoặc update. Nút xoá (có xác nhận) khi sửa khách đã tồn tại.
- **`/admin/su-kien`**: form tên lễ, ngày giờ, địa điểm, link Google Maps embed, upload ảnh bìa (Cloudinary unsigned preset → lưu URL vào `cover_image_url`), quản lý album ảnh (thêm/xoá/sắp xếp `gallery_photos`).

## Xử lý lỗi & trường hợp biên

- `guestId` không tồn tại → trang báo lỗi nhẹ, nút quay về trang chủ.
- Lỗi mạng khi gọi Supabase → thông báo lỗi + nút thử lại, không crash toàn app.
- Upload Cloudinary lỗi → báo lỗi, không chặn lưu các trường còn lại của form admin.
- Route lạ → trang 404 chung.

## Kế hoạch kiểm thử

- Unit test (Vitest) cho logic thuần: tính đếm ngược, fuzzy-match tên.
- Kiểm thử thủ công theo checklist trước khi go-live: tìm tên → vào thiệp riêng → RSVP; đăng nhập admin → thêm/sửa/xoá khách → sửa thông tin sự kiện → upload ảnh bìa/album. Không đầu tư e2e tự động vì quy mô dự án cá nhân.

## Ngoài phạm vi (không làm trong bản này)

- Không có link riêng theo từng khách (chỉ dùng luồng nhập tên + gợi ý).
- Không có số lượng người đi cùng (plus-one) trong RSVP.
- Không dùng ảnh raster gốc của khung viền — khung được code lại bằng SVG/CSS.
