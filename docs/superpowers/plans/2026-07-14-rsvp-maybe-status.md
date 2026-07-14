# Trạng thái RSVP thứ 3 "Để sau" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút RSVP thứ 3 "Để sau" (trạng thái `maybe`) bên cạnh "Xin phép vắng mặt", thu nhỏ cả 3 nút để nằm vừa 1 hàng, và cho admin dashboard thấy được số khách đã chọn "Để sau".

**Architecture:** Nới rộng union type `RsvpStatus` hiện có (`'pending' | 'attending' | 'not_attending'`) thêm `'maybe'`, dẫn xuyên suốt qua migration Supabase (check constraint + RPC `submit_rsvp`), hook `useGuestInvite`, component `RsvpButtons`, và admin dashboard — không tạo bảng/luồng dữ liệu mới, chỉ mở rộng giá trị hợp lệ của trường đã có.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + Testing Library, Supabase (Postgres + RPC).

**Spec:** `docs/superpowers/specs/2026-07-14-rsvp-maybe-status-design.md`

---

## Task 1: Migration Supabase cho trạng thái `maybe`

**Files:**
- Create: `supabase/migrations/20260714170000_add_maybe_rsvp_status.sql`

- [ ] **Step 1: Viết file migration**

```sql
-- Migration: Allow 'maybe' as a third RSVP status ("Để sau")
-- Date: 2026-07-14

alter table guests drop constraint guests_rsvp_status_check;
alter table guests add constraint guests_rsvp_status_check
  check (rsvp_status in ('pending', 'attending', 'not_attending', 'maybe'));

create or replace function submit_rsvp(guest_id uuid, status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if status not in ('attending', 'not_attending', 'maybe') then
    raise exception 'invalid status';
  end if;

  update guests
  set rsvp_status = status,
      rsvp_responded_at = now(),
      updated_at = now()
  where id = guest_id;
end;
$$;

grant execute on function submit_rsvp(uuid, text) to anon;
```

- [ ] **Step 2: Kiểm tra tên constraint hiện tại trước khi áp dụng**

Chạy lệnh sau qua Supabase SQL editor (hoặc `psql`) để xác nhận tên constraint
thật khớp với `guests_rsvp_status_check` (tên này migration giả định dựa theo
quy ước đặt tên mặc định của Postgres cho check inline trong `0001_init.sql`):

```sql
select conname from pg_constraint
where conrelid = 'guests'::regclass and contype = 'c';
```

Nếu tên khác, sửa lại `drop constraint <tên thật>` trong Step 1 trước khi chạy
tiếp.

- [ ] **Step 3: DỪNG LẠI — xin xác nhận trước khi áp dụng lên Supabase thật**

Đây là thao tác đổi schema trên database dùng chung (production). **Không tự
động chạy** — hỏi người dùng có muốn áp dụng ngay không, rồi mới chạy một
trong hai cách:
- Dán nội dung file vào Supabase Dashboard → SQL Editor → Run, hoặc
- `supabase db push` nếu project đã link CLI.

- [ ] **Step 4: Commit file migration**

```bash
git add supabase/migrations/20260714170000_add_maybe_rsvp_status.sql
git commit -m "feat(db): allow 'maybe' rsvp_status for the 'Để sau' button"
```

---

## Task 2: Mở rộng type `RsvpStatus` và các signature liên quan

**Files:**
- Modify: `src/types/database.ts:2`
- Modify: `src/hooks/useGuestInvite.ts:18,63`
- Modify: `src/components/EnvelopeModal.tsx:66`
- Modify: `src/components/GuestInviteCard.tsx:12`

- [ ] **Step 1: Mở rộng `RsvpStatus`**

Trong `src/types/database.ts:2`, đổi:

```typescript
export type RsvpStatus = 'pending' | 'attending' | 'not_attending'
```

thành:

```typescript
export type RsvpStatus = 'pending' | 'attending' | 'not_attending' | 'maybe'
```

- [ ] **Step 2: Mở rộng signature `respond` trong hook**

Trong `src/hooks/useGuestInvite.ts`, dòng 18 hiện tại:

```typescript
  respond: (status: 'attending' | 'not_attending') => void
```

đổi thành:

```typescript
  respond: (status: 'attending' | 'not_attending' | 'maybe') => void
```

Dòng 63 hiện tại:

```typescript
  async function respond(status: 'attending' | 'not_attending') {
```

đổi thành:

```typescript
  async function respond(status: 'attending' | 'not_attending' | 'maybe') {
```

