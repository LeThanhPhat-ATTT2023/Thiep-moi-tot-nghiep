# Admin & Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the React + Vite project, wire it to Supabase and Cloudinary, and build a fully working Admin section (login, guest CRUD, event settings + image uploads) so it can be reviewed before the public-facing pages are built.

**Architecture:** Single Vite + React + TypeScript SPA. `supabase-js` is called directly from the frontend (no custom backend); Row Level Security in Postgres restricts writes to authenticated users. Cloudinary receives uploads directly from the browser via an unsigned upload preset. React Router drives navigation; a `RequireAuth` wrapper gates all `/admin/*` routes except the login page.

**Tech Stack:** React 18, Vite, TypeScript, React Router, `@supabase/supabase-js`, Cloudinary (unsigned upload), Vitest + React Testing Library.

---

## Spec reference

This plan implements the "Trang Admin" and foundation sections of `docs/superpowers/specs/2026-07-10-graduation-invitation-website-design.md`. The public landing page (`/`) and the personal guest invite page (`/thiep/:guestId`) are **out of scope** for this plan and will be covered by a follow-up plan. This plan does add a minimal placeholder home page so the app has a valid `/` route.

## File Structure

```
.
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── lib/
    │   ├── supabaseClient.ts
    │   └── cloudinary.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useAuth.test.ts
    ├── components/
    │   └── RequireAuth.tsx
    ├── pages/
    │   ├── PlaceholderHome.tsx
    │   └── admin/
    │       ├── AdminLogin.tsx
    │       ├── AdminLogin.test.tsx
    │       ├── AdminDashboard.tsx
    │       ├── AdminDashboard.test.tsx
    │       ├── AdminGuestForm.tsx
    │       ├── AdminGuestForm.test.tsx
    │       ├── AdminEventSettings.tsx
    │       └── AdminEventSettings.test.tsx
    ├── types/
    │   └── database.ts
    └── test/
        ├── setup.ts
        └── supabaseMock.ts
```

---

### Task 1: Scaffold the Vite + React + TypeScript project

