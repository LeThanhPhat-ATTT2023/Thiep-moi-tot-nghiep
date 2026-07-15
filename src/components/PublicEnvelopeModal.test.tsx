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

  it('closes when clicking the backdrop', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal(undefined, onClose)

    await user.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalled()
  })
})
