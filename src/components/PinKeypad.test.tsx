// src/components/PinKeypad.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PinKeypad } from './PinKeypad'

function renderKeypad(value = '') {
  const onChange = vi.fn()
  render(<PinKeypad value={value} maxLength={4} onChange={onChange} />)
  return onChange
}

describe('PinKeypad', () => {
  it('renders filled dots matching the current value length', () => {
    const { container } = render(<PinKeypad value="23" maxLength={4} onChange={vi.fn()} />)
    expect(container.querySelectorAll('.pin-keypad-dot-filled')).toHaveLength(2)
  })

  it('calls onChange with the digit appended when a number key is clicked', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('23')

    await user.click(screen.getByRole('button', { name: '0' }))

    expect(onChange).toHaveBeenCalledWith('230')
  })

  it('calls onChange with the last digit removed when the backspace key is clicked', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('230')

    await user.click(screen.getByRole('button', { name: 'Xoá' }))

    expect(onChange).toHaveBeenCalledWith('23')
  })

  it('does not call onChange when a digit is clicked at maxLength', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('2307')

    await user.click(screen.getByRole('button', { name: '1' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not call onChange when backspace is clicked on an empty value', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('')

    await user.click(screen.getByRole('button', { name: 'Xoá' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('appends a digit when the matching physical keyboard key is pressed', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('2')

    await user.keyboard('3')

    expect(onChange).toHaveBeenCalledWith('23')
  })

  it('removes the last digit when the physical Backspace key is pressed', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('23')

    await user.keyboard('{Backspace}')

    expect(onChange).toHaveBeenCalledWith('2')
  })

  it('ignores digit keys held with Ctrl', async () => {
    const user = userEvent.setup()
    const onChange = renderKeypad('2')

    await user.keyboard('{Control>}3{/Control}')

    expect(onChange).not.toHaveBeenCalled()
  })
})
