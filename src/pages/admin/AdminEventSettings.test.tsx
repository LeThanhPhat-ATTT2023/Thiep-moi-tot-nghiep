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

// Supabase returns timestamptz columns as offset-bearing ISO strings, not the
// bare local-time format <input type="datetime-local"> expects. Using a
// realistic shape here catches the load/save conversion the component does.
const eventSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00:00+00:00',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: '',
  cover_image_url: null,
}

function renderComponent() {
  return render(<AdminEventSettings />)
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

    renderComponent()

    expect(await screen.findByDisplayValue('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hội trường A')).toBeInTheDocument()
    // vitest.config.ts pins TZ=UTC, so the offset-bearing fixture above must
    // render as this exact local-naive datetime-local value.
    expect(screen.getByDisplayValue('2026-08-15T09:00')).toBeInTheDocument()
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

    renderComponent()
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
