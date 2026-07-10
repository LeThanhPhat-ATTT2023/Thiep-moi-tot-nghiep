// src/components/NameSearchBox.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()

vi.mock('../hooks/useGuestSearch')

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { useGuestSearch } from '../hooks/useGuestSearch'
import { NameSearchBox } from './NameSearchBox'

const mockedUseGuestSearch = useGuestSearch as unknown as ReturnType<typeof vi.fn>

describe('NameSearchBox', () => {
  it('shows matching suggestions and navigates to the invite page on click', async () => {
    mockedUseGuestSearch.mockReturnValue({
      search: (query: string) =>
        query === 'Trần' ? [{ id: '2', full_name: 'Trần Thị B', salutation: 'Chị' }] : [],
      loading: false,
      error: false,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NameSearchBox />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Nhập tên của bạn...'), 'Trần')
    await user.click(screen.getByRole('button', { name: 'Chị Trần Thị B' }))

    expect(navigateMock).toHaveBeenCalledWith('/thiep/2')
  })

  it('shows a not-found message when nothing matches', async () => {
    mockedUseGuestSearch.mockReturnValue({ search: () => [], loading: false, error: false })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NameSearchBox />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Nhập tên của bạn...'), 'Không Tồn Tại')

    expect(
      screen.getByText('Không tìm thấy tên, vui lòng kiểm tra lại chính tả.')
    ).toBeInTheDocument()
  })

  it('does not show a not-found message while the guest list is still loading', async () => {
    mockedUseGuestSearch.mockReturnValue({ search: () => [], loading: true, error: false })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NameSearchBox />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText('Nhập tên của bạn...'), 'Trần')

    expect(
      screen.queryByText('Không tìm thấy tên, vui lòng kiểm tra lại chính tả.')
    ).not.toBeInTheDocument()
  })

  it('shows an error message with a retry button when the guest list fails to load', async () => {
    const reloadMock = vi.fn()
    mockedUseGuestSearch.mockReturnValue({
      search: () => [],
      loading: false,
      error: true,
      reload: reloadMock,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NameSearchBox />
      </MemoryRouter>
    )

    expect(screen.getByText('Không tải được danh sách khách mời.')).toBeInTheDocument()
    expect(
      screen.queryByText('Không tìm thấy tên, vui lòng kiểm tra lại chính tả.')
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
