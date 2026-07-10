// src/types/database.ts
export type RsvpStatus = 'pending' | 'attending' | 'not_attending'

export interface Guest {
  id: string
  full_name: string
  salutation: string | null
  greeting_message: string | null
  rsvp_status: RsvpStatus
  rsvp_responded_at: string | null
  created_at: string
  updated_at: string
}

export interface EventSettings {
  id: number
  event_name: string | null
  event_datetime: string | null
  venue_name: string | null
  venue_address: string | null
  map_embed_url: string | null
  cover_image_url: string | null
}

export interface GalleryPhoto {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
  created_at: string
}
