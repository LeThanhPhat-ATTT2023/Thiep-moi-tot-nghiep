// src/components/AdminLayout.tsx
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/tokens.css'
import '../styles/admin-shared.css'
import './AdminLayout.css'

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <span className="admin-brand">Quản lý thiệp mời</span>
        <button className="admin-logout" type="button" onClick={handleLogout}>
          Đăng xuất
        </button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  )
}
