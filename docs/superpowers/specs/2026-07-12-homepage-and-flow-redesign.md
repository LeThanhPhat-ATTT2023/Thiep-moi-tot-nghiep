# Thiết kế: Trang chủ mới + luồng trang chủ → thiệp chung → thiệp riêng

Ngày: 2026-07-12
Trạng thái: Đã được duyệt (người dùng chọn phương án qua AskUserQuestion)

## Mục tiêu

1. Thêm **trang chủ** mới tại `/` gồm cụm chữ "Happy **Graduation** Ngọc Trinh"
   (bố cục giống banner tham khảo: pill "Happy" → chữ script lớn "Graduation" →
   pill "Ngọc Trinh") và **ô tìm tên khách mời** (NameSearchBox hiện có).
2. Đổi luồng điều hướng thành: **trang chủ → thiệp chung → thiệp riêng**.
3. **Bỏ ô tìm tên khỏi thiệp chung** (trang chủ đã đảm nhận việc này).

## Quyết định thiết kế (đã được người dùng chốt)

- **Phong cách trang chủ:** theme hồng pastel hiện có (InviteFrame lượn sóng,
  token màu trong `tokens.css`), KHÔNG dùng nền cỏ xanh của banner tham khảo.
- **Cách chuyển trang:** cuối thiệp chung có nút "Xem thiệp mời của bạn" dẫn
  sang thiệp riêng; không tự động chuyển.

## Kiến trúc

### Routes (`src/App.tsx`)

| Route | Trang | Ghi chú |
|---|---|---|
| `/` | `HomePage` (mới) | Chữ Happy Graduation + ô tìm tên |
| `/thiep-chung/:guestId?` | `PublicInvite` | Param tùy chọn; có guestId thì hiện nút CTA |
| `/thiep/:guestId` | `GuestInvite` | Không đổi |

### Thành phần mới

- `src/pages/HomePage.tsx` + `HomePage.css`
  - Dùng `InviteFrame`, nền `.public-invite-page`-style (min-height 100dvh,
    nền `--color-background`, căn giữa).
  - Cụm heading: pill "Happy" (kiểu `.public-invite-photo-tag`), chữ
    "Graduation" font script lớn màu `--color-foreground`/`--color-primary`,
    pill "Ngọc Trinh".
  - Bên dưới divider: nhãn "Tìm tên của bạn trong danh sách khách mời" +
    `<NameSearchBox />`.
- `src/lib/constants.ts`: export `HOST_NAME = 'Ngọc Trinh'` — dùng chung cho
  HomePage và PublicInvite (trước đây hằng số nằm cục bộ trong PublicInvite).

### Thay đổi thành phần hiện có

- `src/styles/tokens.css`: thêm Google Font script (Great Vibes — có subset
  vietnamese) và token `--font-script`.
- `src/components/NameSearchBox.tsx`: chọn tên → `navigate('/thiep-chung/' + guest.id)`
  (trước đây `/thiep/' + guest.id`).
- `src/pages/PublicInvite.tsx`:
  - Bỏ section tìm tên (nhãn + NameSearchBox).
  - Đọc `guestId` từ `useParams`; nếu có → render nút `Link` "Xem thiệp mời
    của bạn" ở cuối thiệp, dẫn tới `/thiep/:guestId`.
  - Dùng `HOST_NAME` từ `src/lib/constants.ts`.

## Xử lý lỗi / biên

- `/thiep-chung` không có guestId: vẫn hiển thị thiệp chung, chỉ ẩn nút CTA
  (khách xem link chia sẻ chung không bị lỗi).
- guestId không tồn tại: thiệp chung không truy vấn guest nên vẫn hiển thị;
  thiệp riêng đã có sẵn màn "Không tìm thấy thiệp mời này".

## Kiểm thử

- `HomePage.test.tsx` (mới): render đủ "Happy", "Graduation", "Ngọc Trinh",
  nhãn tìm tên và ô nhập; không gọi Supabase settings (trang tĩnh).
- `NameSearchBox.test.tsx`: cập nhật kỳ vọng điều hướng sang `/thiep-chung/:id`.
- `PublicInvite.test.tsx`: (a) không còn ô tìm tên; (b) có nút "Xem thiệp mời
  của bạn" khi URL chứa guestId, dẫn đúng `/thiep/:id`; (c) không có nút khi
  thiếu guestId.

## Ngoài phạm vi

- Không đổi giao diện/logic GuestInvite, admin, hay schema Supabase.
- Không thêm nền cỏ xanh hay ảnh bitmap mới.
