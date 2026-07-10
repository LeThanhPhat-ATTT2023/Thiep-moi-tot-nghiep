// src/components/NameSearchBox.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuestSearch } from '../hooks/useGuestSearch'
import './NameSearchBox.css'

export function NameSearchBox() {
  const { search, loading, error, reload } = useGuestSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const results = loading || error ? [] : search(query)
  const showEmptyMessage = !loading && !error && query.trim().length > 0 && results.length === 0

  return (
    <div className="name-search-box">
      <input
        className="name-search-input"
        type="text"
        placeholder="Nhập tên của bạn..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <p className="name-search-error" role="alert">
          Không tải được danh sách khách mời.{' '}
          <button type="button" onClick={reload}>
            Thử lại
          </button>
        </p>
      )}
      {results.length > 0 && (
        <ul className="name-search-results">
          {results.map((guest) => (
            <li key={guest.id}>
              <button type="button" onClick={() => navigate(`/thiep/${guest.id}`)}>
                {guest.salutation ? `${guest.salutation} ` : ''}
                {guest.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showEmptyMessage && (
        <p className="name-search-empty">Không tìm thấy tên, vui lòng kiểm tra lại chính tả.</p>
      )}
    </div>
  )
}