**Files:**
- Create: entire Vite scaffold (`package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, etc.)

- [ ] **Step 1: Initialize git**

Run in the project root (`D:\Tai_lieu_nam_ba\Thiep_moi_tot_nghiep`):

```bash
git init
```

Expected: `Initialized empty Git repository in .../Thiep_moi_tot_nghiep/.git/`

- [ ] **Step 2: Scaffold Vite with the react-ts template**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the current directory not being empty, confirm to proceed (the directory only contains the `docs/` folder we created during brainstorming).

- [ ] **Step 3: Install base dependencies and verify the dev server**

```bash
npm install
npm run dev -- --port 5173 &
```

Expected: Vite prints `Local: http://localhost:5173/`. Stop the dev server (`kill %1` or Ctrl+C) once confirmed.

- [ ] **Step 4: Commit the scaffold**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Install application dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install react-router-dom @supabase/supabase-js
```

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json` and add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add router, supabase, and test dependencies"
```

---

### Task 3: Environment variables

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.example` listing variable names only (no real values)**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

- [ ] **Step 2: Ensure `.env` is gitignored**

Open `.gitignore` (Vite's scaffold already creates one) and confirm/add this line:

```
.env
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

**Note for the human running this plan:** create a real `.env` file (not committed) with your actual Supabase project URL/anon key and Cloudinary cloud name/unsigned upload preset before running the app. The agent implementing this plan must not read or print the contents of `.env`.

---

### Task 4: TypeScript types for database rows

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: Write the types**

```typescript
// src/types/database.ts
export type RsvpStatus = 'pending' | 'attending' | 'not_attending'

export interface Guest {
  id: string
  full_name: string
  salutation: string | null
  greeting_message: string | null
  rsvp_status: RsvpStatus
  rsvp_responded_at: string | null
  created_at: string
  updated_at: string
}

export interface EventSettings {
  id: number
  event_name: string | null
  event_datetime: string | null
  venue_name: string | null
  venue_address: string | null
  map_embed_url: string | null
  cover_image_url: string | null
}

export interface GalleryPhoto {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
  created_at: string
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add database row types"
```

---

### Task 5: Supabase schema, RLS policies, and RSVP RPC

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_init.sql

create extension if not exists "pgcrypto";

create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  salutation text,
  greeting_message text,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'attending', 'not_attending')),
  rsvp_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_settings (
  id int primary key default 1,
  event_name text,
  event_datetime timestamptz,
  venue_name text,
  venue_address text,
  map_embed_url text,
  cover_image_url text,
  constraint single_row check (id = 1)
);

insert into event_settings (id) values (1);

create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table guests enable row level security;
alter table event_settings enable row level security;
alter table gallery_photos enable row level security;

create policy "guests_public_read" on guests for select using (true);
create policy "guests_admin_insert" on guests for insert with check (auth.role() = 'authenticated');
create policy "guests_admin_update" on guests for update using (auth.role() = 'authenticated');
create policy "guests_admin_delete" on guests for delete using (auth.role() = 'authenticated');

create policy "event_settings_public_read" on event_settings for select using (true);
create policy "event_settings_admin_update" on event_settings for update using (auth.role() = 'authenticated');

create policy "gallery_public_read" on gallery_photos for select using (true);
create policy "gallery_admin_insert" on gallery_photos for insert with check (auth.role() = 'authenticated');
create policy "gallery_admin_delete" on gallery_photos for delete using (auth.role() = 'authenticated');

create or replace function submit_rsvp(guest_id uuid, status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if status not in ('attending', 'not_attending') then
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

- [ ] **Step 2: Commit the migration file**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add Supabase schema, RLS policies, and submit_rsvp RPC"
```

**Note for the human running this plan:** open your Supabase project's SQL Editor and run this file's contents once to create the schema. This plan does not automate running it against a live project.

---

### Task 6: Supabase client module

**Files:**
- Create: `src/lib/supabaseClient.ts`

- [ ] **Step 1: Write the client**

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabaseClient.ts
git commit -m "feat: add Supabase client"
```

---

### Task 7: Cloudinary upload helper (TDD)

**Files:**
- Create: `src/lib/cloudinary.ts`
- Test: `src/lib/cloudinary.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cloudinary.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadImage } from './cloudinary'

describe('uploadImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the file to Cloudinary and returns the secure URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const url = await uploadImage(file)

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/abc.jpg')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, options] = fetchMock.mock.calls[0]
    expect(requestUrl).toContain('api.cloudinary.com')
    expect(options.method).toBe('POST')
  })

  it('throws when Cloudinary responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))

    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadImage(file)).rejects.toThrow('Cloudinary upload failed')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cloudinary.test.ts
```

Expected: FAIL — `Cannot find module './cloudinary'` (or `uploadImage is not exported`).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/cloudinary.ts
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadImage(file: File): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET environment variables')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  const data = await response.json()
  return data.secure_url as string
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cloudinary.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cloudinary.ts src/lib/cloudinary.test.ts
git commit -m "feat: add Cloudinary upload helper"
```

---

### Task 8: Vitest test setup and Supabase mock helper

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/supabaseMock.ts`

- [ ] **Step 1: Write the Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: Write the jest-dom setup file**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Write a reusable Supabase query-builder mock**

This mock is used by every component test that calls `supabase.from(...)`. It is chainable (every method returns itself) and thenable at any point in the chain, matching how `supabase-js` query builders behave.

```typescript
// src/test/supabaseMock.ts
import { vi } from 'vitest'

export interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
}

export function createQueryBuilderMock<T>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (
      onFulfilled: (value: QueryResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  }

  return builder
}
```

- [ ] **Step 4: Verify the project still type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/test/supabaseMock.ts
git commit -m "test: add Vitest config and Supabase mock helper"
```

