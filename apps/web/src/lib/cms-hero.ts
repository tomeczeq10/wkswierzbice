import type { HeroSlide, Media } from '@wks/shared'
import { HERO_SLIDES } from '@/config/site'

const CMS_URL: string =
  import.meta.env.CMS_URL || import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 4000

export type HeroSlideItem = {
  image: string
  kicker?: string
  title?: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
}

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_URL).toString()
}

function pickImage(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  const url = media.sizes?.hero?.url ?? media.sizes?.card?.url ?? media.url ?? null
  return absolutizeCmsUrl(url)
}

function fromLocal(): HeroSlideItem[] {
  return HERO_SLIDES.map((s) => ({
    image: s.image,
    kicker: s.kicker,
    title: s.title,
    subtitle: s.subtitle,
  }))
}

function adapt(doc: HeroSlide): HeroSlideItem | null {
  const image = pickImage(doc.image as Media | number | null | undefined)
  if (!image) return null
  return {
    image,
    kicker: doc.kicker ?? undefined,
    title: doc.title ?? undefined,
    subtitle: doc.subtitle ?? undefined,
    ctaLabel: doc.ctaLabel ?? undefined,
    ctaHref: doc.ctaHref ?? undefined,
  }
}

export async function fetchHeroSlides(): Promise<HeroSlideItem[]> {
  const url = new URL('/api/heroSlides', CMS_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '50')
  url.searchParams.set('sort', 'order')
  url.searchParams.set('where[active][equals]', 'true')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: HeroSlide[] }
    const docs = Array.isArray(json.docs) ? json.docs : []
    if (docs.length === 0) return fromLocal()
    const out = docs.map(adapt).filter((x): x is HeroSlideItem => Boolean(x))
    return out.length > 0 ? out : fromLocal()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] HeroSlides niedostępne (${CMS_URL}): ${msg} — fallback do site.ts`)
    return fromLocal()
  }
}

