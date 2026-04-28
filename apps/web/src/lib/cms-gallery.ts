import { GALLERY } from '@/config/site'
import type { Gallery as GalleryDoc, GalleryAlbum, Media } from '@wks/shared'

const CMS_INTERNAL_URL: string =
  process.env.CMS_INTERNAL_URL ||
  process.env.CMS_URL ||
  import.meta.env.CMS_INTERNAL_URL ||
  import.meta.env.CMS_URL ||
  'http://localhost:3000'

const CMS_PUBLIC_URL: string =
  process.env.CMS_PUBLIC_URL ||
  process.env.PUBLIC_CMS_URL ||
  import.meta.env.CMS_PUBLIC_URL ||
  import.meta.env.PUBLIC_CMS_URL ||
  CMS_INTERNAL_URL

const FETCH_TIMEOUT_MS = 2500

export type GalleryItem = {
  src: string
  alt: string
  caption?: string
}

export type GalleryAlbumCard = {
  slug: string
  title: string
  description?: string
  eventDate?: string
  coverSrc?: string
  photoCount: number
}

export type GalleryIndexMode =
  | { kind: 'site-fallback'; items: GalleryItem[] }
  | { kind: 'flat-cms'; items: GalleryItem[] }
  | { kind: 'albums'; albums: GalleryAlbumCard[]; orphanCount: number }

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_PUBLIC_URL).toString()
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

function albumIdFromDoc(doc: GalleryDoc): number | null {
  const a = doc.album
  if (a == null) return null
  if (typeof a === 'number') return a
  if (typeof a === 'object' && 'id' in a && typeof a.id === 'number') return a.id
  return null
}

export async function fetchGalleryDocs(): Promise<GalleryDoc[] | null> {
  const url = new URL('/api/gallery', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '500')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: GalleryDoc[] }
    return Array.isArray(json.docs) ? json.docs : []
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Galeria niedostępna (${CMS_INTERNAL_URL}): ${msg} — fallback do site.ts`)
    return null
  }
}

export async function fetchGalleryAlbumDocs(): Promise<GalleryAlbum[] | null> {
  const url = new URL('/api/gallery-albums', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '200')
  url.searchParams.set('sort', 'order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: GalleryAlbum[] }
    return Array.isArray(json.docs) ? json.docs : []
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Albumy galerii niedostępne: ${msg}`)
    return null
  }
}

function sortAlbums(a: GalleryAlbum, b: GalleryAlbum): number {
  const ta = a.eventDate ? new Date(a.eventDate).getTime() : 0
  const tb = b.eventDate ? new Date(b.eventDate).getTime() : 0
  if (tb !== ta) return tb - ta
  return (a.order ?? 0) - (b.order ?? 0)
}

function galleryItemsForAlbumId(docs: GalleryDoc[], albumId: number): GalleryItem[] {
  const out: GalleryItem[] = []
  for (const d of docs) {
    if (albumIdFromDoc(d) !== albumId) continue
    const item = adaptCmsGallery(d)
    if (item) out.push(item)
  }
  return out
}

function buildAlbumCards(albums: GalleryAlbum[], docs: GalleryDoc[]): GalleryAlbumCard[] {
  const sorted = [...albums].sort(sortAlbums)
  const cards: GalleryAlbumCard[] = []
  for (const al of sorted) {
    const slug = (al.slug ?? '').trim()
    if (!slug) continue
    const inAlbum = galleryItemsForAlbumId(docs, al.id)
    const coverFromUpload = pickGallerySrc(al.cover as Media | number | null | undefined)
    const coverSrc = coverFromUpload ?? inAlbum[0]?.src
    cards.push({
      slug,
      title: al.title,
      description: al.description ?? undefined,
      eventDate: al.eventDate ?? undefined,
      coverSrc,
      photoCount: inAlbum.length,
    })
  }
  return cards
}

function countOrphans(docs: GalleryDoc[]): number {
  let n = 0
  for (const d of docs) {
    if (albumIdFromDoc(d) != null) continue
    if (adaptCmsGallery(d)) n++
  }
  return n
}

function galleryFromSite(): GalleryItem[] {
  // Placeholdery z `site.ts` bywają mylące na dev/prod — jeśli CMS nie ma zdjęć,
  // wolimy pokazać pusty stan zamiast sztucznych kafelków.
  void GALLERY
  return []
}

/**
 * Tryb strony /galeria: albumy z CMS, płaska lista (CMS bez albumów), albo placeholdery z site.ts.
 */
export async function fetchGalleryIndex(): Promise<GalleryIndexMode> {
  const [docs, albumDocs] = await Promise.all([fetchGalleryDocs(), fetchGalleryAlbumDocs()])

  if (docs === null) {
    return { kind: 'site-fallback', items: galleryFromSite() }
  }

  if (docs.length === 0) {
    return { kind: 'site-fallback', items: galleryFromSite() }
  }

  const albums = albumDocs === null ? [] : albumDocs
  if (albums.length === 0) {
    const items: GalleryItem[] = []
    for (const d of docs) {
      const item = adaptCmsGallery(d)
      if (item) items.push(item)
    }
    return { kind: 'flat-cms', items: items.length > 0 ? items : galleryFromSite() }
  }

  const cards = buildAlbumCards(albums, docs).filter((c) => c.photoCount > 0)
  const orphanCount = countOrphans(docs)
  return { kind: 'albums', albums: cards, orphanCount }
}

/**
 * Zdjęcia w jednym albumie (slug z CMS). Pustą tablicę jeśli brak albumu lub brak zdjęć.
 */
export async function fetchGalleryByAlbumSlug(slug: string): Promise<{
  album: GalleryAlbum | null
  items: GalleryItem[]
} | null> {
  const url = new URL('/api/gallery-albums', CMS_INTERNAL_URL)
  url.searchParams.set('where[slug][equals]', slug)
  url.searchParams.set('limit', '1')
  url.searchParams.set('depth', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: GalleryAlbum[] }
    const found = json.docs?.[0]
    if (!found) return { album: null, items: [] }

    const all = await fetchGalleryDocs()
    if (!all) return null
    const items = galleryItemsForAlbumId(all, found.id)
    return { album: found, items }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Album galerii "${slug}": ${msg}`)
    return null
  }
}

/** Zdjęcia bez przypisanego albumu (CMS). */
export async function fetchGalleryOrphans(): Promise<GalleryItem[] | null> {
  const docs = await fetchGalleryDocs()
  if (docs === null) return null
  const out: GalleryItem[] = []
  for (const d of docs) {
    if (albumIdFromDoc(d) != null) continue
    const item = adaptCmsGallery(d)
    if (item) out.push(item)
  }
  return out
}

/**
 * @deprecated Użyj {@link fetchGalleryIndex} albo {@link fetchGalleryByAlbumSlug}.
 * Zachowane dla kompatybilności: jedna płaska lista (albumy ignorowane).
 */
export async function fetchGalleryList(): Promise<GalleryItem[]> {
  const mode = await fetchGalleryIndex()
  if (mode.kind === 'site-fallback' || mode.kind === 'flat-cms') return mode.items
  const all = await fetchGalleryDocs()
  if (!all) return galleryFromSite()
  const items: GalleryItem[] = []
  for (const d of all) {
    const item = adaptCmsGallery(d)
    if (item) items.push(item)
  }
  return items.length > 0 ? items : galleryFromSite()
}
