# Background Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-managed YouTube playlist that plays as background music, persists across page navigation, and is controlled from a widget on `HomePage` matching the provided mockup.

**Architecture:** A new `music_tracks` Supabase table (same shape/policies as `gallery_photos`) is managed from a new "Nhạc nền" section in `AdminEventSettings`. A `MusicPlayerProvider` React Context, mounted once above the router in `App.tsx`, owns a hidden `react-youtube` player and playback state so it survives route changes; a `MusicPlayerWidget` component reads that context and renders the pink pill control, inserted into `HomePage` only.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (`@supabase/supabase-js`), Vitest + Testing Library, new dependency `react-youtube`.

Reference spec: `docs/superpowers/specs/2026-07-13-background-music-design.md`

---

## Task 1: `music_tracks` table + `MusicTrack` type

**Files:**
- Create: `supabase/migrations/20260713120000_add_music_tracks.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260713120000_add_music_tracks.sql
-- Migration: Add music_tracks table for admin-managed background music playlist
-- Date: 2026-07-13

create table music_tracks (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table music_tracks enable row level security;

create policy "music_tracks_public_read" on music_tracks for select using (true);
create policy "music_tracks_admin_insert" on music_tracks for insert with check (auth.role() = 'authenticated');
create policy "music_tracks_admin_delete" on music_tracks for delete using (auth.role() = 'authenticated');
```

- [ ] **Step 2: Add the `MusicTrack` type**

Append to `src/types/database.ts`:

```ts
export interface MusicTrack {
  id: string
  youtube_url: string
  sort_order: number
  created_at: string
}
```

- [ ] **Step 3: Apply the migration**

Run (adjust to however this project applies migrations — check `README.md` if unsure; if using the Supabase CLI):

```bash
npx supabase db push
```

Expected: `music_tracks` table created in the project's Supabase instance, no errors. If you don't have Supabase CLI access configured, note this in your task report instead of guessing at credentials — do not touch `.env`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260713120000_add_music_tracks.sql src/types/database.ts
git commit -m "feat: add music_tracks table and MusicTrack type"
```

---

## Task 2: YouTube URL parsing utility

**Files:**
- Create: `src/lib/youtube.ts`
- Test: `src/lib/youtube.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/youtube.test.ts
import { describe, expect, it } from 'vitest'
import { parseYoutubeId } from './youtube'

