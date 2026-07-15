// src/hooks/useEventInfo.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EventSettings, GalleryPhoto } from '../types/database'

export function useEventInfo() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [gallery, setGallery] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const [settingsRes, galleryRes] = await Promise.all([
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('gallery_photos').select('*').order('sort_order', { ascending: true }),
    ])

    if (settingsRes.error) {
      setError('Không tải được thông tin sự kiện.')
    } else {
      setSettings(settingsRes.data as EventSettings)
    }
    if (!galleryRes.error && galleryRes.data) {
      setGallery(galleryRes.data as GalleryPhoto[])
    }
    setLoading(false)
  }

  return { settings, gallery, loading, error, reload: load }
}
