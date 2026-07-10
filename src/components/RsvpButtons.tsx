// src/components/RsvpButtons.tsx
import type { RsvpStatus } from '../types/database'
import './RsvpButtons.css'

export interface RsvpButtonsProps {
  status: RsvpStatus
  submitting: boolean
  onRespond: (status: 'attending' | 'not_attending') => void
}

export function RsvpButtons({ status, submitting, onRespond }: RsvpButtonsProps) {
  return (
    <div className="rsvp-buttons">
      <button
        type="button"
        className={`rsvp-button rsvp-button-attending${
          status === 'attending' ? ' rsvp-button-active' : ''
        }`}
        onClick={() => onRespond('attending')}
        disabled={submitting}
      >
        Tôi sẽ tham dự
      </button>
      <button
        type="button"
        className={`rsvp-button rsvp-button-declined${
          status === 'not_attending' ? ' rsvp-button-active' : ''
        }`}
        onClick={() => onRespond('not_attending')}
        disabled={submitting}
      >
        Xin phép vắng mặt
      </button>
    </div>
  )
}
