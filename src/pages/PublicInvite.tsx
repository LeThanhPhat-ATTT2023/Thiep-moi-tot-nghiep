// src/pages/PublicInvite.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EventSettings, GalleryPhoto } from '../types/database'
import { CountdownTimer } from '../components/CountdownTimer'
import { MapEmbed } from '../components/MapEmbed'
import { GalleryGrid } from '../components/GalleryGrid'
import { NameSearchBox } from '../components/NameSearchBox'
import '../styles/tokens.css'
import '../styles/public-shared.css'
import './PublicInvite.css'

export function PublicInvite() {
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

  if (loading) return <p className="page-loading">Đang tải...</p>

  if (error) {
    return (
      <div className="page-error">
        <p role="alert">{error}</p>
        <button className="retry-button" type="button" onClick={load}>
          Thử lại
        </button>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="public-invite-page">
      {settings.cover_image_url && (
        <img
          className="public-invite-cover"
          src={settings.cover_image_url}
          alt="Ảnh bìa lễ tốt nghiệp"
        />
      )}
      <h1 className="public-invite-title">{settings.event_name}</h1>
      <CountdownTimer eventDatetime={settings.event_datetime} />
      <p className="public-invite-venue">{settings.venue_name}</p>
      <p className="public-invite-address">{settings.venue_address}</p>
      <MapEmbed mapEmbedUrl={settings.map_embed_url} />
      <GalleryGrid photos={gallery} />
      <NameSearchBox />
    </div>
  )
}
