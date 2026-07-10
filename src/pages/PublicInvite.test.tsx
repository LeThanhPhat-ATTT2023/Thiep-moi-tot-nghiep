// src/pages/PublicInvite.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../test/supabaseMock'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../components/NameSearchBox', () => ({
  NameSearchBox: () => <div>NameSearchBox stub</div>,
}))

import { supabase } from '../lib/supabaseClient'
import { PublicInvite } from './PublicInvite'

const eventSettings = {
  id: 1,
  event_name: 'Lễ tốt nghiệp',
  event_datetime: '2026-08-15T09:00:00Z',
  venue_name: 'Hội trường A',
  venue_address: '123 Đường ABC',
  map_embed_url: '',
  cover_image_url: 'https://res.cloudinary.com/demo/cover.jpg',
}

describe('PublicInvite', () => {
  it('loads event settings and gallery, then shows them', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })

    render(<PublicInvite />)

    expect(await screen.findByText('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(screen.getByText('Hội trường A')).toBeInTheDocument()
    expect(screen.getByAltText('Ảnh bìa lễ tốt nghiệp')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/cover.jpg'
    )
  })

  it('shows a retry button when loading fails, and reloads on click', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: null, error: { message: 'boom' } })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    const user = userEvent.setup()

    render(<PublicInvite />)

    await screen.findByText('Không tải được thông tin sự kiện.')

    fromMock.mockImplementation((table: string) => {
      if (table === 'event_settings') {
        return createQueryBuilderMock({ data: eventSettings, error: null })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    await waitFor(() => expect(screen.getByText('Lễ tốt nghiệp')).toBeInTheDocument())
  })
})
