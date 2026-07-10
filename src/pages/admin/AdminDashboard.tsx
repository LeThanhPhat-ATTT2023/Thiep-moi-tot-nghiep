// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Guest } from '../../types/database'
import { AdminLayout } from '../../components/AdminLayout'
import { Modal } from '../../components/Modal'
import { AdminGuestForm } from './AdminGuestForm'
import { AdminEventSettings } from './AdminEventSettings'
import '../../styles/admin-shared.css'
import './AdminDashboard.css'

type ActiveModal = { type: 'guest'; guestId: string | null } | { type: 'event' } | null

export function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  useEffect(() => {
    loadGuests()
  }, [])

  async function loadGuests() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setError('Không tải được danh sách khách mời.')
    } else {
      setGuests((data ?? []) as Guest[])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá khách mời này?')) return
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (!error) {
      setGuests((prev) => prev.filter((g) => g.id !== id))
    }
  }

  const filtered = guests.filter((g) => g.full_name.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    total: guests.length,
    attending: guests.filter((g) => g.rsvp_status === 'attending').length,
    notAttending: guests.filter((g) => g.rsvp_status === 'not_attending').length,
    pending: guests.filter((g) => g.rsvp_status === 'pending').length,
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="admin-loading">Đang tải...</p>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <p className="admin-error-banner" role="alert">
          {error}
        </p>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1 className="admin-page-title">Danh sách khách mời</h1>

      <div className="admin-dashboard-summary">
        <span className="admin-summary-chip">Tổng số: {counts.total}</span>{' '}
        <span className="admin-summary-chip">Đã xác nhận: {counts.attending}</span>{' '}
        <span className="admin-summary-chip">Từ chối: {counts.notAttending}</span>{' '}
        <span className="admin-summary-chip">Chưa phản hồi: {counts.pending}</span>
      </div>

      <div className="admin-dashboard-actions">
        <button
          className="admin-button admin-button-secondary"
          type="button"
          onClick={() => setActiveModal({ type: 'event' })}
        >
          Sửa thông tin sự kiện
        </button>{' '}
        <button
          className="admin-button admin-button-primary"
          type="button"
          onClick={() => setActiveModal({ type: 'guest', guestId: null })}
        >
          Thêm khách mời
        </button>
      </div>

      <input
        className="admin-search-input"
        type="text"
        placeholder="Tìm theo tên..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="admin-card admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Danh xưng</th>
              <th>Trạng thái RSVP</th>
              <th>Thời điểm phản hồi</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id}>
                <td>{g.full_name}</td>
                <td>{g.salutation}</td>
                <td>
                  <span className={`admin-rsvp-badge admin-rsvp-${g.rsvp_status}`}>
                    {g.rsvp_status}
                  </span>
                </td>
                <td>{g.rsvp_responded_at ?? '-'}</td>
                <td>
                  <button
                    className="admin-button admin-button-secondary"
                    type="button"
                    onClick={() => setActiveModal({ type: 'guest', guestId: g.id })}
                  >
                    Sửa
                  </button>{' '}
                  <button
                    className="admin-button admin-button-danger"
                    type="button"
                    onClick={() => handleDelete(g.id)}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeModal?.type === 'guest' && (
        <Modal
          title={activeModal.guestId === null ? 'Thêm khách mời' : 'Sửa khách mời'}
          onClose={() => setActiveModal(null)}
        >
          <AdminGuestForm
            guestId={activeModal.guestId}
            onClose={() => setActiveModal(null)}
            onSaved={() => {
              setActiveModal(null)
              loadGuests()
            }}
          />
        </Modal>
      )}

      {activeModal?.type === 'event' && (
        <Modal title="Sửa thông tin sự kiện" onClose={() => setActiveModal(null)}>
          <AdminEventSettings />
        </Modal>
      )}
    </AdminLayout>
  )
}
