// src/components/EnvelopeModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'
import { createQueryBuilderMock } from '../test/supabaseMock'

MotionGlobalConfig.skipAnimations = true

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '../lib/supabaseClient'
import { EnvelopeModal } from './EnvelopeModal'

const guest = {
  id: '2',
  full_name: 'Nguyễn Văn A',
  salutation: 'Anh',
  greeting_message: null,
  message_by_guest: null,
  rsvp_status: 'pending' as const,
  rsvp_responded_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

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

function mockGuestSuccess() {
  const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
  fromMock.mockImplementation((table: string) => {
    if (table === 'guests') {
      return createQueryBuilderMock({ data: guest, error: null })
    }
    return createQueryBuilderMock({ data: eventSettings, error: null })
  })
  return fromMock
}

function mockGuestNotFound() {
  const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>
  fromMock.mockImplementation((table: string) => {
    if (table === 'guests') {
      return createQueryBuilderMock({ data: null, error: { message: 'not found' } })
    }
    return createQueryBuilderMock({ data: eventSettings, error: null })
  })
  return fromMock
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <EnvelopeModal guestId="2" eventSettings={eventSettings} onClose={onClose} />
    </MemoryRouter>
  )
}

describe('EnvelopeModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('shows the envelope and hint text on open', async () => {
    mockGuestSuccess()
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chạm để mở thư' })).toBeInTheDocument()
    expect(screen.getByText('✨ Chạm để mở thư')).toBeInTheDocument()
  })

  it('reveals the guest card after tapping the envelope', async () => {
    mockGuestSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))

    await vi.advanceTimersByTimeAsync(2200)

    expect(await screen.findByText('Kính mời Anh Nguyễn Văn A')).toBeInTheDocument()
  })

  it('submits RSVP from within the popup', async () => {
    mockGuestSuccess()
    const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>
    rpcMock.mockResolvedValue({ data: null, error: null })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))
    await vi.advanceTimersByTimeAsync(2200)

    await screen.findByText('Kính mời Anh Nguyễn Văn A')
    await user.click(screen.getByRole('button', { name: 'Tôi sẽ tham dự' }))

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('submit_rsvp', { guest_id: '2', status: 'attending' })
    )
  })

  it('shows an error when the guest does not exist', async () => {
    mockGuestNotFound()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Chạm để mở thư' }))
    await vi.advanceTimersByTimeAsync(2200)

    expect(await screen.findByText('Không tìm thấy thiệp mời này.')).toBeInTheDocument()
  })

  it('closes the popup when Escape is pressed', async () => {
    mockGuestSuccess()
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(onClose)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('closes the popup when the X button is clicked', async () => {
    mockGuestSuccess()
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(onClose)

    await user.click(screen.getByRole('button', { name: 'Đóng' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking the backdrop', async () => {
    mockGuestSuccess()
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(onClose)

    await user.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalled()
  })
})



