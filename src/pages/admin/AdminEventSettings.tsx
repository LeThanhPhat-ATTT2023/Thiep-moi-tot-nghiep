// src/pages/admin/AdminEventSettings.tsx
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadImage } from '../../lib/cloudinary'
import type { EventSettings, GalleryPhoto } from '../../types/database'
import '../../styles/admin-shared.css'
import './AdminEventSettings.css'

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function AdminEventSettings() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [gallery, setGallery] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [settingsRes, galleryRes] = await Promise.all([
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('gallery_photos').select('*').order('sort_order', { ascending: true }),
    ])

    if (!settingsRes.error && settingsRes.data) {
      setSettings(settingsRes.data as EventSettings)
    }
    if (!galleryRes.error && galleryRes.data) {
      setGallery(galleryRes.data as GalleryPhoto[])
    }
    setLoading(false)
  }

  function updateField<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('event_settings')
      .update({
        event_name: settings.event_name,
        event_datetime: settings.event_datetime,
        venue_name: settings.venue_name,
        venue_address: settings.venue_address,
        map_embed_url: settings.map_embed_url,
        cover_image_url: settings.cover_image_url,
      })
      .eq('id', 1)

    if (error) {
      setError('Lưu thất bại, vui lòng thử lại.')
    }
    setSaving(false)
  }

  async function handleCoverUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(file)
      updateField('cover_image_url', url)
    } catch {
      setError('Tải ảnh bìa thất bại.')
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleGalleryUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingGallery(true)
    try {
      const url = await uploadImage(file)
      const { data, error } = await supabase
        .from('gallery_photos')
        .insert({ image_url: url, sort_order: gallery.length })
        .select()
        .single()

      if (!error && data) {
        setGallery((prev) => [...prev, data as GalleryPhoto])
      }
    } catch {
      setError('Tải ảnh kỷ niệm thất bại.')
    } finally {
      setUploadingGallery(false)
    }
  }

  async function handleGalleryDelete(id: string) {
    const { error } = await supabase.from('gallery_photos').delete().eq('id', id)
    if (!error) {
      setGallery((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (loading || !settings) {
    return <p className="admin-loading">Đang tải...</p>
  }

  return (
    <>
      <form className="admin-card" onSubmit={handleSubmit}>
        <label className="admin-field">
          Tên lễ
          <input
            value={settings.event_name ?? ''}
            onChange={(e) => updateField('event_name', e.target.value)}
          />
        </label>
        <label className="admin-field">
          Ngày giờ
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(settings.event_datetime)}
            onChange={(e) =>
              updateField('event_datetime', fromDatetimeLocalValue(e.target.value))
            }
          />
        </label>
        <label className="admin-field">
          Tên địa điểm
          <input
            value={settings.venue_name ?? ''}
            onChange={(e) => updateField('venue_name', e.target.value)}
          />
        </label>
        <label className="admin-field">
          Địa chỉ
          <input
            value={settings.venue_address ?? ''}
            onChange={(e) => updateField('venue_address', e.target.value)}
          />
        </label>
        <label className="admin-field">
          Link Google Maps embed
          <input
            value={settings.map_embed_url ?? ''}
            onChange={(e) => updateField('map_embed_url', e.target.value)}
          />
        </label>
        <label className="admin-field">
          Ảnh bìa
          <input type="file" accept="image/*" onChange={handleCoverUpload} />
        </label>
        {uploadingCover && <p className="admin-upload-status">Đang tải ảnh bìa...</p>}
        {settings.cover_image_url && (
          <img
            className="admin-cover-preview"
            src={settings.cover_image_url}
            alt="Ảnh bìa"
            width={200}
          />
        )}
        {error && (
          <p className="admin-error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="admin-form-actions">
          <button className="admin-button admin-button-primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thông tin sự kiện'}
          </button>
        </div>
      </form>

      <h2 className="admin-section-title">Album ảnh kỷ niệm</h2>
      <div className="admin-card">
        <label className="admin-field">
          Thêm ảnh
          <input type="file" accept="image/*" onChange={handleGalleryUpload} />
        </label>
        {uploadingGallery && <p className="admin-upload-status">Đang tải ảnh...</p>}
        <ul className="admin-gallery-grid">
          {gallery.map((photo) => (
            <li key={photo.id} className="admin-gallery-item">
              <img src={photo.image_url} alt={photo.caption ?? ''} width={120} />
              <button
                className="admin-button admin-button-danger"
                onClick={() => handleGalleryDelete(photo.id)}
              >
                Xoá
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
