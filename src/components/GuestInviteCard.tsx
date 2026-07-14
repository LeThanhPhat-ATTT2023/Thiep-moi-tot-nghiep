// src/components/GuestInviteCard.tsx
import type { EventSettings, Guest } from '../types/database'
import { InviteFrame } from './InviteFrame'
import { RsvpButtons } from './RsvpButtons'
import '../pages/GuestInvite.css'

export interface GuestInviteCardProps {
  guest: Guest
  eventSettings: EventSettings | null
  submitting: boolean
  rsvpError: string | null
  onRespond: (status: 'attending' | 'not_attending' | 'maybe') => void
}

export function GuestInviteCard({ guest, submitting, rsvpError, onRespond }: GuestInviteCardProps) {
  return (
    <InviteFrame>
      <p className="guest-invite-greeting">
        Kính mời {guest.salutation ? `${guest.salutation} ` : ''}
        {guest.full_name}
      </p>
      {guest.greeting_message && (
        <p className="guest-invite-message">{guest.greeting_message}</p>
      )}
      <p className="guest-invite-note" style={{ fontSize: '0.8rem' }}>
      Vì là ngày thường nên phòng hờ trước là mọi người sẽ bận nhìu nè.<br/> Nên xác nhận giúp chinh ở dưới để chinh sắp xếp thời gian và đợi mng tới nha.
      </p>
      <RsvpButtons status={guest.rsvp_status} submitting={submitting} onRespond={onRespond} />
      {rsvpError && (
        <p className="guest-invite-rsvp-error" role="alert">
          {rsvpError}
        </p>
      )}
    </InviteFrame>
  )
}

