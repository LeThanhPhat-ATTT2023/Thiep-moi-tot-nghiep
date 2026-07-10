// src/hooks/useAuth.test.ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

const mockedAuth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  signInWithPassword: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

describe('useAuth', () => {
  beforeEach(() => {
    mockedAuth.getSession.mockResolvedValue({ data: { session: null } })
    mockedAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('starts with loading true, then resolves session from getSession', async () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('signIn calls supabase.auth.signInWithPassword and throws on error', async () => {
    mockedAuth.signInWithPassword.mockResolvedValue({ error: { message: 'bad creds' } })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(() => result.current.signIn('a@b.com', 'wrong'))
    ).rejects.toBeTruthy()

    expect(mockedAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'wrong',
    })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockedAuth.signOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.signOut())

    expect(mockedAuth.signOut).toHaveBeenCalledTimes(1)
  })
})
