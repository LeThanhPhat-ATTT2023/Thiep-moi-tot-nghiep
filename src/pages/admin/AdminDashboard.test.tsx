// src/pages/admin/AdminDashboard.test.tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createQueryBuilderMock } from '../../test/supabaseMock'
import type { Guest } from '../../types/database'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../../lib/cloudinary', () => ({
  uploadImage: vi.fn(),
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

function mockGuestsOnly() {
  const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
  fromMock.mockReturnValue(createQueryBuilderMock({ data: guests, error: null }))
  return fromMock
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  )
}

describe('AdminDashboard', () => {
  it('loads guests and shows the list with summary counts', async () => {
    mockGuestsOnly()

    renderDashboard()

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.getByText('Tổng số: 2')).toBeInTheDocument()
    expect(screen.getByText('Đã xác nhận: 1')).toBeInTheDocument()
  })

  it('filters guests by the search box', async () => {
    mockGuestsOnly()
    const user = userEvent.setup()

    renderDashboard()

    await screen.findByText('Nguyễn Văn A')
    await user.type(screen.getByPlaceholderText('Tìm theo tên...'), 'Trần')

    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText('Không tải được danh sách khách mời.')).toBeInTheDocument()
    )
  })

  it('opens the add-guest modal as a popup when "Thêm khách mời" is clicked', async () => {
    mockGuestsOnly()
    const user = userEvent.setup()

    renderDashboard()

    await screen.findByText('Nguyễn Văn A')
    await user.click(screen.getByRole('button', { name: 'Thêm khách mời' }))

    expect(screen.getByRole('dialog', { name: 'Thêm khách mời' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên khách')).toHaveValue('')
  })

  it('opens the edit-guest modal pre-filled when a row Sửa button is clicked', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    // First call is the dashboard's initial guest list load; every call after
    // that is the modal's single-guest lookup by id when "Sửa" is clicked.
    fromMock
      .mockImplementationOnce(() => createQueryBuilderMock({ data: guests, error: null }))
      .mockImplementation(() => createQueryBuilderMock({ data: guests[0], error: null }))
    const user = userEvent.setup()

    renderDashboard()

    await screen.findByText('Nguyễn Văn A')
    const row = screen.getByText('Nguyễn Văn A').closest('tr')
    if (!row) throw new Error('row not found')
    await user.click(within(row).getByRole('button', { name: 'Sửa' }))

    expect(await screen.findByRole('dialog', { name: 'Sửa khách mời' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeInTheDocument()
  })

  it('opens the event settings modal when "Sửa thông tin sự kiện" is clicked', async () => {
    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockImplementation((table: string) => {
      if (table === 'guests') return createQueryBuilderMock({ data: guests, error: null })
      if (table === 'event_settings') {
        return createQueryBuilderMock({
          data: {
            id: 1,
            event_name: 'Lễ tốt nghiệp',
            event_datetime: null,
            venue_name: '',
            venue_address: '',
            map_embed_url: '',
            cover_image_url: null,
          },
          error: null,
        })
      }
      return createQueryBuilderMock({ data: [], error: null })
    })
    const user = userEvent.setup()

    renderDashboard()

    await screen.findByText('Nguyễn Văn A')
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin sự kiện' }))

    expect(
      await screen.findByRole('dialog', { name: 'Sửa thông tin sự kiện' })
    ).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Lễ tốt nghiệp')).toBeInTheDocument()
  })
})
