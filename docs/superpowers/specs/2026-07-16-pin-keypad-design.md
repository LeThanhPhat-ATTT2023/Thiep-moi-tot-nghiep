# Thiết kế: Bàn phím số cho cổng mật khẩu /chung-vui

Ngày: 2026-07-16
Trạng thái: Đã được duyệt (người dùng chốt qua AskUserQuestion)

## Mục tiêu

Trang cổng mật khẩu `/chung-vui` (component `SharedInvite.tsx`) hiện đang dùng ô
`<input type="text">` + nút "Mở thiệp" để nhập mật khẩu `2307`. Thay bằng một
bàn phím số kiểu mở khoá điện thoại — 4 chấm hiển thị số đã nhập + lưới nút số
để bấm — cho trải nghiệm đẹp và tự nhiên hơn, đặc biệt trên điện thoại (nơi
link `/chung-vui` chủ yếu được chia sẻ qua mạng xã hội).

## Quyết định thiết kế (đã được người dùng chốt)

1. **Thay thế hoàn toàn ô nhập chữ**, không giữ song song. Giao diện mới chỉ
   còn: hàng 4 chấm tròn (● = đã nhập, ◯ = chưa nhập) + lưới bàn phím số bên
   dưới. Không còn `<input>`, không còn nút "Mở thiệp".
2. **Tự động kiểm tra khi đủ 4 số** — không cần bấm thêm nút xác nhận nào.
   Đúng mật khẩu → mở khoá ngay. Sai → 4 chấm rung + chuyển đỏ trong chốc lát,
   đồng thời vẫn hiện dòng chữ lỗi "Sai mật khẩu, vui lòng thử lại." (giữ cho
   accessibility / screen reader, không chỉ dựa vào hiệu ứng rung), sau đó tự
   xoá hết 4 chấm sau **600ms** để nhập lại.
3. **Hỗ trợ bàn phím vật lý** trên máy tính: gõ phím số 0-9 hoặc Backspace có
   tác dụng y hệt bấm nút tương ứng trên lưới. Bỏ qua khi có phím bổ trợ
   (Ctrl/Alt/Meta) đang giữ, để không đụng tới các phím tắt trình duyệt.
4. **Kiến trúc:** tách một component thuần `PinKeypad` (chỉ lo hiển thị +
   tương tác bàn phím), còn `SharedInvite.tsx` giữ toàn bộ logic domain (mật
   khẩu đúng là gì, hẹn giờ xoá khi sai). `PinKeypad` không biết gì về mật
   khẩu `2307` hay khái niệm "gate" — chỉ nhận/trả về chuỗi số đã nhập.

## Kiến trúc

### `PinKeypad` (component mới, thuần hiển thị)

```
src/components/PinKeypad.tsx
src/components/PinKeypad.css
src/components/PinKeypad.test.tsx
```

Props:

```ts
export interface PinKeypadProps {
  value: string        // chuỗi số đã nhập, độ dài 0..maxLength
  maxLength: number     // 4
  onChange: (value: string) => void
  shake?: boolean       // true = đang ở trạng thái báo lỗi (rung + đỏ)
}
```

Hành vi:

- Hàng chấm: render `maxLength` chấm, chấm thứ `i < value.length` là "đã
  nhập" (đặc), còn lại là viền rỗng. Khi `shake=true`, cả hàng chấm chạy
  animation rung (dịch ngang qua lại, CSS keyframes) + đổi màu đỏ tạm thời.
- Lưới nút: 1-2-3 / 4-5-6 / 7-8-9 / (trống) - 0 - ⌫, mỗi nút số
  `onClick` gọi `onChange(value + digit)` nếu `value.length < maxLength`; nút
  ⌫ gọi `onChange(value.slice(0, -1))` (không làm gì nếu `value` rỗng).
- `useEffect` gắn `keydown` listener lên `document` khi component mounted, gỡ
  khi unmount: phím `'0'`-`'9'` → tương đương bấm nút số đó; phím
  `'Backspace'` → tương đương bấm ⌫. Bỏ qua nếu `e.ctrlKey || e.metaKey ||
  e.altKey`.
- Không tự giới hạn hay so khớp mật khẩu — hoàn toàn không biết `2307` là gì.

### `SharedInvite.tsx` (sửa)

Thay khối `<form>` hiện tại (input + button + `.shared-invite-gate-error`)
bằng:

```tsx
const [pin, setPin] = useState('')
const [pinError, setPinError] = useState(false)

function handlePinChange(next: string) {
  setPin(next)
  setPinError(false)
  if (next.length === 4) {
    if (next === SHARED_INVITE_PASSWORD) {
      setGateState('unlocked')
    } else {
      setPinError(true)
      setTimeout(() => {
        setPin('')
        setPinError(false)
      }, 600)
    }
  }
}
```

