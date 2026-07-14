// src/hooks/useGuestInvite.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EventSettings, Guest } from '../types/database'

export interface UseGuestInviteOptions {
  guestId: string | undefined
  eventSettings?: EventSettings | null
}

export interface UseGuestInviteResult {
  guest: Guest | null
  eventSettings: EventSettings | null
  loading: boolean
  notFound: boolean
  submitting: boolean
  rsvpError: string | null
  respond: (status: 'attending' | 'not_attending' | 'maybe') => void
}

export function useGuestInvite({ guestId, eventSettings: externalSettings }: UseGuestInviteOptions): UseGuestInviteResult {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(externalSettings ?? null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState<string | null>(null)

  useEffect(() => {
    if (!guestId) return
    load(guestId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId])

  async function load(id: string) {
    setLoading(true)
    setNotFound(false)

    if (externalSettings) {
      const guestRes = await supabase.from('guests').select('*').eq('id', id).single()
      if (guestRes.error || !guestRes.data) {
        setNotFound(true)
      } else {
        setGuest(guestRes.data as Guest)
      }
    } else {
      const [guestRes, eventRes] = await Promise.all([
        supabase.from('guests').select('*').eq('id', id).single(),
        supabase.from('event_settings').select('*').eq('id', 1).single(),
      ])
      if (guestRes.error || !guestRes.data) {
        setNotFound(true)
      } else {
        setGuest(guestRes.data as Guest)
      }
      if (!eventRes.error && eventRes.data) {
        setEventSettings(eventRes.data as EventSettings)
      }
    }
    setLoading(false)
  }

  async function respond(status: 'attending' | 'not_attending' | 'maybe') {
    if (!guest) return
    const previous = guest
    setSubmitting(true)
    setRsvpError(null)
    setGuest({ ...guest, rsvp_status: status, rsvp_responded_at: new Date().toISOString() })

    const { error } = await supabase.rpc('submit_rsvp', { guest_id: guest.id, status })

    if (error) {
      setGuest(previous)
      setRsvpError('Gửi phản hồi thất bại, vui lòng thử lại.')
    }
    setSubmitting(false)
  }

  return { guest, eventSettings, loading, notFound, submitting, rsvpError, respond }
}
