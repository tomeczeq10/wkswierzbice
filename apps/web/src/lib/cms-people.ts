import type { Board as BoardDoc, Media, Staff as StaffDoc } from '@wks/shared'
import { BOARD as BOARD_LOCAL, STAFF as STAFF_LOCAL } from '@/config/site'

const CMS_INTERNAL_URL: string =
  import.meta.env.CMS_INTERNAL_URL || import.meta.env.CMS_URL || 'http://localhost:3000'

const CMS_PUBLIC_URL: string =
  import.meta.env.CMS_PUBLIC_URL || import.meta.env.PUBLIC_CMS_URL || CMS_INTERNAL_URL

const FETCH_TIMEOUT_MS = 4000

export type PersonItem = {
  name: string
  role: string
  bio?: string
  photo?: string
  highlight?: boolean
}

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_PUBLIC_URL).toString()
}

function pickPhoto(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  // Preferujemy warianty `imageSizes` (lepsza waga), ale zawsze fallback do oryginału.
  const url = media.sizes?.card?.url ?? media.sizes?.thumbnail?.url ?? media.url ?? null
  return absolutizeCmsUrl(url)
}

export async function fetchBoard(): Promise<PersonItem[]> {
  const url = new URL('/api/board', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '50')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: BoardDoc[] }
    const docs = Array.isArray(json.docs) ? json.docs : []
    if (docs.length === 0) return BOARD_LOCAL
    const out = docs.map((d) => ({
      name: d.name,
      role: d.role,
      bio: d.bio ?? undefined,
      photo: pickPhoto(d.photo as Media | number | null | undefined),
      highlight: d.highlight ?? false,
    }))
    return out
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Board niedostępny (${CMS_INTERNAL_URL}): ${msg} — fallback do site.ts`)
    return BOARD_LOCAL
  }
}

export async function fetchStaff(): Promise<PersonItem[]> {
  const url = new URL('/api/staff', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '50')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: StaffDoc[] }
    const docs = Array.isArray(json.docs) ? json.docs : []
    if (docs.length === 0) return STAFF_LOCAL
    const out = docs.map((d) => ({
      name: d.name,
      role: d.role,
      bio: d.bio ?? undefined,
      photo: pickPhoto(d.photo as Media | number | null | undefined),
    }))
    return out
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Staff niedostępny (${CMS_INTERNAL_URL}): ${msg} — fallback do site.ts`)
    return STAFF_LOCAL
  }
}