describe('parseYoutubeId', () => {
  it('extracts the id from a watch URL', () => {
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts the id from a watch URL with extra query params', () => {
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(
      'dQw4w9WgXcQ'
    )
  })

  it('extracts the id from a youtu.be short URL', () => {
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts the id from a youtu.be short URL with query params', () => {
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ?si=abc123')).toBe('dQw4w9WgXcQ')
  })

  it('extracts the id from an embed URL', () => {
    expect(parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts the id from a shorts URL', () => {
    expect(parseYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for a non-YouTube URL', () => {
    expect(parseYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseYoutubeId('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/youtube.test.ts`
Expected: FAIL — `Failed to resolve import "./youtube"` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/youtube.ts
const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

export function parseYoutubeId(url: string): string | null {
  const match = url.match(YOUTUBE_ID_PATTERN)
  return match ? match[1] : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/youtube.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat: add parseYoutubeId URL parsing utility"
```

---

## Task 3: Install `react-youtube`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install react-youtube@^10.1.0
```

Expected: `package.json` `dependencies` gains `"react-youtube": "^10.1.0"`, `package-lock.json` updates, no peer-dependency conflict errors (react-youtube only requires `react >=0.14.1`, compatible with React 19).

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-youtube dependency"
```

---

## Task 4: `MusicPlayerContext` + `useMusicPlayer` hook

**Files:**
- Create: `src/context/MusicPlayerContext.tsx`
- Create: `src/hooks/useMusicPlayer.ts`
- Test: `src/context/MusicPlayerContext.test.tsx`

This is the core playback engine: fetches the playlist, renders a hidden `react-youtube` player, and exposes `hasTracks` / `isPlaying` / `togglePlay` / `next` / `prev` through context. `useContext` returns a safe default (`hasTracks: false`, no-op functions) when no `MusicPlayerProvider` is mounted, so any component that calls `useMusicPlayer()` without a provider in the tree (e.g. in an isolated test) simply behaves as "no tracks" instead of crashing.

- [ ] **Step 1: Write the failing test**

```tsx
// src/context/MusicPlayerContext.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../test/supabaseMock'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

// Self-contained mock: playVideo()/pauseVideo() synchronously fire onStateChange
// with the matching PlayerState, like the real player does. Deliberately does
// NOT close over any outer `const` — vi.mock factories run before top-level
// `const`s are initialized (Vitest hoists vi.mock calls above imports), so
// referencing an outer variable here would hit a temporal-dead-zone error.
vi.mock('react-youtube', () => {
  function MockYouTube(props: {
    onReady?: (event: { target: unknown }) => void
    onStateChange?: (event: { data: number }) => void
  }) {
    const player = {
      playVideo: () => props.onStateChange?.({ data: 1 }),
      pauseVideo: () => props.onStateChange?.({ data: 2 }),
    }
    props.onReady?.({ target: player })
    return null
  }
  MockYouTube.PlayerState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }
  return { default: MockYouTube }
})

import { supabase } from '../lib/supabaseClient'
import { MusicPlayerProvider } from './MusicPlayerContext'
import { useMusicPlayer } from '../hooks/useMusicPlayer'

function Consumer() {
  const { hasTracks, isPlaying, togglePlay, next, prev } = useMusicPlayer()
  return (
    <div>
      <span>hasTracks:{String(hasTracks)}</span>
      <span>isPlaying:{String(isPlaying)}</span>
      <button onClick={togglePlay}>toggle</button>
      <button onClick={next}>next</button>
      <button onClick={prev}>prev</button>
    </div>
  )
}

const tracks = [
  { id: '1', youtube_url: 'https://youtu.be/aaaaaaaaaaa', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', youtube_url: 'https://youtu.be/bbbbbbbbbbb', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
]

describe('MusicPlayerProvider', () => {
  it('starts with hasTracks false and flips to true once the playlist loads', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation(() => createQueryBuilderMock({ data: tracks, error: null }))

    render(
      <MusicPlayerProvider>
        <Consumer />
      </MusicPlayerProvider>
    )

    expect(await screen.findByText('hasTracks:true')).toBeInTheDocument()
  })

  it('starts playback on the first pointerdown anywhere on the document', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation(() => createQueryBuilderMock({ data: tracks, error: null }))
    const user = userEvent.setup()

    render(
      <MusicPlayerProvider>
        <Consumer />
      </MusicPlayerProvider>
    )
    await screen.findByText('hasTracks:true')

    expect(screen.getByText('isPlaying:false')).toBeInTheDocument()
    await user.click(document.body)

    expect(await screen.findByText('isPlaying:true')).toBeInTheDocument()
  })

  it('toggles isPlaying when togglePlay is clicked', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation(() => createQueryBuilderMock({ data: tracks, error: null }))
    const user = userEvent.setup()

    render(
      <MusicPlayerProvider>
        <Consumer />
      </MusicPlayerProvider>
    )
    await screen.findByText('hasTracks:true')

    await user.click(screen.getByText('toggle'))
    expect(await screen.findByText('isPlaying:true')).toBeInTheDocument()

    await user.click(screen.getByText('toggle'))
    expect(await screen.findByText('isPlaying:false')).toBeInTheDocument()
  })

  it('stays at hasTracks false when the playlist is empty', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation(() => createQueryBuilderMock({ data: [], error: null }))

    render(
      <MusicPlayerProvider>
        <Consumer />
      </MusicPlayerProvider>
    )

    await screen.findByText('hasTracks:false')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/context/MusicPlayerContext.test.tsx`
Expected: FAIL — `Failed to resolve import "./MusicPlayerContext"` / `"../hooks/useMusicPlayer"` (files don't exist yet).

- [ ] **Step 3: Write the context + hook**

```tsx
// src/context/MusicPlayerContext.tsx
import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import YouTube from 'react-youtube'
import type { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import { supabase } from '../lib/supabaseClient'
import { parseYoutubeId } from '../lib/youtube'
import type { MusicTrack } from '../types/database'

export interface MusicPlayerContextValue {
  hasTracks: boolean
  isPlaying: boolean
  togglePlay: () => void
  next: () => void
  prev: () => void
}

const defaultValue: MusicPlayerContextValue = {
  hasTracks: false,
  isPlaying: false,
  togglePlay: () => {},
  next: () => {},
  prev: () => {},
}

export const MusicPlayerContext = createContext<MusicPlayerContextValue>(defaultValue)

const hiddenPlayerStyle = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: 'hidden' as const,
  pointerEvents: 'none' as const,
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [videoIds, setVideoIds] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('music_tracks')
      .select('*')
      .order('sort_order', { ascending: true })
      .then((result: { data: MusicTrack[] | null; error: { message: string } | null }) => {
        if (cancelled || result.error || !result.data) return
        const ids = result.data
          .map((track) => parseYoutubeId(track.youtube_url))
          .filter((id): id is string => id !== null)
        setVideoIds(ids)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleFirstInteraction() {
      startedRef.current = true
      playerRef.current?.playVideo()
    }
    document.addEventListener('pointerdown', handleFirstInteraction, {
      once: true,
      capture: true,
    })
    return () =>
      document.removeEventListener('pointerdown', handleFirstInteraction, { capture: true })
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pauseVideo()
    } else {
      startedRef.current = true
      playerRef.current?.playVideo()
    }
  }, [isPlaying])

  const next = useCallback(() => {
    setCurrentIndex((i) => (videoIds.length === 0 ? 0 : (i + 1) % videoIds.length))
  }, [videoIds.length])

  const prev = useCallback(() => {
    setCurrentIndex((i) =>
      videoIds.length === 0 ? 0 : (i - 1 + videoIds.length) % videoIds.length
    )
  }, [videoIds.length])

  function handleReady(event: YouTubeEvent) {
    playerRef.current = event.target
    if (startedRef.current) {
      event.target.playVideo()
    }
  }

  function handleStateChange(event: YouTubeEvent<number>) {
    setIsPlaying(event.data === YouTube.PlayerState.PLAYING)
  }

  const value: MusicPlayerContextValue = {
    hasTracks: videoIds.length > 0,
    isPlaying,
    togglePlay,
    next,
    prev,
  }

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      {videoIds.length > 0 && (
        <div style={hiddenPlayerStyle} aria-hidden="true">
          <YouTube
            videoId={videoIds[currentIndex]}
            opts={{ playerVars: { autoplay: 0, controls: 0 } }}
            onReady={handleReady}
            onStateChange={handleStateChange}
            onEnd={next}
          />
        </div>
      )}
    </MusicPlayerContext.Provider>
  )
}
```

```ts
// src/hooks/useMusicPlayer.ts
import { useContext } from 'react'
import { MusicPlayerContext } from '../context/MusicPlayerContext'

export function useMusicPlayer() {
  return useContext(MusicPlayerContext)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/context/MusicPlayerContext.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/context/MusicPlayerContext.tsx src/context/MusicPlayerContext.test.tsx src/hooks/useMusicPlayer.ts
git commit -m "feat: add MusicPlayerProvider and useMusicPlayer hook"
```

---

## Task 5: Music icons

**Files:**
- Modify: `src/components/icons.tsx`

- [ ] **Step 1: Add the icons**

Append to `src/components/icons.tsx`:

```tsx
export function MusicNoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  )
}

export function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
```

No test needed — these are pure presentational SVGs with no logic, matching the existing icons in this file (none of which have tests).

- [ ] **Step 2: Commit**

```bash
git add src/components/icons.tsx
git commit -m "feat: add MusicNoteIcon and ChevronIcon"
```

---

## Task 6: `MusicPlayerWidget`

**Files:**
- Create: `src/components/MusicPlayerWidget.tsx`
- Create: `src/components/MusicPlayerWidget.css`
- Test: `src/components/MusicPlayerWidget.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/MusicPlayerWidget.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/useMusicPlayer', () => ({
  useMusicPlayer: vi.fn(),
}))

import { useMusicPlayer } from '../hooks/useMusicPlayer'
import { MusicPlayerWidget } from './MusicPlayerWidget'

describe('MusicPlayerWidget', () => {
  it('renders nothing when there are no tracks', () => {
    vi.mocked(useMusicPlayer).mockReturnValue({
      hasTracks: false,
      isPlaying: false,
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    })

    const { container } = render(<MusicPlayerWidget />)
    expect(container).toBeEmptyDOMElement()
  })

  it('toggles play/pause when the center button is clicked', async () => {
    const togglePlay = vi.fn()
    vi.mocked(useMusicPlayer).mockReturnValue({
      hasTracks: true,
      isPlaying: false,
      togglePlay,
      next: vi.fn(),
      prev: vi.fn(),
    })
    const user = userEvent.setup()

    render(<MusicPlayerWidget />)
    await user.click(screen.getByRole('button', { name: 'Phát nhạc' }))

    expect(togglePlay).toHaveBeenCalledTimes(1)
  })

  it('calls next and prev when the side buttons are clicked', async () => {
    const next = vi.fn()
    const prev = vi.fn()
    vi.mocked(useMusicPlayer).mockReturnValue({
      hasTracks: true,
      isPlaying: true,
      togglePlay: vi.fn(),
      next,
      prev,
    })
    const user = userEvent.setup()

    render(<MusicPlayerWidget />)
    await user.click(screen.getByRole('button', { name: 'Bài tiếp theo' }))
    await user.click(screen.getByRole('button', { name: 'Bài trước' }))

    expect(next).toHaveBeenCalledTimes(1)
    expect(prev).toHaveBeenCalledTimes(1)
  })

  it('shows the pause label and pulsing dot while playing', () => {
    vi.mocked(useMusicPlayer).mockReturnValue({
      hasTracks: true,
      isPlaying: true,
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    })

    render(<MusicPlayerWidget />)

    expect(screen.getByRole('button', { name: 'Tạm dừng nhạc' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MusicPlayerWidget.test.tsx`
Expected: FAIL — `Failed to resolve import "./MusicPlayerWidget"` (file doesn't exist yet).

- [ ] **Step 3: Write the component**

```tsx
// src/components/MusicPlayerWidget.tsx
import { useMusicPlayer } from '../hooks/useMusicPlayer'
import { ChevronIcon, MusicNoteIcon } from './icons'
import './MusicPlayerWidget.css'

export function MusicPlayerWidget() {
  const { hasTracks, isPlaying, togglePlay, next, prev } = useMusicPlayer()

  if (!hasTracks) return null

  return (
    <div className="music-widget">
      <button type="button" className="music-widget-side" onClick={prev} aria-label="Bài trước">
        <ChevronIcon className="music-widget-chevron music-widget-chevron-prev" />
      </button>
      <button
        type="button"
        className="music-widget-play"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
        aria-pressed={isPlaying}
      >
        <MusicNoteIcon className="music-widget-note" />
        {isPlaying && <span className="music-widget-dot" aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="music-widget-side"
        onClick={next}
        aria-label="Bài tiếp theo"
      >
        <ChevronIcon className="music-widget-chevron music-widget-chevron-next" />
      </button>
    </div>
  )
}
```

```css
/* src/components/MusicPlayerWidget.css */
.music-widget {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin: var(--space-4) auto 0;
  padding: var(--space-2) var(--space-4);
  width: fit-content;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 10px 24px -14px rgba(146, 46, 92, 0.45);
}

.music-widget-side {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
}

.music-widget-chevron {
  width: 16px;
  height: 16px;
}

.music-widget-chevron-prev {
  transform: rotate(180deg);
}

.music-widget-play {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #ffffff;
  cursor: pointer;
  padding: 0;
}

.music-widget-note {
  width: 22px;
  height: 22px;
}

.music-widget-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-secondary);
  animation: music-widget-pulse 1.6s ease-in-out infinite;
}

@keyframes music-widget-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.6;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MusicPlayerWidget.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/MusicPlayerWidget.tsx src/components/MusicPlayerWidget.css src/components/MusicPlayerWidget.test.tsx
git commit -m "feat: add MusicPlayerWidget"
```

---

## Task 7: Wire `MusicPlayerProvider` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap the router**

`src/App.tsx` currently reads:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { HomePage } from './pages/HomePage'
import { PublicInvite } from './pages/PublicInvite'
import { GuestInvite } from './pages/GuestInvite'
import { NotFound } from './pages/NotFound'
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminDashboard } from './pages/admin/AdminDashboard'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/thiep-chung/:guestId?" element={<PublicInvite />} />
        <Route path="/thiep/:guestId" element={<GuestInvite />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Replace it with:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { MusicPlayerProvider } from './context/MusicPlayerContext'
import { HomePage } from './pages/HomePage'
import { PublicInvite } from './pages/PublicInvite'
import { GuestInvite } from './pages/GuestInvite'
import { NotFound } from './pages/NotFound'
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminDashboard } from './pages/admin/AdminDashboard'

export function App() {
  return (
    <MusicPlayerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/thiep-chung/:guestId?" element={<PublicInvite />} />
          <Route path="/thiep/:guestId" element={<GuestInvite />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MusicPlayerProvider>
  )
}
```

`MusicPlayerProvider` is mounted above `BrowserRouter` so it never unmounts when routes change — this is what keeps music playing across page navigation. There is no existing `App.test.tsx`, so no test to update here.

- [ ] **Step 2: Verify the app still builds**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount MusicPlayerProvider above the router"
```

---

## Task 8: Insert the widget into `HomePage`

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `src/pages/HomePage.test.tsx` (append inside the existing `describe('HomePage', ...)` block, after the last `it`):

```tsx
  it('renders the music widget when the context has tracks', () => {
    render(
      <MusicPlayerContext.Provider
        value={{
          hasTracks: true,
          isPlaying: false,
          togglePlay: () => {},
          next: () => {},
          prev: () => {},
        }}
      >
        <HomePage />
      </MusicPlayerContext.Provider>
    )

    expect(screen.getByRole('button', { name: 'Phát nhạc' })).toBeInTheDocument()
  })
```

And add the import at the top of the file:

```tsx
import { MusicPlayerContext } from '../context/MusicPlayerContext'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — no element with role `button` named "Phát nhạc" found (widget not rendered yet).

- [ ] **Step 3: Insert the widget**

In `src/pages/HomePage.tsx`, add the import:

```tsx
import { MusicPlayerWidget } from '../components/MusicPlayerWidget'
```

And insert `<MusicPlayerWidget />` right after the `<p className="home-message">` paragraph, still inside `.home-message-zone`:

```tsx
        <div className="home-message-zone">
          <p className="home-message">
            Cảm ơn vì đã là một phần rực rỡ trong những năm tháng thanh xuân của mình.
            Nhập tên để cùng mở ra tấm vé đến ngày lễ tốt nghiệp nhé!
          </p>
          <MusicPlayerWidget />
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (4 tests). The three pre-existing tests must still pass unchanged — `MusicPlayerWidget` renders `null` when no `MusicPlayerProvider`/tracks are present, so it has no effect on them.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: insert MusicPlayerWidget into HomePage"
```

---

## Task 9: "Nhạc nền" admin section

**Files:**
- Modify: `src/pages/admin/AdminEventSettings.tsx`
- Modify: `src/pages/admin/AdminEventSettings.css`
- Modify: `src/pages/admin/AdminEventSettings.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add these two tests to `src/pages/admin/AdminEventSettings.test.tsx` (append inside the existing `describe('AdminEventSettings', ...)` block):

```tsx
  it('adds a music link and can delete it', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    const newTrack = {
      id: 'm1',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    }
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    const user = userEvent.setup()

    renderComponent()
    await screen.findByDisplayValue('Lễ tốt nghiệp')

    fromMock.mockImplementationOnce(() => createQueryBuilderMock({ data: newTrack, error: null }))

    const input = screen.getByLabelText('Thêm link YouTube')
    await user.type(input, newTrack.youtube_url)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))

    expect(await screen.findByText(newTrack.youtube_url)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xoá' }))
    await waitFor(() =>
      expect(screen.queryByText(newTrack.youtube_url)).not.toBeInTheDocument()
    )
  })

  it('shows an error and does not insert when the music link is not a valid YouTube URL', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    const user = userEvent.setup()

    renderComponent()
    await screen.findByDisplayValue('Lễ tốt nghiệp')

    const input = screen.getByLabelText('Thêm link YouTube')
    await user.type(input, 'not a youtube link')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))

    expect(
      await screen.findByText('Không nhận diện được link YouTube này.')
    ).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/AdminEventSettings.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Thêm link YouTube` (section doesn't exist yet).

- [ ] **Step 3: Add state, handlers, and the JSX section**

In `src/pages/admin/AdminEventSettings.tsx`, add to the imports:

```tsx
import type { EventSettings, GalleryPhoto, MusicTrack } from '../../types/database'
import { parseYoutubeId } from '../../lib/youtube'
```

(replacing the existing `import type { EventSettings, GalleryPhoto } from '../../types/database'` line)

Add new state alongside the existing `useState` calls:

```tsx
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [newMusicUrl, setNewMusicUrl] = useState('')
  const [musicUrlError, setMusicUrlError] = useState<string | null>(null)
```

Update `loadAll` to also fetch tracks:

```tsx
  async function loadAll() {
    setLoading(true)
    const [settingsRes, galleryRes, musicRes] = await Promise.all([
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('gallery_photos').select('*').order('sort_order', { ascending: true }),
      supabase.from('music_tracks').select('*').order('sort_order', { ascending: true }),
    ])

    if (!settingsRes.error && settingsRes.data) {
      setSettings(settingsRes.data as EventSettings)
    }
    if (!galleryRes.error && galleryRes.data) {
      setGallery(galleryRes.data as GalleryPhoto[])
    }
    if (!musicRes.error && musicRes.data) {
      setMusicTracks(musicRes.data as MusicTrack[])
    }
    setLoading(false)
  }
```

Add new handlers near `handleGalleryDelete`:

```tsx
  async function handleAddMusicTrack(e: FormEvent) {
    e.preventDefault()
    setMusicUrlError(null)
    if (!parseYoutubeId(newMusicUrl)) {
      setMusicUrlError('Không nhận diện được link YouTube này.')
      return
    }
    const { data, error } = await supabase
      .from('music_tracks')
      .insert({ youtube_url: newMusicUrl, sort_order: musicTracks.length })
      .select()
      .single()

    if (!error && data) {
      setMusicTracks((prev) => [...prev, data as MusicTrack])
      setNewMusicUrl('')
    }
  }

  async function handleDeleteMusicTrack(id: string) {
    const { error } = await supabase.from('music_tracks').delete().eq('id', id)
    if (!error) {
      setMusicTracks((prev) => prev.filter((t) => t.id !== id))
    }
  }
```

Add the new section's JSX after the closing `</div>` of the "Album ảnh kỷ niệm" block, before the `{coverCropFile && (...)}` block:

```tsx
      <h2 className="admin-section-title">Nhạc nền</h2>
      <div className="admin-card">
        <form className="admin-music-add-form" onSubmit={handleAddMusicTrack}>
          <label className="admin-field">
            Thêm link YouTube
            <input
              value={newMusicUrl}
              onChange={(e) => setNewMusicUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <button className="admin-button admin-button-primary" type="submit">
            Thêm
          </button>
        </form>
        {musicUrlError && (
          <p className="admin-error-banner" role="alert">
            {musicUrlError}
          </p>
        )}
        <ul className="admin-music-list">
          {musicTracks.map((track) => (
            <li key={track.id} className="admin-music-item">
              <span className="admin-music-url">{track.youtube_url}</span>
              <button
                className="admin-button admin-button-danger"
                onClick={() => handleDeleteMusicTrack(track.id)}
              >
                Xoá
              </button>
            </li>
          ))}
        </ul>
      </div>
```

Add the corresponding CSS to `src/pages/admin/AdminEventSettings.css`:

```css
.admin-music-add-form {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}

.admin-music-add-form .admin-field {
  flex: 1;
  margin-bottom: 0;
}

.admin-music-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  padding: 0;
}

.admin-music-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-muted);
  border-radius: var(--radius-md);
}

.admin-music-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
  color: var(--color-foreground);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/AdminEventSettings.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminEventSettings.tsx src/pages/admin/AdminEventSettings.css src/pages/admin/AdminEventSettings.test.tsx
git commit -m "feat: add Nhạc nền admin section for managing the YouTube playlist"
```

---

## Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including every file touched above.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx oxlint`
Expected: no errors (the `react/only-export-components` rule may warn on `MusicPlayerContext.tsx` since it exports both the context object and the `MusicPlayerProvider` component from one file — this is a warning, not an error, and matches how contexts are conventionally structured; do not restructure to silence it).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open the app in a browser:
1. Go to `/admin` (log in), open "Nhạc nền", paste a real YouTube link (e.g. a lofi/music video URL), click "Thêm" — it should appear in the list below.
2. Go to `/` — the pink music widget should appear below the thank-you message.
3. Click anywhere on the page (e.g. the name search box) — music should start playing audibly.
4. Click the center pink button — music pauses; click again — resumes.
5. Click the side chevrons — with only one track configured this just restarts the same track; add a second track in admin and repeat to confirm it actually switches tracks.
6. Search a name and open an invitation — confirm the music keeps playing without restarting.

Report the outcome of the manual smoke test in your final task summary — this is real user-facing behavior that automated tests can't fully cover (actual audio playback, real YouTube embed behavior).
