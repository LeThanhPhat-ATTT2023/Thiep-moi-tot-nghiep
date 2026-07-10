// src/components/MapEmbed.tsx
import './MapEmbed.css'

export function MapEmbed({ mapEmbedUrl }: { mapEmbedUrl: string | null }) {
  if (!mapEmbedUrl) return null

  return (
    <iframe
      className="map-embed"
      src={mapEmbedUrl}
      title="Bản đồ vị trí sự kiện"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