JSX gate giữ nguyên hero + message zone + `MusicPlayerWidget` như hiện tại,
chỉ đổi phần `home-search-section`:

```tsx
<div className="home-search-section">
  <p className="home-search-label">Vui lòng nhập mật khẩu❤️</p>
  <PinKeypad value={pin} maxLength={4} onChange={handlePinChange} shake={pinError} />
  {pinError && (
    <p className="shared-invite-gate-error" role="alert">
      Sai mật khẩu, vui lòng thử lại.
    </p>
  )}
</div>
```

`SHARED_INVITE_PASSWORD = '2307'` giữ nguyên như code hiện tại (không đổi
định dạng — vẫn là chuỗi số thuần, không cần `.trim()` nữa vì `PinKeypad` chỉ
sinh ra ký tự số).

### CSS

- `src/components/PinKeypad.css` (mới): style hàng chấm (kích thước, màu đặc
  `--color-primary` khi đã nhập, viền `--color-border` khi rỗng), style lưới
  nút số (nút tròn/vuông bo góc, `--color-muted` nền, số lớn dễ bấm — tối
  thiểu 44px theo chuẩn kích thước chạm), animation `@keyframes pin-shake`
  (dịch ngang qua lại, ~400ms) áp dụng cho hàng chấm khi `shake=true`, màu đỏ
  tạm thời dùng `--color-destructive`.
- `src/pages/SharedInvite.css`: xoá `.shared-invite-gate-box`,
  `.shared-invite-gate-input`, `.shared-invite-gate-button` (không còn dùng);
  giữ nguyên `.shared-invite-gate-error`.

## Xử lý lỗi / biên

- Bấm số khi đã đủ 4 số: không làm gì (không tràn, không tự xoá số cũ).
- Bấm ⌫ khi chuỗi rỗng: không làm gì.
- Trong lúc `shake=true` (đang hiện lỗi), người dùng bấm số mới: cho phép
  bình thường — `handlePinChange` sẽ `setPinError(false)` ngay khi có thay
  đổi, tự nhiên "cắt" hiệu ứng rung và dòng chữ lỗi hiện tại (không cần chặn
  input trong lúc rung).
- Phím tắt trình duyệt (Ctrl+số, Cmd+số, v.v.) không bị `PinKeypad` nuốt mất.

## Kiểm thử

- `PinKeypad.test.tsx` (mới): render đúng số chấm đặc theo `value`; bấm nút
  số gọi `onChange` với chuỗi nối thêm; bấm ⌫ gọi `onChange` với chuỗi bớt ký
  tự cuối; không cho vượt quá `maxLength`; gõ phím số thật trên `document`
  cũng gọi `onChange` tương ứng; gõ `Backspace` thật cũng gọi `onChange` xoá
  ký tự cuối; giữ Ctrl/Alt/Meta thì phím số không có tác dụng.
- `SharedInvite.test.tsx` (sửa lại phần cổng mật khẩu): thay các test dùng
  `getByPlaceholderText('Nhập mật khẩu...')` + `user.type` + bấm nút "Mở
  thiệp" bằng bấm lần lượt 4 nút số qua `PinKeypad` (hoặc gõ phím thật qua
  `user.keyboard`); test sai mật khẩu → thấy dòng lỗi, dùng
  `vi.advanceTimersByTimeAsync(600)` rồi xác nhận đã xoá về trạng thái rỗng và
  nhập lại đúng thì vẫn mở khoá được; các test còn lại (mở `PublicEnvelopeModal`,
  reset khi mount lại) giữ nguyên ý nghĩa, chỉ đổi cách nhập mật khẩu đúng ở
  bước đầu mỗi test.

## Ngoài phạm vi

- Không đổi mật khẩu `2307` hay cách nó được nhúng trong code (vẫn là hằng số
  client-side, không phải cơ chế bảo mật thật — như đã chốt ở spec trước).
  Vẫn không thêm cơ chế bảo mật server-side nào.
  Không thêm chữ cái trang trí kiểu bàn phím điện thoại (ABC/DEF...) dưới các
  số — đây là bàn phím PIN 4 số, không phải bàn phím quay số điện thoại.
- Không đổi bất kỳ phần nào khác của `SharedInvite.tsx` (hero, message zone,
  màn hình sau khi mở khoá, `PublicEnvelopeModal`) hay các trang khác.
- `PinKeypad` không được thiết kế để tái sử dụng cho luồng khác trong phạm vi
  này — nếu sau này cần (vd. màn hình admin), sẽ đánh giá lại lúc đó.
