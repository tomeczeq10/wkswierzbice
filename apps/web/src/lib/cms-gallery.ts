import { GALLERY } from '@/config/site'
import type { Gallery as GalleryDoc, Media } from '@wks/shared'

const CMS_URL: string =
  import.meta.env.CMS_URL || import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 2500

export type GalleryItem = {
  src: string
  alt: string
  caption?: string
}

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_URL).toString()
}

function pickGallerySrc(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  const url =
    media.sizes?.card?.url ??
    media.sizes?.thumbnail?.url ??
    media.url ??
    null
  return absolutizeCmsUrl(url)
}

function adaptCmsGallery(doc: GalleryDoc): GalleryItem | null {
  const src = pickGallerySrc(doc.image as Media | number | null | undefined)
  if (!src) return null
  return {
    src,
    alt: doc.alt,
    caption: doc.caption ?? undefined,
  }
}

async function fetchGalleryFromCms(): Promise<GalleryDoc[] | null> {
  const url = new URL('/api/gallery', CMS_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '500')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: GalleryDoc[] }
    return Array.isArray(json.docs) ? json.docs : []
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Galeria niedostępna (${CMS_URL}): ${msg} — fallback do site.ts`)
    return null
  }
}

function galleryFromSite(): GalleryItem[] {
  return GALLERY.map((g) => ({ src: g.src, alt: g.alt }))
}

/**
 * Zdjęcia na /galeria: jeśli w CMS są rekordy `gallery`, używamy wyłącznie ich
 * (źródło prawdy). W przeciwnym razie — `GALLERY` z `site.ts` (placeholdery).
 */
export async function fetchGalleryList(): Promise<GalleryItem[]> {
  const docs = await fetchGalleryFromCms()
  if (docs === null) return galleryFromSite()
  if (docs.length === 0) return galleryFromSite()

  const out: GalleryItem[] = []
  for (const d of docs) {
    const item = adaptCmsGallery(d)
    if (item) out.push(item)
  }
  return out.length > 0 ? out : galleryFromSite()
}
