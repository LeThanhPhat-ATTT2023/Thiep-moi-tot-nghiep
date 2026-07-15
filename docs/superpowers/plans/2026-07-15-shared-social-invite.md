# Luồng thiệp mời chung mạng xã hội (/chung-vui) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/chung-vui` route — password-gated (`2307`), shared publicly on social media — that shows the same event info as the guest flow but opens a simplified, non-personalized envelope with no RSVP.

**Architecture:** Extract the data-fetching (`useEventInfo`) and presentational (`EventInfoSections`) parts of `PublicInvite.tsx` into reusable pieces, refactor `PublicInvite.tsx` to use them with zero behavior change, then build `SharedInvite.tsx` (gate + unlocked view) and `PublicEnvelopeModal.tsx` (envelope animation reused, RSVP/guest-name stripped out) on top of those reusable pieces.

**Tech Stack:** React 19 + react-router-dom 7, motion (framer-motion fork) for the envelope animation, Supabase (anon key + RLS `using (true)` public read), Vitest + Testing Library, no state persistence (component state only).

**Spec:** `docs/superpowers/specs/2026-07-15-shared-social-invite-design.md`

---

## Task 1: Add `public_invite_message` column + type

**Files:**
- Create: `supabase/migrations/20260715230000_add_public_invite_message.sql`
- Modify: `src/types/database.ts:16-24`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260715230000_add_public_invite_message.sql
-- Migration: Add public_invite_message column for the shared social invite flow (/chung-vui)
-- Date: 2026-07-15

alter table event_settings add column public_invite_message text;
```

No RLS change needed — `event_settings_public_read` already uses `using (true)` for all columns.

- [ ] **Step 2: Add the field to the `EventSettings` type**

In `src/types/database.ts`, change:

```ts
export interface EventSettings {
  id: number
  event_name: string | null
  event_datetime: string | null
  venue_name: string | null
  venue_address: string | null
  map_embed_url: string | null
  cover_image_url: string | null
}
```

to:

```ts
export interface EventSettings {
  id: number
  event_name: string | null
  event_datetime: string | null
  venue_name: string | null
  venue_address: string | null
  map_embed_url: string | null
  cover_image_url: string | null
  public_invite_message: string | null
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260715230000_add_public_invite_message.sql src/types/database.ts
git commit -m "feat: add public_invite_message column to event_settings"
```

Note: do not run this migration against the real Supabase project yet — confirm with the user first (per repo convention noted in the spec's "Ngoài phạm vi" section).

---

## Task 2: `useEventInfo` hook

**Files:**
- Create: `src/hooks/useEventInfo.ts`
- Test: `src/hooks/useEventInfo.test.ts`

This extracts the fetch logic currently inline in `PublicInvite.tsx:45-66` so both `PublicInvite` and `SharedInvite` can share it.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useEventInfo.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../test/supabaseMock'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabaseClient'
import { useEventInfo } from './useEventInfo'

const eventSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00:00Z',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: '',
  cover_image_url: null,
  public_invite_message: null,
}

const galleryPhoto = {
  id: 'g1',
  image_url: 'https://res.cloudinary.com/demo/photo.jpg',
  caption: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useEventInfo', () => {
  it('loads event settings and gallery photos', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [galleryPhoto], error: null })
    })

    const { result } = renderHook(() => useEventInfo())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.settings).toEqual(eventSettings)
    expect(result.current.gallery).toEqual([galleryPhoto])
    expect(result.current.error).toBeNull()
  })

  it('sets an error message when event_settings fails to load', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: null, error: { message: 'boom' } })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })

    const { result } = renderHook(() => useEventInfo())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Không tải được thông tin sự kiện.')
  })

  it('reloads data when reload is called', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: null, error: { message: 'boom' } })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })

    const { result } = renderHook(() => useEventInfo())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()

    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [galleryPhoto], error: null })
    })

    result.current.reload()
    await waitFor(() => expect(result.current.settings).toEqual(eventSettings))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useEventInfo.test.ts`
Expected: FAIL — `Cannot find module './useEventInfo'` (file doesn't exist yet).

- [ ] **Step 3: Write the hook**

```ts
// src/hooks/useEventInfo.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EventSettings, GalleryPhoto } from '../types/database'

export function useEventInfo() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [gallery, setGallery] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const [settingsRes, galleryRes] = await Promise.all([
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('gallery_photos').select('*').order('sort_order', { ascending: true }),
    ])

    if (settingsRes.error) {
      setError('Không tải được thông tin sự kiện.')
    } else {
      setSettings(settingsRes.data as EventSettings)
    }
    if (!galleryRes.error && galleryRes.data) {
      setGallery(galleryRes.data as GalleryPhoto[])
    }
    setLoading(false)
  }

  return { settings, gallery, loading, error, reload: load }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useEventInfo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEventInfo.ts src/hooks/useEventInfo.test.ts
git commit -m "feat: extract useEventInfo hook from PublicInvite"
```

---

## Task 3: `EventInfoSections` component

**Files:**
- Create: `src/components/EventInfoSections.tsx`
- Test: `src/components/EventInfoSections.test.tsx`

Extracts the JSX in `PublicInvite.tsx:86-150` (countdown/cover photo/gallery/venue-map) into a props-driven component so `SharedInvite` can render the same content without a guest id.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/EventInfoSections.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventInfoSections } from './EventInfoSections'

const fullSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00:00Z',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: 'https://maps.google.com/embed',
  cover_image_url: 'https://res.cloudinary.com/demo/cover.jpg',
  public_invite_message: null,
}

