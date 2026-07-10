// src/components/GalleryGrid.tsx
import type { GalleryPhoto } from '../types/database'
import './GalleryGrid.css'

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null

  return (
    <div className="gallery-grid">
      {photos.map((photo) => (
        <img
          key={photo.id}
          src={photo.image_url}
          alt={photo.caption ?? ''}
          role="img"
          loading="lazy"
        />
      ))}
    </div>
  )
}
