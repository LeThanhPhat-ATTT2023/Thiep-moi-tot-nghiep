// src/pages/admin/AdminGuestForm.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Guest } from '../../types/database'
import '../../styles/admin-shared.css'

const SALUTATIONS = ['Anh', 'Chị', 'Bạn', 'Thầy/Cô']

export function AdminGuestForm({
  guestId,
  onClose,
  onSaved,
}: {
  guestId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = guestId === null

  const [fullName, setFullName] = useState('')
  const [salutation, setSalutation] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew || !guestId) return
    loadGuest(guestId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId, isNew])

  async function loadGuest(id: string) {
    setLoading(true)
    const { data, error } = await supabase.from('guests').select('*').eq('id', id).single()

    if (error || !data) {
      setError('Không tìm thấy khách mời.')
    } else {
      const guest = data as Guest
      setFullName(guest.full_name)
      setSalutation(guest.salutation ?? '')
      setGreetingMessage(guest.greeting_message ?? '')
    }
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      full_name: fullName,
      salutation: salutation || null,
      greeting_message: greetingMessage || null,
    }

    const { error } = isNew
      ? await supabase.from('guests').insert(payload)
      : await supabase.from('guests').update(payload).eq('id', guestId)

    if (error) {
      setError('Lưu thất bại, vui lòng thử lại.')
      setSaving(false)
      return
    }

    onSaved()
  }

  async function handleDelete() {
    if (!guestId || isNew) return
    if (!window.confirm('Xoá khách mời này?')) return
    const { error } = await supabase.from('guests').delete().eq('id', guestId)
    if (!error) onSaved()
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>

  return (
    <form onSubmit={handleSubmit}>
      <label className="admin-field">
        Tên khách
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </label>
      <label className="admin-field">
        Danh xưng
        <input
          list="salutation-options"
          value={salutation}
          onChange={(e) => setSalutation(e.target.value)}
        />
        <datalist id="salutation-options">
          {SALUTATIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="admin-field">
        Lời chào riêng
        <textarea value={greetingMessage} onChange={(e) => setGreetingMessage(e.target.value)} />
      </label>
      {error && (
        <p className="admin-error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button className="admin-button admin-button-secondary" type="button" onClick={onClose}>
          Huỷ
        </button>
        {!isNew && (
          <button
            className="admin-button admin-button-danger"
            type="button"
            onClick={handleDelete}
          >
            Xoá
          </button>
        )}
      </div>
    </form>
  )
}
