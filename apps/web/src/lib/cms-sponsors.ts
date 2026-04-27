import type { Media, Sponsor } from '@wks/shared'
import { SPONSORS } from '@/config/site'

const CMS_INTERNAL_URL: string =
  import.meta.env.CMS_INTERNAL_URL || import.meta.env.CMS_URL || 'http://localhost:3000'

const CMS_PUBLIC_URL: string =
  import.meta.env.CMS_PUBLIC_URL || import.meta.env.PUBLIC_CMS_URL || CMS_INTERNAL_URL

const FETCH_TIMEOUT_MS = 4000

export type SponsorItem = {
  name: string
  tier: 'strategiczny' | 'glowny' | 'wspierajacy'
  url: string
  logo: string
}

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_PUBLIC_URL).toString()
}

function pickLogo(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  const url = media.url ?? media.sizes?.card?.url ?? media.sizes?.thumbnail?.url ?? null
  return absolutizeCmsUrl(url)
}

function fromLocal(): SponsorItem[] {
  return SPONSORS.map((s) => ({
    name: s.name,
    tier: s.tier,
    url: s.url,
    logo: s.logo,
  }))
}

function adaptCms(doc: Sponsor): SponsorItem | null {
  const logo = pickLogo(doc.logo as Media | number | null | undefined)
  if (!logo) return null
  return {
    name: doc.name,
    tier: doc.tier as SponsorItem['tier'],
    url: doc.website ?? '',
    logo,
  }
}

export async function fetchSponsors(): Promise<SponsorItem[]> {
  const url = new URL('/api/sponsors', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '200')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: Sponsor[] }
    const docs = Array.isArray(json.docs) ? json.docs : []
    if (docs.length === 0) return fromLocal()
    const out = docs.map(adaptCms).filter((x): x is SponsorItem => Boolean(x))
    return out.length > 0 ? out : fromLocal()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Sponsorzy niedostępni (${CMS_INTERNAL_URL}): ${msg} — fallback do site.ts`)
    return fromLocal()
  }
}

