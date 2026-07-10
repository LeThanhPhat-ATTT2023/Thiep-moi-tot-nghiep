// src/hooks/useGuestSearch.ts
import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { supabase } from '../lib/supabaseClient'
import { normalizeVietnamese } from '../lib/textSearch'

export interface GuestSummary {
  id: string
  full_name: string
  salutation: string | null
}

interface SearchableGuest extends GuestSummary {
  normalized: string
}

export function useGuestSearch() {
  const [guests, setGuests] = useState<GuestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(false)
    const { data, error: loadError } = await supabase
      .from('guests')
      .select('id, full_name, salutation')
    if (loadError || !data) {
      setError(true)
    } else {
      setGuests(data as GuestSummary[])
    }
    setLoading(false)
  }

  const searchable: SearchableGuest[] = useMemo(
    () => guests.map((guest) => ({ ...guest, normalized: normalizeVietnamese(guest.full_name) })),
    [guests]
  )

  const fuse = useMemo(() => new Fuse(searchable, { keys: ['normalized'], threshold: 0.4 }), [searchable])

  function search(query: string): GuestSummary[] {
    if (!query.trim()) return []
    return fuse
      .search(normalizeVietnamese(query))
      .slice(0, 5)
      .map(({ item }) => ({ id: item.id, full_name: item.full_name, salutation: item.salutation }))
  }

  return { search, loading, error, reload: load }
}
