// src/pages/admin/AdminLogin.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: signInMock }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { AdminLogin } from './AdminLogin'

describe('AdminLogin', () => {
  it('signs in and navigates to /admin on success', async () => {
    signInMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminLogin />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(signInMock).toHaveBeenCalledWith('admin@example.com', 'secret123')
    expect(navigateMock).toHaveBeenCalledWith('/admin')
  })

  it('shows an error message when sign-in fails', async () => {
    signInMock.mockRejectedValue(new Error('bad creds'))
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminLogin />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Đăng nhập thất bại')
  })
})
