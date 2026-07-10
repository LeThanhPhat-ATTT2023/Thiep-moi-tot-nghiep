// src/components/RsvpButtons.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RsvpButtons } from './RsvpButtons'

describe('RsvpButtons', () => {
  it('calls onRespond with the chosen status', async () => {
    const onRespond = vi.fn()
    const user = userEvent.setup()

    render(<RsvpButtons status="pending" submitting={false} onRespond={onRespond} />)

    await user.click(screen.getByRole('button', { name: 'Tôi sẽ tham dự' }))
    expect(onRespond).toHaveBeenCalledWith('attending')

    await user.click(screen.getByRole('button', { name: 'Xin phép vắng mặt' }))
    expect(onRespond).toHaveBeenCalledWith('not_attending')
  })

  it('disables both buttons while submitting', () => {
    render(<RsvpButtons status="pending" submitting onRespond={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tôi sẽ tham dự' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xin phép vắng mặt' })).toBeDisabled()
  })

  it('marks the current status as active', () => {
    render(<RsvpButtons status="attending" submitting={false} onRespond={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tôi sẽ tham dự' })).toHaveClass(
      'rsvp-button-active'
    )
  })
})
