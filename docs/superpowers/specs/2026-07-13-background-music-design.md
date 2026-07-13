# Background music — design

## Goal

Add ambient background music to the site. Admin manages a playlist of YouTube
links; the guest-facing HomePage gets a music control widget (matching the
provided mockup: pink circular play/pause button with a music note, flanked
by prev/next buttons) inserted right below the "Cảm ơn vì đã..." message.
Music starts on the guest's first tap/click anywhere on the page and keeps
playing as they navigate between pages.

## Scope

- HomePage gets the visible widget now.
- PublicInvite/GuestInvite pages get **no widget yet** — a different control
  design will be provided later and wired up in a follow-up. Music itself
  still keeps playing on those pages via the global player (just uncontrolled
  there for now).
- Single admin-managed playlist (not per-guest, not per-event-row scoped
  beyond the existing singleton `event_settings` pattern).

## Data model

New table, modeled on the existing `gallery_photos` table/policy shape:

```sql
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

Migration file: `supabase/migrations/<timestamp>_add_music_tracks.sql`,
following the existing timestamped-filename convention.

`src/types/database.ts` gets a new `MusicTrack` interface:

```ts
export interface MusicTrack {
  id: string
  youtube_url: string
  sort_order: number
  created_at: string
}
```

No reordering UI — tracks append at the end (`sort_order = tracks.length` at
insert time), same as gallery photos today. No update policy — only
insert/delete, same as gallery photos.

## YouTube URL parsing

New `src/lib/youtube.ts`:

```ts
export function parseYoutubeId(url: string): string | null
```

Supports `watch?v=`, `youtu.be/`, `embed/`, and `shorts/` URL shapes, strips
extra query params (`&t=`, `&list=`, `?si=`, etc.). Returns `null` for
unparseable input. Used both in the admin form (reject invalid links before
insert, mirroring the `extractMapEmbedUrl` pattern already in
`AdminEventSettings.tsx`) and in the player (to feed `react-youtube` a bare
video ID).

## Admin UI

New "Nhạc nền" section added to `AdminEventSettings.tsx`, styled like the
existing "Album ảnh kỷ niệm" card:

- Text input + "Thêm" button to paste a YouTube link. Client-side validates
  via `parseYoutubeId`; shows an inline error and does not insert if
  unparseable.
- List of added tracks, each showing the raw URL (or a thumbnail via
  `https://img.youtube.com/vi/{id}/default.jpg`) and a delete button, mirror
  of the gallery grid's list/delete pattern.
- Loaded/saved through direct Supabase calls (`music_tracks` insert/select/
  delete), same style as the existing gallery photo handlers — no new hook
  needed.

## Playback engine

New dependency: `react-youtube` (small, typed wrapper around the YouTube
IFrame Player API). Chosen over hand-rolling the IFrame API because it
already handles script loading, player lifecycle, and cross-browser event
quirks — less custom code to maintain.

New `src/context/MusicPlayerContext.tsx`:

- `MusicPlayerProvider` — mounted once in `App.tsx`, **above/around the
  router**, so it never unmounts on client-side navigation and the audio
  keeps playing across route changes.
  - Fetches `music_tracks` ordered by `sort_order` on mount; parses each
    `youtube_url` with `parseYoutubeId`, drops unparseable rows.
  - Renders a visually-hidden (1×1px, `opacity: 0`, `position: absolute`,
    `aria-hidden`) `<YouTube>` player for the current track.
  - State: `currentIndex`, `isPlaying`.
  - **Autoplay unlock**: attaches a one-time listener
    (`{ once: true, capture: true }`) for the first `pointerdown`/`click`
    anywhere on `document`. That handler calls the player's `playVideo()` —
    running inside a real user-gesture call chain is what reliably satisfies
    browser autoplay-with-sound policies on both desktop and mobile. This
    means music starts on *any* first interaction (tapping the name search
    box, a button, etc.), not only the widget's own play button.
  - `next()` / `prev()`: advance `currentIndex` with wraparound
    (`(i + 1) % tracks.length`, `(i - 1 + tracks.length) % tracks.length`),
    swap the `<YouTube videoId>`, and keep playing into the new track.
  - `togglePlay()`: calls `playVideo()`/`pauseVideo()` based on current
    `isPlaying`.
  - Exposed via `useMusicPlayer()` hook: `{ hasTracks, isPlaying, next, prev,
    togglePlay }`.

If zero tracks are configured, `hasTracks` is `false` and no player is
rendered at all — nothing to play, nothing to unlock.

## HomePage widget

New `src/components/MusicPlayerWidget.tsx` + `.css`:

- Pill-shaped container: prev triangle button — center pink circular
  play/pause button with a music-note icon and a small pulsing "now playing"
  dot badge (visible only while `isPlaying`) — next triangle button.
- Reads `useMusicPlayer()`; returns `null` when `hasTracks` is `false` (same
  empty-state convention as `GalleryGrid`).
- New icons added to `src/components/icons.tsx`: `MusicNoteIcon` and a
  reusable triangle/chevron icon for prev/next.
- Inserted into `HomePage.tsx` immediately after the `<p className=
  "home-message">` paragraph, inside the existing `.home-message-zone`,
  filling the blank space shown in the reference screenshot.

## Testing

Following the repo's per-file `.test.tsx` convention:

- `parseYoutubeId` — unit tests for each supported URL shape and invalid
  input.
- `MusicPlayerWidget` — renders `null` with no tracks; renders the pill with
  tracks; clicking the center button calls `togglePlay`; clicking prev/next
  calls `prev`/`next`. `react-youtube`'s `<YouTube>` component will need a
  test mock (jsdom can't load a real YouTube iframe) — a lightweight mock
  module is added under the existing `src/test/` helpers, following the
  pattern of `src/test/supabaseMock.ts`.
- Admin "Nhạc nền" section — adding a valid link inserts and re-renders the
  list; an invalid link shows the error and does not insert; delete removes
  a track from the list.

## Known limitation

Some mobile Safari versions may only "unlock" audio on the very first tap
without immediately producing sound; playback can start a beat later. This
is a widely-accepted trade-off for browser-gesture-gated autoplay and not
something to special-case further.
