# Thiết kế: Trạng thái RSVP thứ 3 "Để sau"

Ngày: 2026-07-14
Trạng thái: Đã được duyệt (người dùng chọn hướng A qua AskUserQuestion)

## Mục tiêu

Thêm 1 nút thứ 3 vào hàng nút RSVP trên thiệp riêng, nằm cạnh nút "Xin phép
vắng mặt". Nút mới nhãn **"Để sau"**, đại diện cho một trạng thái RSVP thật sự
(khách chưa chắc chắn, muốn trả lời sau) — không phải chỉ là nút trang trí.
Cả 3 nút phải thu nhỏ lại để nằm vừa trên 1 hàng.

## Quyết định thiết kế (đã được người dùng chốt)

1. **Hướng A:** trạng thái `maybe` được lưu thật sự xuyên suốt hệ thống (DB +
   RPC + type + UI + admin dashboard), không phải chỉ hiệu ứng giao diện.
2. **Nhãn nút:** "Để sau" (không dùng "Xác nhận" như đề xuất ban đầu, vì nhãn
   đó không khớp nghĩa với "chưa chắc chắn / trả lời sau").
3. **Vị trí:** nút "Để sau" nằm sau nút "Xin phép vắng mặt", thứ tự cuối cùng:
   [Tôi sẽ tham dự] [Xin phép vắng mặt] [Để sau].
4. **Màu sắc:** dùng token `--color-accent` (#a16207, vàng đồng có sẵn trong
   `tokens.css`, đồng bộ với màu sparkle trên thiệp) để phân biệt với hồng
   (tham dự) và xám (từ chối).

## Kiến trúc

### Tầng dữ liệu (Supabase)

- **Migration mới** `supabase/migrations/20260714170000_add_maybe_rsvp_status.sql`:
  - Nới ràng buộc check trên cột `guests.rsvp_status` để nhận thêm `'maybe'`
    (hiện tại: `check (rsvp_status in ('pending', 'attending', 'not_attending'))`).
  - Cập nhật hàm `submit_rsvp(guest_id, status)` để chấp nhận `'maybe'` ngoài
    `'attending'`/`'not_attending'`.
  - **Lưu ý khi thực thi:** migration này cần được áp dụng lên Supabase thật
    (qua `supabase db push` hoặc chạy tay trên dashboard) — đây là thao tác
    trên hệ thống dùng chung, sẽ xin xác nhận riêng trước khi chạy, không tự
    động áp dụng.

### Types & hook

- `src/types/database.ts`: `RsvpStatus` → thêm `'maybe'`.
- `src/hooks/useGuestInvite.ts`: `respond()` và `UseGuestInviteResult.respond`
  nhận thêm `'maybe'` trong union type tham số. Logic optimistic
  update/rollback giữ nguyên (dùng chung cho cả 3 trạng thái).
- `src/components/EnvelopeModal.tsx`: `handleRsvpRespond` nới union type tham
  số để nhận `'maybe'`. Luồng sau khi phản hồi giữ nguyên (chuyển sang
  `MessageModal` rồi màn "complete") — dùng chung cho cả 3 lựa chọn, không
  tạo luồng riêng cho "Để sau".
- `src/components/GuestInviteCard.tsx`: prop `onRespond` nới union type tương
  ứng.

### UI

- `src/components/RsvpButtons.tsx`: thêm nút thứ 3
  ```
  <button className="rsvp-button rsvp-button-maybe ..." onClick={() => onRespond('maybe')}>
    Để sau
  </button>
  ```
  đặt sau nút "Xin phép vắng mặt", cùng pattern `rsvp-button-active` khi
  `status === 'maybe'`.
- `src/components/RsvpButtons.css`:
  - Giảm `padding` (còn ~`0.5rem 0.7rem`) và `font-size` (còn ~`0.78rem`) trên
    `.rsvp-button` để 3 nút vừa 1 hàng.
  - `.rsvp-button` thêm `flex: 1` để 3 nút chia đều chiều rộng, `min-width: 0`
    để chữ không tràn.
  - Thêm `.rsvp-button-maybe.rsvp-button-active` dùng `--color-accent` làm nền.
  - Giữ `flex-wrap: wrap` trên `.rsvp-buttons` làm lưới an toàn cho màn hình
    cực hẹp (< 320px), dù mục tiêu chính là 1 hàng 3 nút.

### Admin dashboard

- `src/pages/admin/AdminDashboard.tsx`:
  - Thêm `counts.maybe` (đếm `rsvp_status === 'maybe'`).
  - Thêm 1 chip tổng kết: `Để sau: {counts.maybe}`.
  - Badge trạng thái (`admin-rsvp-badge admin-rsvp-${status}`) tự động hoạt
    động với giá trị `maybe` nhờ dùng chung pattern hiện có, chỉ cần thêm màu.
- `src/pages/admin/AdminDashboard.css`: thêm `.admin-rsvp-maybe` (tông vàng
  đồng bộ, ví dụ nền `#fef3c7` chữ `#92400e`, theo phong cách các trạng thái
  khác đang dùng cặp màu nhạt/đậm).

## Xử lý lỗi / biên

- Tên constraint check trong migration giả định là
  `guests_rsvp_status_check` (tên mặc định Postgres đặt cho check inline
  không có tên tường minh trong `0001_init.sql`) — cần xác minh tên thật trên
  Supabase trước khi chạy `drop constraint`, phòng trường hợp tên khác.
- RSVP lỗi khi gửi `'maybe'`: dùng chung cơ chế optimistic rollback +
  `rsvpError` đã có, không cần logic riêng.
- Nút "Để sau" bị disable khi `submitting`, giống 2 nút còn lại.

## Kiểm thử

- `RsvpButtons.test.tsx`: thêm case bấm nút "Để sau" → gọi
  `onRespond('maybe')`; case `status === 'maybe'` → nút "Để sau" có class
  active.
- `GuestInvite.test.tsx` / `PublicInvite.test.tsx` / `EnvelopeModal.test.tsx`:
  rà lại các test đang liệt kê rõ 2 trạng thái để đảm bảo không bị vỡ khi
  union type mở rộng (không cần thêm luồng test mới trừ khi test hiện có bind
  cứng vào đúng 2 lựa chọn).
- `AdminDashboard.test.tsx`: thêm case guest có `rsvp_status: 'maybe'` →
  hiển thị đúng badge + đúng số đếm trong chip tổng kết.

## Ngoài phạm vi

- Không đổi luồng `MessageModal` / màn "complete" sau khi phản hồi (dùng
  chung cho cả 3 lựa chọn).
- Không thêm bộ lọc theo trạng thái trên admin dashboard (chỉ thêm đếm +
  màu badge).
- Không đổi `AdminGuestForm` (không đụng đến `rsvp_status`).
- Không tự động chạy migration lên Supabase thật — sẽ xin xác nhận riêng ở
  bước thực thi.
