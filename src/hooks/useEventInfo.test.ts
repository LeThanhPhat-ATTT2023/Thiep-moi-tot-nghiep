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