const gallery = [
  {
    id: 'g1',
    image_url: 'https://res.cloudinary.com/demo/photo.jpg',
    caption: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('EventInfoSections', () => {
  it('renders the event name, cover photo, and venue when all data is present', () => {
    render(<EventInfoSections settings={fullSettings} gallery={gallery} />)

    expect(screen.getByText('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(screen.getByAltText('Ảnh tốt nghiệp của Ngọc Trinh')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/cover.jpg'
    )
    expect(screen.getByText('Hội trường A')).toBeInTheDocument()
  })

  it('hides the cover photo and venue sections when their data is missing', () => {
    const minimalSettings = {
      ...fullSettings,
      cover_image_url: null,
      venue_name: null,
      event_datetime: null,
      map_embed_url: null,
    }

    render(<EventInfoSections settings={minimalSettings} gallery={[]} />)

    expect(screen.getByText('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(screen.queryByAltText('Ảnh tốt nghiệp của Ngọc Trinh')).not.toBeInTheDocument()
    expect(screen.queryByText('Hội trường A')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EventInfoSections.test.tsx`
Expected: FAIL — `Cannot find module './EventInfoSections'`

- [ ] **Step 3: Write the component**

```tsx
// src/components/EventInfoSections.tsx
import type { EventSettings, GalleryPhoto } from '../types/database'
import { CountdownTimer } from './CountdownTimer'
import { MapEmbed } from './MapEmbed'
import { GalleryGrid } from './GalleryGrid'
import {
  CalendarIcon,
  ClockIcon,
  CurlyArrowIcon,
  LocationPinIcon,
  SparkleIcon,
} from './icons'
import { HOST_NAME } from '../lib/constants'
import '../pages/PublicInvite.css'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export interface EventInfoSectionsProps {
  settings: EventSettings
  gallery: GalleryPhoto[]
}

export function EventInfoSections({ settings, gallery }: EventInfoSectionsProps) {
  return (
    <>
      <div className="public-invite-header">
        <p className="public-invite-eyebrow">Thương mời</p>
        <h1 className="public-invite-title">{settings.event_name}</h1>
      </div>

      {settings.event_datetime && (
        <div className="public-invite-section">
          <CountdownTimer eventDatetime={settings.event_datetime} />
        </div>
      )}

      {settings.cover_image_url && (
        <div className="public-invite-section">
          <div className="public-invite-photo">
            <SparkleIcon className="public-invite-photo-sparkle public-invite-photo-sparkle-1" />
            <SparkleIcon className="public-invite-photo-sparkle public-invite-photo-sparkle-2" />
            <SparkleIcon className="public-invite-photo-sparkle public-invite-photo-sparkle-3" />
            <div className="public-invite-photo-anchor">
              <div className="public-invite-photo-frame">
                <img src={settings.cover_image_url} alt={`Ảnh tốt nghiệp của ${HOST_NAME}`} />
              </div>
              <CurlyArrowIcon className="public-invite-photo-arrow public-invite-photo-arrow-name" />
              <span className="public-invite-photo-tag public-invite-photo-tag-name">
                {HOST_NAME}
              </span>
            </div>
          </div>
        </div>
      )}

      {gallery.length > 0 && (
        <div className="public-invite-section">
          <GalleryGrid photos={gallery} />
        </div>
      )}

      {(settings.venue_name || settings.event_datetime || settings.map_embed_url) && (
        <div className="public-invite-section public-invite-venue-map">
          {(settings.venue_name || settings.event_datetime) && (
            <div className="public-invite-venue-block">
              {settings.venue_name && (
                <div className="public-invite-venue-line">
                  <LocationPinIcon className="public-invite-venue-icon" />
                  <div className="public-invite-venue-text">
                    <p className="public-invite-venue">{settings.venue_name}</p>
                  </div>
                </div>
              )}
              {settings.event_datetime && (
                <p className="public-invite-address public-invite-time">
                  <span className="public-invite-time-item">
                    <ClockIcon className="public-invite-time-icon" />
                    {formatTime(settings.event_datetime)}
                  </span>
                  <span className="public-invite-time-item">
                    <CalendarIcon className="public-invite-time-icon" />
                    {formatDate(settings.event_datetime)}
                  </span>
                </p>
              )}
            </div>
          )}
          {settings.map_embed_url && <MapEmbed mapEmbedUrl={settings.map_embed_url} />}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EventInfoSections.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/EventInfoSections.tsx src/components/EventInfoSections.test.tsx
git commit -m "feat: extract EventInfoSections component from PublicInvite"
```

---

## Task 4: Refactor `PublicInvite.tsx` to use Task 2 + 3 (no behavior change)

**Files:**
- Modify: `src/pages/PublicInvite.tsx` (full rewrite of the file body)
- Test: `src/pages/PublicInvite.test.tsx` (existing — must keep passing unmodified)

- [ ] **Step 1: Run the existing test suite first to record the baseline**

Run: `npx vitest run src/pages/PublicInvite.test.tsx`
Expected: PASS (5 tests) — confirms current behavior before refactor.

- [ ] **Step 2: Replace `PublicInvite.tsx`**

```tsx
// src/pages/PublicInvite.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { useEventInfo } from '../hooks/useEventInfo'
import { EventInfoSections } from '../components/EventInfoSections'
import { EnvelopeModal } from '../components/EnvelopeModal'
import { InviteFrame } from '../components/InviteFrame'
import { MusicPlayerWidget } from '../components/MusicPlayerWidget'
import '../styles/tokens.css'
import '../styles/public-shared.css'
import './PublicInvite.css'

export function PublicInvite() {
  const { guestId } = useParams<{ guestId: string }>()
  const { settings, gallery, loading, error, reload } = useEventInfo()
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) return <p className="page-loading">Đang tải...</p>

  if (error) {
    return (
      <div className="page-error">
        <p role="alert">{error}</p>
        <button className="retry-button" type="button" onClick={reload}>
          Thử lại
        </button>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="public-invite-page">
      <InviteFrame>
        <EventInfoSections settings={settings} gallery={gallery} />

        {guestId && (
          <div className="public-invite-section public-invite-cta-section">
            <button
              type="button"
              className="public-invite-cta"
              onClick={() => setInviteOpen(true)}
            >
              Xem lời mời riêng dành cho bạn
            </button>
          </div>
        )}
      </InviteFrame>

      <MusicPlayerWidget variant="floating" />

      <AnimatePresence>
        {guestId && inviteOpen && (
          <EnvelopeModal
            guestId={guestId}
            eventSettings={settings}
            onClose={() => setInviteOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 3: Run the existing test suite again to confirm no regression**

Run: `npx vitest run src/pages/PublicInvite.test.tsx`
Expected: PASS (5 tests), identical to Step 1 — zero assertion changes needed.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PublicInvite.tsx
git commit -m "refactor: simplify PublicInvite to use useEventInfo and EventInfoSections"
```

---

## Task 5: `PublicEnvelopeModal` component

**Files:**
- Create: `src/components/PublicEnvelopeModal.tsx`
- Create: `src/components/PublicEnvelopeModal.css`
- Test: `src/components/PublicEnvelopeModal.test.tsx`

Reuses the envelope-opening animation (`env-*` classes from `EnvelopeModal.css`) but drops guest fetch, RSVP, recipient name, and the message-modal/complete flow — matching the spec's "Không có tên/xưng hô, không nút RSVP, không MessageModal" rule.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/PublicEnvelopeModal.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'
import { PublicEnvelopeModal } from './PublicEnvelopeModal'

MotionGlobalConfig.skipAnimations = true

function renderModal(
  message: string | null | undefined = 'Kính mời các bạn đến chung vui cùng mình nhé!',
  onClose = vi.fn()
) {
  return render(<PublicEnvelopeModal message={message ?? null} onClose={onClose} />)
}

describe('PublicEnvelopeModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('shows the envelope and hint text on open', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chạm để mở thư' })).toBeInTheDocument()
    expect(screen.getByText('✨ Chạm để mở thư')).toBeInTheDocument()
  })

  it('reveals the public invite message after tapping the envelope', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal('Kính mời các bạn đến chung vui cùng mình nhé!')

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))
    await vi.advanceTimersByTimeAsync(2200)

    expect(
      await screen.findByText('Kính mời các bạn đến chung vui cùng mình nhé!')
    ).toBeInTheDocument()
  })

  it('shows a placeholder when the message is empty', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal('')

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))
    await vi.advanceTimersByTimeAsync(2200)

    expect(
      await screen.findByText('Nội dung lời mời đang được cập nhật.')
    ).toBeInTheDocument()
  })

  it('does not show any RSVP button or recipient name', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))
    await vi.advanceTimersByTimeAsync(2200)

    await screen.findByText('Thư mời lễ tốt nghiệp')
    expect(screen.queryByRole('button', { name: 'Tôi sẽ tham dự' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Gửi:/)).not.toBeInTheDocument()
  })

  it('closes when Escape is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(undefined, onClose)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the X button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(undefined, onClose)

    await user.click(screen.getByRole('button', { name: 'Đóng' }))

    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PublicEnvelopeModal.test.tsx`
Expected: FAIL — `Cannot find module './PublicEnvelopeModal'`

- [ ] **Step 3: Write the CSS**

```css
/* src/components/PublicEnvelopeModal.css */
.public-envelope-card {
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-6);
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px -16px rgba(146, 46, 92, 0.4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.public-envelope-cap {
  width: 32px;
  height: 32px;
  color: #a13d6d;
}

.public-envelope-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  color: var(--color-foreground);
}

.public-envelope-message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-foreground);
  white-space: pre-line;
}

.public-envelope-close-button {
  padding: 0.6rem 1.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.public-envelope-close-button:hover {
  background: #be185d;
}
```

- [ ] **Step 4: Write the component**

```tsx
// src/components/PublicEnvelopeModal.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { GraduationCapIcon, SparkleIcon } from './icons'
import './EnvelopeModal.css'
import './PublicEnvelopeModal.css'

type EnvelopeState = 'envelope' | 'opening' | 'sliding' | 'revealed'

// Cùng nhịp mở thư với EnvelopeModal.tsx để tái dùng animation env-* nguyên vẹn.
const FLAP_OPEN_MS = 800
const REVEAL_AT_MS = 2100

export interface PublicEnvelopeModalProps {
  message: string | null
  onClose: () => void
}

export function PublicEnvelopeModal({ message, onClose }: PublicEnvelopeModalProps) {
  const reducedMotion = useReducedMotion()
  const [envelopeState, setEnvelopeState] = useState<EnvelopeState>(
    reducedMotion ? 'revealed' : 'envelope'
  )
  const overlayRef = useRef<HTMLDivElement>(null)
  const envelopeRef = useRef<HTMLButtonElement>(null)

  const handleOpen = useCallback(() => {
    if (envelopeState !== 'envelope') return
    setEnvelopeState('opening')
    setTimeout(() => setEnvelopeState('sliding'), FLAP_OPEN_MS)
    setTimeout(() => setEnvelopeState('revealed'), REVEAL_AT_MS)
  }, [envelopeState])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (envelopeState === 'envelope' && envelopeRef.current) {
      envelopeRef.current.focus()
    }
  }, [envelopeState])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <motion.div
      ref={overlayRef}
      className="envelope-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Thư mời lễ tốt nghiệp"
      onClick={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button type="button" className="envelope-close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>

      {envelopeState !== 'revealed' ? (
        <motion.div
          className="envelope-scene"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 1 }}
        >
          <button
            ref={envelopeRef}
            type="button"
            className="envelope-frame"
            data-state={envelopeState}
            onClick={handleOpen}
            aria-label="Chạm để mở thư"
          >
            <span className="env-float">
              <span className="env-3d">
                <span className="env-back" />

                <motion.span
                  className="env-letter"
                  layoutId="public-invite-letter"
                  initial={false}
                  animate={{ y: envelopeState === 'sliding' ? '-124%' : '0%' }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="env-letter-inner">
                    <GraduationCapIcon className="env-letter-cap" />
                    <span className="env-letter-title">Thư mời lễ tốt nghiệp</span>
                    <span className="env-letter-line" />
                    <span className="env-letter-line env-letter-line-short" />
                  </span>
                </motion.span>

                <span className="env-pocket env-pocket-left" />
                <span className="env-pocket env-pocket-right" />
                <span className="env-pocket env-pocket-bottom" />

                <span className="env-flap">
                  <span className="env-flap-face env-flap-face-front">
                    <span className="env-flap-paper" />
                    <span className="env-seal">
                      <GraduationCapIcon className="env-seal-icon" />
                    </span>
                  </span>
                  <span className="env-flap-face env-flap-face-back">
                    <span className="env-flap-paper" />
                  </span>
                </span>

                <SparkleIcon className="env-sparkle env-sparkle-1" />
                <SparkleIcon className="env-sparkle env-sparkle-2" />
              </span>
            </span>
          </button>

          <p
            className={`envelope-hint${envelopeState === 'envelope' ? '' : ' envelope-hint-hidden'}`}
          >
            ✨ Chạm để mở thư
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="envelope-card-wrapper"
          layoutId="public-invite-letter"
          transition={{ layout: { type: 'spring', stiffness: 200, damping: 26 } }}
        >
          <div className="public-envelope-card">
            <GraduationCapIcon className="public-envelope-cap" />
            <h2 className="public-envelope-title">Thư mời lễ tốt nghiệp</h2>
            <p className="public-envelope-message">
              {message?.trim() ? message : 'Nội dung lời mời đang được cập nhật.'}
            </p>
            <button
              type="button"
              className="public-envelope-close-button"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/PublicEnvelopeModal.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/PublicEnvelopeModal.tsx src/components/PublicEnvelopeModal.css src/components/PublicEnvelopeModal.test.tsx
git commit -m "feat: add PublicEnvelopeModal for the generic social invite"
```

---

## Task 6: `SharedInvite` page (`/chung-vui` gate + unlocked view)

**Files:**
- Create: `src/pages/SharedInvite.tsx`
- Create: `src/pages/SharedInvite.css`
- Test: `src/pages/SharedInvite.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/SharedInvite.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'
import { createQueryBuilderMock } from '../test/supabaseMock'

MotionGlobalConfig.skipAnimations = true

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabaseClient'
import { SharedInvite } from './SharedInvite'

const eventSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00:00Z',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: '',
  cover_image_url: 'https://res.cloudinary.com/demo/cover.jpg',
  public_invite_message: 'Kính mời các bạn đến chung vui cùng mình nhé!',
}

function mockLoadSuccess() {
  const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
  fromMock.mockImplementation((table: string) => {
    if (table === 'event_settings') {
      return createQueryBuilderMock({ data: eventSettings, error: null })
    }
    return createQueryBuilderMock({ data: [], error: null })
  })
  return fromMock
}

describe('SharedInvite', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('shows the password gate by default', () => {
    mockLoadSuccess()
    render(<SharedInvite />)

    expect(screen.getByPlaceholderText('Nhập mật khẩu...')).toBeInTheDocument()
    expect(screen.queryByText('Lễ tốt nghiệp')).not.toBeInTheDocument()
  })

  it('shows an error and stays on the gate when the password is wrong', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu...'), '0000')
    await user.click(screen.getByRole('button', { name: 'Mở thiệp' }))

    expect(await screen.findByText('Sai mật khẩu, vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nhập mật khẩu...')).toBeInTheDocument()
  })

  it('unlocks the shared invite when the correct password is entered', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu...'), '2307')
    await user.click(screen.getByRole('button', { name: 'Mở thiệp' }))

    expect(await screen.findByText('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Xem lời mời riêng dành cho bạn' })
    ).toBeInTheDocument()
  })

  it('opens the generic PublicEnvelopeModal from the CTA', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu...'), '2307')
    await user.click(screen.getByRole('button', { name: 'Mở thiệp' }))
    await user.click(
      await screen.findByRole('button', { name: 'Xem lời mời riêng dành cho bạn' })
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chạm để mở thư' })).toBeInTheDocument()
  })

  it('resets to the gate on a fresh mount (no persistence across reloads)', () => {
    mockLoadSuccess()
    const { unmount } = render(<SharedInvite />)
    unmount()

    render(<SharedInvite />)

    expect(screen.getByPlaceholderText('Nhập mật khẩu...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SharedInvite.test.tsx`
Expected: FAIL — `Cannot find module './SharedInvite'`

- [ ] **Step 3: Write the CSS**

```css
/* src/pages/SharedInvite.css */
.shared-invite-gate-box {
  display: flex;
  gap: var(--space-2);
  max-width: 360px;
  margin: 0 auto;
}

.shared-invite-gate-input {
  flex: 1;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--color-foreground);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-sizing: border-box;
}

.shared-invite-gate-input:focus-visible {
  outline: none;
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.25);
}

.shared-invite-gate-button {
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
}

.shared-invite-gate-button:hover {
  background: #be185d;
}

.shared-invite-gate-error {
  margin: var(--space-2) 0 0;
  font-size: 0.85rem;
  color: var(--color-destructive);
}
```

- [ ] **Step 4: Write the page component**

```tsx
// src/pages/SharedInvite.tsx
import { useState, type FormEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { useEventInfo } from '../hooks/useEventInfo'
import { EventInfoSections } from '../components/EventInfoSections'
import { PublicEnvelopeModal } from '../components/PublicEnvelopeModal'
import { InviteFrame } from '../components/InviteFrame'
import { MusicPlayerWidget } from '../components/MusicPlayerWidget'
import { SparkleIcon } from '../components/icons'
import { HOST_NAME } from '../lib/constants'
import '../styles/tokens.css'
import '../styles/public-shared.css'
import './PublicInvite.css'
import './HomePage.css'
import './SharedInvite.css'

const SHARED_INVITE_PASSWORD = '2307'

type GateState = 'gate' | 'unlocked'

export function SharedInvite() {
  const [gateState, setGateState] = useState<GateState>('gate')
  const [password, setPassword] = useState('')
  const [gateError, setGateError] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const { settings, gallery, loading, error, reload } = useEventInfo()

  function handleGateSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.trim() === SHARED_INVITE_PASSWORD) {
      setGateState('unlocked')
    } else {
      setGateError(true)
    }
  }

  if (gateState === 'gate') {
    return (
      <div className="home-page">
        <InviteFrame>
          <div className="home-hero">
            <SparkleIcon className="home-hero-sparkle home-hero-sparkle-1" />
            <SparkleIcon className="home-hero-sparkle home-hero-sparkle-2" />
            <span className="home-hero-pill home-hero-pill-happy">Happy</span>
            <h1 className="home-hero-title">Graduation</h1>
            <span className="home-hero-pill home-hero-pill-name">{HOST_NAME}</span>
          </div>

          <div className="home-message-zone">
            <p className="home-message">
              Cảm ơn vì đã là một phần rực rỡ trong những năm tháng thanh xuân của mình.
              Nhập mật khẩu để cùng mở ra tấm vé đến ngày lễ tốt nghiệp nhé!
            </p>
            <MusicPlayerWidget />
          </div>

          <form className="home-search-section" onSubmit={handleGateSubmit}>
            <p className="home-search-label">Vui lòng nhập mật khẩu❤️</p>
            <div className="shared-invite-gate-box">
              <input
                className="shared-invite-gate-input"
                type="text"
                inputMode="numeric"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setGateError(false)
                }}
              />
              <button type="submit" className="shared-invite-gate-button">
                Mở thiệp
              </button>
            </div>
            {gateError && (
              <p className="shared-invite-gate-error" role="alert">
                Sai mật khẩu, vui lòng thử lại.
              </p>
            )}
          </form>
        </InviteFrame>
      </div>
    )
  }

  if (loading) return <p className="page-loading">Đang tải...</p>

  if (error) {
    return (
      <div className="page-error">
        <p role="alert">{error}</p>
        <button className="retry-button" type="button" onClick={reload}>
          Thử lại
        </button>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="public-invite-page">
      <InviteFrame>
        <EventInfoSections settings={settings} gallery={gallery} />

        <div className="public-invite-section public-invite-cta-section">
          <button
            type="button"
            className="public-invite-cta"
            onClick={() => setInviteOpen(true)}
          >
            Xem lời mời riêng dành cho bạn
          </button>
        </div>
      </InviteFrame>

      <MusicPlayerWidget variant="floating" />

      <AnimatePresence>
        {inviteOpen && (
          <PublicEnvelopeModal
            message={settings.public_invite_message}
            onClose={() => setInviteOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/SharedInvite.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/pages/SharedInvite.tsx src/pages/SharedInvite.css src/pages/SharedInvite.test.tsx
git commit -m "feat: add SharedInvite page with password gate (/chung-vui)"
```

---

## Task 7: Wire up the `/chung-vui` route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import and route**

In `src/App.tsx`, change:

```tsx
import { HomePage } from './pages/HomePage'
import { PublicInvite } from './pages/PublicInvite'
import { GuestInvite } from './pages/GuestInvite'
```

to:

```tsx
import { HomePage } from './pages/HomePage'
import { PublicInvite } from './pages/PublicInvite'
import { SharedInvite } from './pages/SharedInvite'
import { GuestInvite } from './pages/GuestInvite'
```

And change:

```tsx
          <Route path="/" element={<HomePage />} />
          <Route path="/thiep-chung/:guestId?" element={<PublicInvite />} />
          <Route path="/thiep/:guestId" element={<GuestInvite />} />
```

to:

```tsx
          <Route path="/" element={<HomePage />} />
          <Route path="/thiep-chung/:guestId?" element={<PublicInvite />} />
          <Route path="/chung-vui" element={<SharedInvite />} />
          <Route path="/thiep/:guestId" element={<GuestInvite />} />
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS — all suites green, including the untouched `HomePage.test.tsx`, `PublicInvite.test.tsx`, `EnvelopeModal.test.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up the /chung-vui route"
```

---

## Task 8: Admin — edit the shared invite message

**Files:**
- Modify: `src/pages/admin/AdminEventSettings.tsx:76-98` (submit payload) and `:221-235` (form fields)
- Modify: `src/pages/admin/AdminEventSettings.test.tsx` (add one case)

- [ ] **Step 1: Write the failing test (append to the existing file)**

Add this test inside the existing `describe('AdminEventSettings', ...)` block in `src/pages/admin/AdminEventSettings.test.tsx`:

```tsx
  it('loads and saves the public invite message', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    const settingsBuilder = createQueryBuilderMock({
      data: { ...eventSettings, public_invite_message: 'Lời mời cũ' },
      error: null,
    })
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return settingsBuilder
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    const user = userEvent.setup()

    renderComponent()
    await screen.findByDisplayValue('Lời mời cũ')

    const textarea = screen.getByLabelText('Lời mời chung (đăng mạng xã hội)')
    await user.clear(textarea)
    await user.type(textarea, 'Lời mời mới')
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin sự kiện' }))

    await waitFor(() =>
      expect(settingsBuilder.update as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.objectContaining({ public_invite_message: 'Lời mời mới' })
      )
    )
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/AdminEventSettings.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Lời mời chung (đăng mạng xã hội)` (field doesn't exist yet).

- [ ] **Step 3: Add the field to the update payload**

In `src/pages/admin/AdminEventSettings.tsx`, change:

```tsx
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
```

to:

```tsx
    const { error } = await supabase
      .from('event_settings')
      .update({
        event_name: settings.event_name,
        event_datetime: settings.event_datetime,
        venue_name: settings.venue_name,
        venue_address: settings.venue_address,
        map_embed_url: settings.map_embed_url,
        cover_image_url: settings.cover_image_url,
        public_invite_message: settings.public_invite_message,
      })
      .eq('id', 1)
```

- [ ] **Step 4: Add the textarea to the form**

In `src/pages/admin/AdminEventSettings.tsx`, right after the "Ảnh đại diện" cover-preview block and before the `{error && (...)}` banner, i.e. change:

```tsx
        {settings.cover_image_url && (
          <img
            className="admin-cover-preview"
            src={settings.cover_image_url}
            alt="Ảnh đại diện"
            width={120}
            height={120}
          />
        )}
        {error && (
```

to:

```tsx
        {settings.cover_image_url && (
          <img
            className="admin-cover-preview"
            src={settings.cover_image_url}
            alt="Ảnh đại diện"
            width={120}
            height={120}
          />
        )}
        <label className="admin-field">
          Lời mời chung (đăng mạng xã hội)
          <textarea
            value={settings.public_invite_message ?? ''}
            onChange={(e) => updateField('public_invite_message', e.target.value)}
            rows={5}
          />
        </label>
        {error && (
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/AdminEventSettings.test.tsx`
Expected: PASS (6 tests — 5 existing + the new one)

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminEventSettings.tsx src/pages/admin/AdminEventSettings.test.tsx
git commit -m "feat(admin): add public invite message field"
```

---

## Task 9: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npx vitest run`
Expected: PASS — every suite green, no leftover `.only`/`.skip`.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: succeeds (`tsc -b` reports no errors, `vite build` completes).

- [ ] **Step 3: Manual smoke check (dev server)**

Run: `npm run dev`, then in a browser:
1. Visit `/chung-vui` → see the password gate (same layout as `/`).
2. Enter a wrong password → inline error, stays on gate.
3. Enter `2307` → see the shared invite (countdown/photo/gallery/venue map).
4. Click "Xem lời mời riêng dành cho bạn" → envelope opens, tap it → reveals the generic message with no RSVP buttons and no name.
5. Refresh the page → back to the password gate.
6. Visit `/thiep-chung/<a real guest id>` → confirm the original guest flow (RSVP, personalized envelope) still works unchanged.

