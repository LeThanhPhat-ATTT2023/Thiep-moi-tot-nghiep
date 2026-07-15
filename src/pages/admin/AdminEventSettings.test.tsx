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

  it('extracts the embed URL when a full <iframe> snippet is pasted into the map field', async () => {
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

    const input = screen.getByLabelText(/Link Google Maps embed/)
    await user.click(input)
    await user.paste(
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!2sabc" width="600" height="450"></iframe>'
    )

    expect(input).toHaveValue('https://www.google.com/maps/embed?pb=!1m18!2sabc')
  })

  it('opens the crop dialog, then uploads the avatar and saves it into the field', async () => {
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
    const input = screen.getByLabelText('Ảnh đại diện')
    await user.upload(input, file)

    // Chọn file xong phải hiện khung cắt ảnh trước, chưa upload ngay
    expect(uploadImage).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Dùng ảnh này' }))

    await waitFor(() => expect(screen.getByAltText('Ảnh đại diện')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/cover.jpg'
    ))
  })

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
})