---

### Task 9: `useAuth` hook (TDD)

**Files:**
- Create: `src/hooks/useAuth.ts`
- Test: `src/hooks/useAuth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/useAuth.test.ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

const mockedAuth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  signInWithPassword: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

describe('useAuth', () => {
  beforeEach(() => {
    mockedAuth.getSession.mockResolvedValue({ data: { session: null } })
    mockedAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('starts with loading true, then resolves session from getSession', async () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('signIn calls supabase.auth.signInWithPassword and throws on error', async () => {
    mockedAuth.signInWithPassword.mockResolvedValue({ error: { message: 'bad creds' } })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(() => result.current.signIn('a@b.com', 'wrong'))
    ).rejects.toBeTruthy()

    expect(mockedAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'wrong',
    })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockedAuth.signOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.signOut())

    expect(mockedAuth.signOut).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/hooks/useAuth.test.ts
```

Expected: FAIL — `Cannot find module './useAuth'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, loading, signIn, signOut }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/hooks/useAuth.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/hooks/useAuth.test.ts
git commit -m "feat: add useAuth hook"
```

---

### Task 10: `RequireAuth` component (TDD)

**Files:**
- Create: `src/components/RequireAuth.tsx`
- Test: `src/components/RequireAuth.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/RequireAuth.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/useAuth')

import { useAuth } from '../hooks/useAuth'
import { RequireAuth } from './RequireAuth'

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin/login" element={<p>Login page</p>} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <p>Protected content</p>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  it('shows a loading state while auth is resolving', () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: true })
    renderWithRouter()
    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('redirects to /admin/login when there is no session', () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false })
    renderWithRouter()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children when a session exists', () => {
    mockedUseAuth.mockReturnValue({ session: { user: { id: '1' } }, loading: false })
    renderWithRouter()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/RequireAuth.test.tsx
```

Expected: FAIL — `Cannot find module './RequireAuth'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/RequireAuth.tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p>Đang tải...</p>
  if (!session) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/RequireAuth.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RequireAuth.tsx src/components/RequireAuth.test.tsx
git commit -m "feat: add RequireAuth route guard"
```

---

### Task 11: App routing and placeholder home page

**Files:**
- Create: `src/pages/PlaceholderHome.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the placeholder home page**

```typescript
// src/pages/PlaceholderHome.tsx
export function PlaceholderHome() {
  return <p>Trang mời chung đang được xây dựng.</p>
}
```

- [ ] **Step 2: Replace `src/App.tsx` with the route table**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { PlaceholderHome } from './pages/PlaceholderHome'
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminGuestForm } from './pages/admin/AdminGuestForm'
import { AdminEventSettings } from './pages/admin/AdminEventSettings'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderHome />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/khach/:id"
          element={
            <RequireAuth>
              <AdminGuestForm />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/su-kien"
          element={
            <RequireAuth>
              <AdminEventSettings />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

This references the four admin page components built in Tasks 12–15 below; the app will not compile until those exist. That's expected — this task's commit happens after Task 15, or you may stub the four files with a minimal `export function X() { return null }` now and let later tasks replace them. This plan takes the stub approach so each task compiles independently.

- [ ] **Step 3: Create minimal stubs so the app compiles right now**

```typescript
// src/pages/admin/AdminLogin.tsx
export function AdminLogin() {
  return null
}
```

```typescript
// src/pages/admin/AdminDashboard.tsx
export function AdminDashboard() {
  return null
}
```

```typescript
// src/pages/admin/AdminGuestForm.tsx
export function AdminGuestForm() {
  return null
}
```

```typescript
// src/pages/admin/AdminEventSettings.tsx
export function AdminEventSettings() {
  return null
}
```

- [ ] **Step 4: Verify the app compiles and the dev server runs**

```bash
npx tsc --noEmit
npm run dev -- --port 5173 &
```

Expected: no type errors; visiting `http://localhost:5173/` shows "Trang mời chung đang được xây dựng." Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/PlaceholderHome.tsx src/pages/admin/
git commit -m "feat: add route table with placeholder admin pages"
```

---

### Task 12: `AdminLogin` page (TDD)

**Files:**
- Modify: `src/pages/admin/AdminLogin.tsx`
- Test: `src/pages/admin/AdminLogin.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/admin/AdminLogin.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: signInMock }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { AdminLogin } from './AdminLogin'