- [ ] **Step 3: Mở rộng signature `handleRsvpRespond` trong EnvelopeModal**

Trong `src/components/EnvelopeModal.tsx:66`, đổi:

```typescript
  async function handleRsvpRespond(status: 'attending' | 'not_attending') {
```

thành:

```typescript
  async function handleRsvpRespond(status: 'attending' | 'not_attending' | 'maybe') {
```

- [ ] **Step 4: Mở rộng prop `onRespond` trong GuestInviteCard**

Trong `src/components/GuestInviteCard.tsx:12`, đổi:

```typescript
  onRespond: (status: 'attending' | 'not_attending') => void
```

thành:

```typescript
  onRespond: (status: 'attending' | 'not_attending' | 'maybe') => void
```

- [ ] **Step 5: Kiểm tra type-check qua**

Run: `npx tsc -b --noEmit`
Expected: không có lỗi nào. Việc nới union type theo hướng thêm giá trị mới
(A|B → A|B|C) luôn tương thích ngược với các hàm nhận tham số kiểu hẹp hơn
(`RsvpButtons.tsx` lúc này vẫn chỉ gọi `onRespond('attending' | 'not_attending')`,
vẫn hợp lệ khi được gán kiểu tham số rộng hơn) — nên bước này chỉ để xác nhận
không có chỗ nào lỡ khai báo type hẹp một cách tường minh gây xung đột.

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/hooks/useGuestInvite.ts src/components/EnvelopeModal.tsx src/components/GuestInviteCard.tsx
git commit -m "feat: widen RSVP status types to include 'maybe'"
```

---

## Task 3: Thêm nút "Để sau" vào `RsvpButtons`

**Files:**
- Modify: `src/components/RsvpButtons.tsx`
- Test: `src/components/RsvpButtons.test.tsx`

- [ ] **Step 1: Viết test thất bại cho nút mới**

Thêm vào `src/components/RsvpButtons.test.tsx`, sửa test đầu tiên và thêm 2
test case mới (giữ nguyên 2 test case cuối đã có):

```typescript
describe('RsvpButtons', () => {
  it('calls onRespond with the chosen status', async () => {
    const onRespond = vi.fn()
    const user = userEvent.setup()

    render(<RsvpButtons status="pending" submitting={false} onRespond={onRespond} />)

    await user.click(screen.getByRole('button', { name: 'Tôi sẽ tham dự' }))
    expect(onRespond).toHaveBeenCalledWith('attending')

    await user.click(screen.getByRole('button', { name: 'Xin phép vắng mặt' }))
    expect(onRespond).toHaveBeenCalledWith('not_attending')

    await user.click(screen.getByRole('button', { name: 'Để sau' }))
    expect(onRespond).toHaveBeenCalledWith('maybe')
  })

  it('disables all three buttons while submitting', () => {
    render(<RsvpButtons status="pending" submitting onRespond={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tôi sẽ tham dự' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xin phép vắng mặt' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Để sau' })).toBeDisabled()
  })

  it('marks the current status as active', () => {
    render(<RsvpButtons status="attending" submitting={false} onRespond={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tôi sẽ tham dự' })).toHaveClass(
      'rsvp-button-active'
    )
  })

  it('marks "Để sau" as active when status is maybe', () => {
    render(<RsvpButtons status="maybe" submitting={false} onRespond={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Để sau' })).toHaveClass('rsvp-button-active')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx vitest run src/components/RsvpButtons.test.tsx`
Expected: FAIL — không tìm thấy button tên "Để sau" (chưa tồn tại trong component).

- [ ] **Step 3: Thêm nút thứ 3 vào component**

Thay toàn bộ nội dung `src/components/RsvpButtons.tsx` bằng:

```typescript
// src/components/RsvpButtons.tsx
import type { RsvpStatus } from '../types/database'
import './RsvpButtons.css'

export interface RsvpButtonsProps {
  status: RsvpStatus
  submitting: boolean
  onRespond: (status: 'attending' | 'not_attending' | 'maybe') => void
}

export function RsvpButtons({ status, submitting, onRespond }: RsvpButtonsProps) {
  return (
    <div className="rsvp-buttons">
      <button
        type="button"
        className={`rsvp-button rsvp-button-attending${
          status === 'attending' ? ' rsvp-button-active' : ''
        }`}
        onClick={() => onRespond('attending')}
        disabled={submitting}
        aria-pressed={status === 'attending'}
      >
        Tôi sẽ tham dự
      </button>
      <button
        type="button"
        className={`rsvp-button rsvp-button-declined${
          status === 'not_attending' ? ' rsvp-button-active' : ''
        }`}
        onClick={() => onRespond('not_attending')}
        disabled={submitting}
        aria-pressed={status === 'not_attending'}
      >
        Xin phép vắng mặt
      </button>
      <button
        type="button"
        className={`rsvp-button rsvp-button-maybe${
          status === 'maybe' ? ' rsvp-button-active' : ''
        }`}
        onClick={() => onRespond('maybe')}
        disabled={submitting}
        aria-pressed={status === 'maybe'}
      >
        Để sau
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `npx vitest run src/components/RsvpButtons.test.tsx`
Expected: PASS (4 test case).

- [ ] **Step 5: Commit**

```bash
git add src/components/RsvpButtons.tsx src/components/RsvpButtons.test.tsx
git commit -m "feat: add 'Để sau' button as a third RSVP option"
```

---

## Task 4: Thu nhỏ 3 nút để vừa 1 hàng + màu cho nút "Để sau"

**Files:**
- Modify: `src/components/RsvpButtons.css`

- [ ] **Step 1: Cập nhật CSS**

Thay toàn bộ nội dung `src/components/RsvpButtons.css` bằng:

```css
/* src/components/RsvpButtons.css */
.rsvp-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
  margin-top: var(--space-4);
}

.rsvp-button {
  flex: 1 1 0;
  min-width: 0;
  padding: 0.5rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-foreground);
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease, opacity 200ms ease;
}

.rsvp-button-attending.rsvp-button-active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.rsvp-button-declined.rsvp-button-active {
  background: var(--color-muted);
  color: var(--color-foreground);
  border-color: var(--color-foreground);
}

.rsvp-button-maybe.rsvp-button-active {
  background: var(--color-accent);
  color: var(--color-on-primary);
  border-color: var(--color-accent);
}

.rsvp-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Xác nhận thủ công trên trình duyệt**

Run: `npm run dev`, mở trang `/thiep/:guestId` (hoặc popup bao thư trên trang
chung) với một guest id hợp lệ trong database dev/test, kiểm tra bằng mắt:
3 nút nằm vừa 1 hàng trên khung thiệp (~520px) lẫn màn hình điện thoại hẹp;
bấm "Để sau" nút đổi màu vàng đồng.

- [ ] **Step 3: Commit**

```bash
git add src/components/RsvpButtons.css
git commit -m "style: fit three RSVP buttons on one row"
```

---

## Task 5: Đếm và hiển thị trạng thái "Để sau" trên admin dashboard

**Files:**
- Modify: `src/pages/admin/AdminDashboard.tsx:86-120`
- Test: `src/pages/admin/AdminDashboard.test.tsx`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `src/pages/admin/AdminDashboard.test.tsx`, sửa mảng `guests` (thêm 1
guest có `rsvp_status: 'maybe'`) và thêm assertion mới vào test đầu tiên:

```typescript
const guests: Guest[] = [
  {
    id: '1',
    full_name: 'Nguyễn Văn A',
    salutation: 'Anh',
    greeting_message: null,
    message_by_guest: null,
    rsvp_status: 'attending',
    rsvp_responded_at: '2026-07-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    full_name: 'Trần Thị B',
    salutation: 'Chị',
    greeting_message: null,
    message_by_guest: null,
    rsvp_status: 'pending',
    rsvp_responded_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    full_name: 'Lê Văn C',
    salutation: 'Anh',
    greeting_message: null,
    message_by_guest: null,
    rsvp_status: 'maybe',
    rsvp_responded_at: '2026-07-02T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]
```

Sửa test `'loads guests and shows the list with summary counts'` thành:

```typescript
  it('loads guests and shows the list with summary counts', async () => {
    mockGuestsOnly()

    renderDashboard()

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.getByText('Lê Văn C')).toBeInTheDocument()
    expect(screen.getByText('Tổng số: 3')).toBeInTheDocument()
    expect(screen.getByText('Đã xác nhận: 1')).toBeInTheDocument()
    expect(screen.getByText('Để sau: 1')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx vitest run src/pages/admin/AdminDashboard.test.tsx`
Expected: FAIL trên assertion `screen.getByText('Để sau: 1')` (chip chưa tồn
tại). `Tổng số: 3` và `Đã xác nhận: 1` đã pass ngay vì `counts.total` chỉ đếm
`guests.length` và không phụ thuộc thay đổi ở Step 3.

- [ ] **Step 3: Thêm đếm và chip vào AdminDashboard**

Trong `src/pages/admin/AdminDashboard.tsx`, dòng 86-91 hiện tại:

```typescript
  const counts = {
    total: guests.length,
    attending: guests.filter((g) => g.rsvp_status === 'attending').length,
    notAttending: guests.filter((g) => g.rsvp_status === 'not_attending').length,
    pending: guests.filter((g) => g.rsvp_status === 'pending').length,
  }
```

đổi thành:

```typescript
  const counts = {
    total: guests.length,
    attending: guests.filter((g) => g.rsvp_status === 'attending').length,
    notAttending: guests.filter((g) => g.rsvp_status === 'not_attending').length,
    pending: guests.filter((g) => g.rsvp_status === 'pending').length,
    maybe: guests.filter((g) => g.rsvp_status === 'maybe').length,
  }
```

Dòng 115-120 hiện tại:

```typescript
      <div className="admin-dashboard-summary">
        <span className="admin-summary-chip">Tổng số: {counts.total}</span>{' '}
        <span className="admin-summary-chip">Đã xác nhận: {counts.attending}</span>{' '}
        <span className="admin-summary-chip">Từ chối: {counts.notAttending}</span>{' '}
        <span className="admin-summary-chip">Chưa phản hồi: {counts.pending}</span>
      </div>
```

đổi thành:

```typescript
      <div className="admin-dashboard-summary">
        <span className="admin-summary-chip">Tổng số: {counts.total}</span>{' '}
        <span className="admin-summary-chip">Đã xác nhận: {counts.attending}</span>{' '}
        <span className="admin-summary-chip">Từ chối: {counts.notAttending}</span>{' '}
        <span className="admin-summary-chip">Chưa phản hồi: {counts.pending}</span>{' '}
        <span className="admin-summary-chip">Để sau: {counts.maybe}</span>
      </div>
```

Badge trạng thái ở dòng 165 (`admin-rsvp-badge admin-rsvp-${g.rsvp_status}`)
không cần sửa code — tự hoạt động với giá trị `maybe` vì dùng template string
theo `rsvp_status` thật. Chỉ cần thêm màu ở Task 6.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `npx vitest run src/pages/admin/AdminDashboard.test.tsx`
Expected: PASS (toàn bộ test trong file, bao gồm các test khác không đổi).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminDashboard.test.tsx
git commit -m "feat(admin): show count for the 'maybe' RSVP status"
```

---

## Task 6: Màu badge cho trạng thái "maybe" trên admin dashboard

**Files:**
- Modify: `src/pages/admin/AdminDashboard.css:97-100`

- [ ] **Step 1: Thêm rule màu**

Trong `src/pages/admin/AdminDashboard.css`, ngay sau rule `.admin-rsvp-pending`
(dòng 97-100), thêm:

```css
.admin-rsvp-maybe {
  background: #fef3c7;
  color: #92400e;
}
```

- [ ] **Step 2: Xác nhận thủ công**

Run: `npm run dev`, mở trang admin dashboard, kiểm tra badge của guest có
trạng thái `maybe` hiển thị nền vàng nhạt `#fef3c7`, chữ nâu đậm `#92400e`
(khác biệt rõ với xanh lá của "attending" và đỏ của "not_attending").

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminDashboard.css
git commit -m "style(admin): color badge for the 'maybe' RSVP status"
```

---

## Task 7: Kiểm tra toàn bộ trước khi kết thúc

**Files:** không tạo/sửa file mới — chỉ chạy kiểm tra tổng.

- [ ] **Step 1: Chạy toàn bộ test suite**

Run: `npm run test`
Expected: PASS toàn bộ (không chỉ các file đã sửa — đảm bảo không phá test
khác do union type mở rộng).

- [ ] **Step 2: Chạy typecheck + build**

Run: `npm run build`
Expected: build thành công, không có lỗi TypeScript.

- [ ] **Step 3: Xác nhận migration đã áp dụng (hoặc chưa) được ghi chú rõ**

Nếu Task 1 Step 3 (áp dụng migration lên Supabase thật) chưa được người dùng
xác nhận thực hiện, báo lại rõ ràng cho người dùng: code đã sẵn sàng nhưng
**RPC `submit_rsvp` trên Supabase thật vẫn sẽ từ chối `status: 'maybe'` cho
đến khi migration được áp dụng** — nút "Để sau" trên môi trường thật sẽ báo
lỗi "Gửi phản hồi thất bại" cho đến lúc đó.
