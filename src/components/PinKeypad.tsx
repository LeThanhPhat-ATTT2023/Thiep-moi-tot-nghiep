// src/components/PinKeypad.tsx
import { useEffect } from 'react'
import './PinKeypad.css'

export interface PinKeypadProps {
  value: string
  maxLength: number
  onChange: (value: string) => void
  shake?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinKeypad({ value, maxLength, onChange, shake = false }: PinKeypadProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key >= '0' && e.key <= '9') {
        if (value.length < maxLength) onChange(value + e.key)
      } else if (e.key === 'Backspace') {
        if (value.length > 0) onChange(value.slice(0, -1))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [value, maxLength, onChange])

  function pressDigit(digit: string) {
    if (value.length < maxLength) onChange(value + digit)
  }

  function pressBackspace() {
    if (value.length === 0) return
    onChange(value.slice(0, -1))
  }

  return (
    <div className="pin-keypad">
      <div className={`pin-keypad-dots${shake ? ' pin-keypad-dots-shake' : ''}`}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={`pin-keypad-dot${i < value.length ? ' pin-keypad-dot-filled' : ''}`}
          />
        ))}
      </div>
      <div className="pin-keypad-grid">
        {KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-keypad-key"
            onClick={() => pressDigit(digit)}
          >
            {digit}
          </button>
        ))}
        <span className="pin-keypad-key pin-keypad-key-spacer" aria-hidden="true" />
        <button type="button" className="pin-keypad-key" onClick={() => pressDigit('0')}>
          0
        </button>
        <button
          type="button"
          className="pin-keypad-key"
          onClick={pressBackspace}
          aria-label="Xoá"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
