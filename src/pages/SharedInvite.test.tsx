// src/pages/SharedInvite.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
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

async function enterPin(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits) {
    await user.click(screen.getByRole('button', { name: digit }))
  }
}

describe('SharedInvite', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('shows the password gate keypad by default', () => {
    mockLoadSuccess()
    render(<SharedInvite />)

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.queryByText('Lễ tốt nghiệp')).not.toBeInTheDocument()
  })

  it('shows an error, clears the pin after a wrong attempt, and unlocks on a correct retry', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await enterPin(user, '0000')
    expect(await screen.findByText('Sai mật khẩu, vui lòng thử lại.')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(600)
    await waitFor(() =>
      expect(screen.queryByText('Sai mật khẩu, vui lòng thử lại.')).not.toBeInTheDocument()
    )

    await enterPin(user, '2307')
    expect(await screen.findByText('Lễ tốt nghiệp')).toBeInTheDocument()
  })

  it('unlocks the shared invite when the correct 4 digits are entered', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await enterPin(user, '2307')

    expect(await screen.findByText('Lễ tốt nghiệp')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Xem lời mời riêng dành cho bạn' })
    ).toBeInTheDocument()
  })

  it('unlocks when the correct digits are typed on a physical keyboard', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await user.keyboard('2307')

    expect(await screen.findByText('Lễ tốt nghiệp')).toBeInTheDocument()
  })

  it('opens the generic PublicEnvelopeModal from the CTA and shows the real fetched message', async () => {
    mockLoadSuccess()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SharedInvite />)

    await enterPin(user, '2307')
    await user.click(
      await screen.findByRole('button', { name: 'Xem lời mời riêng dành cho bạn' })
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    const envelopeButton = screen.getByRole('button', { name: 'Chạm để mở thư' })
    expect(envelopeButton).toBeInTheDocument()

    await user.click(envelopeButton)
    await vi.advanceTimersByTimeAsync(2200)

    expect(await screen.findByText(eventSettings.public_invite_message)).toBeInTheDocument()
  })

  it('resets to the gate on a fresh mount (no persistence across reloads)', () => {
    mockLoadSuccess()
    const { unmount } = render(<SharedInvite />)
    unmount()

    render(<SharedInvite />)

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
  })
})
