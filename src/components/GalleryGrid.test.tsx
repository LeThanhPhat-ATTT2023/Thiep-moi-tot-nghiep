// src/components/GalleryGrid.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GalleryGrid } from './GalleryGrid'
import type { GalleryPhoto } from '../types/database'

const photos: GalleryPhoto[] = [
  {
    id: '1',
    image_url: 'https://example.com/a.jpg',
    caption: 'Ảnh 1',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    image_url: 'https://example.com/b.jpg',
    caption: null,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('GalleryGrid', () => {
  it('renders an image per photo', () => {
    render(<GalleryGrid photos={photos} />)
    expect(screen.getByAltText('Ảnh 1')).toHaveAttribute('src', 'https://example.com/a.jpg')
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('renders nothing when there are no photos', () => {
    const { container } = render(<GalleryGrid photos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