describe('AdminLogin', () => {
  it('signs in and navigates to /admin on success', async () => {
    signInMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminLogin />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(signInMock).toHaveBeenCalledWith('admin@example.com', 'secret123')
    expect(navigateMock).toHaveBeenCalledWith('/admin')
  })

  it('shows an error message when sign-in fails', async () => {
    signInMock.mockRejectedValue(new Error('bad creds'))
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminLogin />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Đăng nhập thất bại')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/admin/AdminLogin.test.tsx
```

Expected: FAIL — the stub component renders `null`, so `screen.getByLabelText('Email')` throws.

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/admin/AdminLogin.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AdminLogin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/admin')
    } catch {
      setError('Đăng nhập thất bại. Kiểm tra lại email/mật khẩu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Đăng nhập Admin</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Mật khẩu
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/admin/AdminLogin.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminLogin.tsx src/pages/admin/AdminLogin.test.tsx
git commit -m "feat: implement AdminLogin page"
```

---

### Task 13: `AdminDashboard` page (TDD)

**Files:**
- Modify: `src/pages/admin/AdminDashboard.tsx`
- Test: `src/pages/admin/AdminDashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/admin/AdminDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../../test/supabaseMock'
import type { Guest } from '../../types/database'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../../lib/supabaseClient'
import { AdminDashboard } from './AdminDashboard'

const guests: Guest[] = [
  {
    id: '1',
    full_name: 'Nguyễn Văn A',
    salutation: 'Anh',
    greeting_message: null,
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
    rsvp_status: 'pending',
    rsvp_responded_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('AdminDashboard', () => {
  it('loads guests and shows the list with summary counts', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(createQueryBuilderMock({ data: guests, error: null }))

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.getByText('Tổng số: 2')).toBeInTheDocument()
    expect(screen.getByText('Đã xác nhận: 1')).toBeInTheDocument()
  })

  it('filters guests by the search box', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(createQueryBuilderMock({ data: guests, error: null }))
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn A')
    await user.type(screen.getByPlaceholderText('Tìm theo tên...'), 'Trần')

    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }))

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() =>
      expect(screen.getByText('Không tải được danh sách khách mời.')).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/admin/AdminDashboard.test.tsx
```

Expected: FAIL — the stub component renders `null`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Guest } from '../../types/database'

export function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadGuests()
  }, [])

  async function loadGuests() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setError('Không tải được danh sách khách mời.')
    } else {
      setGuests((data ?? []) as Guest[])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá khách mời này?')) return
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (!error) {
      setGuests((prev) => prev.filter((g) => g.id !== id))
    }
  }

  const filtered = guests.filter((g) => g.full_name.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    total: guests.length,
    attending: guests.filter((g) => g.rsvp_status === 'attending').length,
    notAttending: guests.filter((g) => g.rsvp_status === 'not_attending').length,
    pending: guests.filter((g) => g.rsvp_status === 'pending').length,
  }

  if (loading) return <p>Đang tải...</p>
  if (error) return <p role="alert">{error}</p>

  return (
    <div>
      <h1>Danh sách khách mời</h1>
      <div>
        <span>Tổng số: {counts.total}</span>{' '}
        <span>Đã xác nhận: {counts.attending}</span>{' '}
        <span>Từ chối: {counts.notAttending}</span>{' '}
        <span>Chưa phản hồi: {counts.pending}</span>
      </div>
      <p>
        <Link to="/admin/su-kien">Sửa thông tin sự kiện</Link>{' '}
        <Link to="/admin/khach/new">Thêm khách mời</Link>
      </p>
      <input
        type="text"
        placeholder="Tìm theo tên..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Danh xưng</th>
            <th>Trạng thái RSVP</th>
            <th>Thời điểm phản hồi</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g) => (
            <tr key={g.id}>
              <td>{g.full_name}</td>
              <td>{g.salutation}</td>
              <td>{g.rsvp_status}</td>
              <td>{g.rsvp_responded_at ?? '-'}</td>
              <td>
                <Link to={`/admin/khach/${g.id}`}>Sửa</Link>{' '}
                <button onClick={() => handleDelete(g.id)}>Xoá</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/admin/AdminDashboard.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminDashboard.test.tsx
git commit -m "feat: implement AdminDashboard page"
```

---

### Task 14: `AdminGuestForm` page (TDD)

**Files:**
- Modify: `src/pages/admin/AdminGuestForm.tsx`
- Test: `src/pages/admin/AdminGuestForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/admin/AdminGuestForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createQueryBuilderMock } from '../../test/supabaseMock'

