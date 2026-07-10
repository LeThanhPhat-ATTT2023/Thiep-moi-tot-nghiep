// src/components/RequireAuth.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/useAuth')

import { useAuth } from '../hooks/useAuth'
import { RequireAuth } from './RequireAuth'

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin/login" element={<p>Login page</p>} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <p>Protected content</p>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  it('shows a loading state while auth is resolving', () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: true })
    renderWithRouter()
    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('redirects to /admin/login when there is no session', () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false })
    renderWithRouter()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children when a session exists', () => {
    mockedUseAuth.mockReturnValue({ session: { user: { id: '1' } }, loading: false })
    renderWithRouter()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