const navigateMock = vi.fn()

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { supabase } from '../../lib/supabaseClient'
import { AdminGuestForm } from './AdminGuestForm'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/khach/:id" element={<AdminGuestForm />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminGuestForm', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('creates a new guest and navigates to /admin', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(createQueryBuilderMock({ data: null, error: null }))
    const user = userEvent.setup()

    renderAt('/admin/khach/new')

    await user.type(screen.getByLabelText('Tên khách'), 'Lê Văn C')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin'))
    expect(fromMock).toHaveBeenCalledWith('guests')
  })

  it('loads an existing guest and populates the form', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(
      createQueryBuilderMock({
        data: {
          id: '1',
          full_name: 'Nguyễn Văn A',
          salutation: 'Anh',
          greeting_message: 'Chúc mừng nhé!',
          rsvp_status: 'pending',
          rsvp_responded_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      })
    )

    renderAt('/admin/khach/1')

    expect(await screen.findByDisplayValue('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Chúc mừng nhé!')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/admin/AdminGuestForm.test.tsx
```

Expected: FAIL — the stub component renders `null`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/admin/AdminGuestForm.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Guest } from '../../types/database'

const SALUTATIONS = ['Anh', 'Chị', 'Bạn', 'Thầy/Cô']

export function AdminGuestForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [fullName, setFullName] = useState('')
  const [salutation, setSalutation] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew || !id) return
    loadGuest(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew])

  async function loadGuest(guestId: string) {
    setLoading(true)
    const { data, error } = await supabase.from('guests').select('*').eq('id', guestId).single()

    if (error || !data) {
      setError('Không tìm thấy khách mời.')
    } else {
      const guest = data as Guest
      setFullName(guest.full_name)
      setSalutation(guest.salutation ?? '')
      setGreetingMessage(guest.greeting_message ?? '')
    }
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      full_name: fullName,
      salutation: salutation || null,
      greeting_message: greetingMessage || null,
    }

    const { error } = isNew
      ? await supabase.from('guests').insert(payload)
      : await supabase.from('guests').update(payload).eq('id', id)

    if (error) {
      setError('Lưu thất bại, vui lòng thử lại.')
      setSaving(false)
      return
    }

    navigate('/admin')
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!window.confirm('Xoá khách mời này?')) return
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (!error) navigate('/admin')
  }

  if (loading) return <p>Đang tải...</p>

  return (
    <form onSubmit={handleSubmit}>
      <h1>{isNew ? 'Thêm khách mời' : 'Sửa khách mời'}</h1>
      <label>
        Tên khách
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </label>
      <label>
        Danh xưng
        <input
          list="salutation-options"
          value={salutation}
          onChange={(e) => setSalutation(e.target.value)}
        />
        <datalist id="salutation-options">
          {SALUTATIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Lời chào riêng
        <textarea value={greetingMessage} onChange={(e) => setGreetingMessage(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
      {!isNew && (
        <button type="button" onClick={handleDelete}>
          Xoá
        </button>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/admin/AdminGuestForm.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminGuestForm.tsx src/pages/admin/AdminGuestForm.test.tsx
git commit -m "feat: implement AdminGuestForm page"
```

---

### Task 15: `AdminEventSettings` page (TDD)

**Files:**
- Modify: `src/pages/admin/AdminEventSettings.tsx`
- Test: `src/pages/admin/AdminEventSettings.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/admin/AdminEventSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../../test/supabaseMock'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../../lib/cloudinary', () => ({
  uploadImage: vi.fn(),
}))

import { supabase } from '../../lib/supabaseClient'
import { uploadImage } from '../../lib/cloudinary'
import { AdminEventSettings } from './AdminEventSettings'

const eventSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: '',
  cover_image_url: null,
}

describe('AdminEventSettings', () => {
  it('loads event settings and gallery, then shows them', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })

    render(<AdminEventSettings />)

    expect(await screen.findByDisplayValue('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hội trường A')).toBeInTheDocument()
  })

  it('uploads a cover image and saves it into the field', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    vi.mocked(uploadImage).mockResolvedValue('https://res.cloudinary.com/demo/cover.jpg')
    const user = userEvent.setup()

    render(<AdminEventSettings />)
    await screen.findByDisplayValue('Lễ tốt nghiệp')

    const file = new File(['bytes'], 'cover.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Ảnh bìa')
    await user.upload(input, file)

    await waitFor(() => expect(screen.getByAltText('Ảnh bìa')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/cover.jpg'
    ))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/admin/AdminEventSettings.test.tsx
```

Expected: FAIL — the stub component renders `null`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/admin/AdminEventSettings.tsx
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadImage } from '../../lib/cloudinary'
import type { EventSettings, GalleryPhoto } from '../../types/database'

export function AdminEventSettings() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [gallery, setGallery] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [settingsRes, galleryRes] = await Promise.all([
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('gallery_photos').select('*').order('sort_order', { ascending: true }),
    ])

    if (!settingsRes.error && settingsRes.data) {
      setSettings(settingsRes.data as EventSettings)
    }
    if (!galleryRes.error && galleryRes.data) {
      setGallery(galleryRes.data as GalleryPhoto[])
    }
    setLoading(false)
  }

  function updateField<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('event_settings')
      .update({
        event_name: settings.event_name,
        event_datetime: settings.event_datetime,
        venue_name: settings.venue_name,
        venue_address: settings.venue_address,
        map_embed_url: settings.map_embed_url,
        cover_image_url: settings.cover_image_url,
      })
      .eq('id', 1)

    if (error) {
      setError('Lưu thất bại, vui lòng thử lại.')
    }
    setSaving(false)
  }

  async function handleCoverUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(file)
      updateField('cover_image_url', url)
    } catch {
      setError('Tải ảnh bìa thất bại.')
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleGalleryUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingGallery(true)
    try {
      const url = await uploadImage(file)
      const { data, error } = await supabase
        .from('gallery_photos')
        .insert({ image_url: url, sort_order: gallery.length })
        .select()
        .single()

      if (!error && data) {
        setGallery((prev) => [...prev, data as GalleryPhoto])
      }
    } catch {
      setError('Tải ảnh kỷ niệm thất bại.')
    } finally {
      setUploadingGallery(false)
    }
  }

  async function handleGalleryDelete(id: string) {
    const { error } = await supabase.from('gallery_photos').delete().eq('id', id)
    if (!error) {
      setGallery((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (loading || !settings) return <p>Đang tải...</p>

  return (
    <div>
      <h1>Thông tin sự kiện</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Tên lễ
          <input
            value={settings.event_name ?? ''}
            onChange={(e) => updateField('event_name', e.target.value)}
          />
        </label>
        <label>
          Ngày giờ
          <input
            type="datetime-local"
            value={settings.event_datetime ?? ''}
            onChange={(e) => updateField('event_datetime', e.target.value)}
          />
        </label>
        <label>
          Tên địa điểm
          <input
            value={settings.venue_name ?? ''}
            onChange={(e) => updateField('venue_name', e.target.value)}
          />
        </label>
        <label>
          Địa chỉ
          <input
            value={settings.venue_address ?? ''}
            onChange={(e) => updateField('venue_address', e.target.value)}
          />
        </label>
        <label>
          Link Google Maps embed
          <input
            value={settings.map_embed_url ?? ''}
            onChange={(e) => updateField('map_embed_url', e.target.value)}
          />
        </label>
        <label>
          Ảnh bìa
          <input type="file" accept="image/*" onChange={handleCoverUpload} />
        </label>
        {uploadingCover && <p>Đang tải ảnh bìa...</p>}
        {settings.cover_image_url && (
          <img src={settings.cover_image_url} alt="Ảnh bìa" width={200} />
        )}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thông tin sự kiện'}
        </button>
      </form>

      <h2>Album ảnh kỷ niệm</h2>
      <label>
        Thêm ảnh
        <input type="file" accept="image/*" onChange={handleGalleryUpload} />
      </label>
      {uploadingGallery && <p>Đang tải ảnh...</p>}
      <ul>
        {gallery.map((photo) => (
          <li key={photo.id}>
            <img src={photo.image_url} alt={photo.caption ?? ''} width={120} />
            <button onClick={() => handleGalleryDelete(photo.id)}>Xoá</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/admin/AdminEventSettings.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminEventSettings.tsx src/pages/admin/AdminEventSettings.test.tsx
git commit -m "feat: implement AdminEventSettings page"
```

---

### Task 16: Full test suite, type-check, and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

```bash
npm run test
```

Expected: all test files pass (cloudinary, useAuth, RequireAuth, AdminLogin, AdminDashboard, AdminGuestForm, AdminEventSettings).

- [ ] **Step 2: Type-check the whole project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Create a real Supabase project (manual, human-only)**

In the Supabase dashboard: create a new project, open the SQL Editor, and run the contents of `supabase/migrations/0001_init.sql`. Under Authentication, create one user (email/password) for yourself — this is the only admin account. Copy the project URL and anon key into a local `.env` file (not committed) using the names from `.env.example`.

- [ ] **Step 4: Create a Cloudinary unsigned upload preset (manual, human-only)**

In the Cloudinary dashboard: Settings → Upload → Add upload preset → set Signing Mode to "Unsigned". Copy the cloud name and preset name into the local `.env` file.

- [ ] **Step 5: Manual QA checklist against the running app**

```bash
npm run dev
```

Walk through, with a real `.env` filled in:
- [ ] Visit `/admin` while logged out → redirected to `/admin/login`.
- [ ] Log in with the Supabase Auth user created in Step 3 → redirected to `/admin`.
- [ ] Add a new guest via "Thêm khách mời" → appears in the dashboard list and summary counts update.
- [ ] Edit that guest's salutation and greeting message → changes persist after reload.
- [ ] Delete the guest → removed from the list.
- [ ] Open "Sửa thông tin sự kiện", edit the event name/date/venue, save, reload → changes persist.
- [ ] Upload a cover image → preview appears; reload → still there.
- [ ] Upload a gallery photo → appears in the album list; delete it → removed.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete admin foundation verification"
```

---

## Out of scope (next plan)

- `/` public landing page: real event info display, countdown timer, Google Maps embed, gallery display, name search with fuzzy suggestions.
- `/thiep/:guestId` personal invite page: `InviteFrame` (SVG/CSS wavy border design), personalized greeting, RSVP buttons calling `submit_rsvp`.
- Deployment to Vercel.

These will be covered in a follow-up plan after this Admin foundation is reviewed.
