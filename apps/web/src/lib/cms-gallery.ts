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

// ── Typy eksportowane ──────────────────────────────────────────────────────────

export type GalleryItem = {
  src: string
  alt: string
  caption?: string
}

export type GalleryAlbumCard = {
  id: number
  slug: string
  title: string
  description?: string
  eventDate?: string
  coverSrc?: string
  /** Liczba zdjęć bezpośrednio w tym folderze (liść) lub suma zdjęć w podfolderach (kategoria). */
  photoCount: number
  /** > 0 gdy folder jest kategorią z podfolderami */
  subAlbumCount: number
  /** Slug folderu nadrzędnego — do breadcrumba */
  parentSlug?: string
  /** Tytuł folderu nadrzędnego — do breadcrumba */
  parentTitle?: string
}

/** Widok strony /galeria: albumy z CMS lub placeholder. */
export type GalleryIndexMode =
  | { kind: 'site-fallback'; items: GalleryItem[] }
  | { kind: 'flat-cms'; items: GalleryItem[] }
  | { kind: 'albums'; albums: GalleryAlbumCard[]; orphanCount: number }

/** Widok konkretnego folderu /galeria/[slug]. */
export type AlbumPageData =
  | { kind: 'category'; album: GalleryAlbum; subAlbums: GalleryAlbumCard[] }
  | { kind: 'leaf'; album: GalleryAlbum; items: GalleryItem[]; parentAlbum?: { title: string; slug: string } | null }

// ── Helpery ───────────────────────────────────────────────────────────────────

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

function parentIdFromAlbum(al: GalleryAlbum): number | null {
  const p = (al as any).parent
  if (p == null) return null
  if (typeof p === 'number') return p
  if (typeof p === 'object' && 'id' in p) return (p as GalleryAlbum).id
  return null
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

function sortAlbums(a: GalleryAlbum, b: GalleryAlbum): number {
  const ta = a.eventDate ? new Date(a.eventDate).getTime() : 0
  const tb = b.eventDate ? new Date(b.eventDate).getTime() : 0
  if (tb !== ta) return tb - ta
  return (((a as any).order ?? 0) as number) - (((b as any).order ?? 0) as number)
}

function galleryFromSite(): GalleryItem[] {
  void GALLERY
  return []
}

function countPhotosDeep(
  albumId: number,
  docs: GalleryDoc[],
  allAlbums: GalleryAlbum[],
  seen = new Set<number>(),
): number {
  if (seen.has(albumId)) return 0
  seen.add(albumId)
  let n = galleryItemsForAlbumId(docs, albumId).length
  for (const child of allAlbums) {
    if (parentIdFromAlbum(child) === albumId) {
      n += countPhotosDeep(child.id, docs, allAlbums, seen)
    }
  }
  return n
}

function findCoverDeep(
  albumId: number,
  docs: GalleryDoc[],
  allAlbums: GalleryAlbum[],
  seen = new Set<number>(),
): string | undefined {
  if (seen.has(albumId)) return undefined
  seen.add(albumId)
  const direct = galleryItemsForAlbumId(docs, albumId)
  if (direct.length > 0) return direct[0]?.src
  for (const child of allAlbums) {
    if (parentIdFromAlbum(child) === albumId) {
      const childCover = pickGallerySrc(child.cover as Media | number | null | undefined)
      if (childCover) return childCover
      const deep = findCoverDeep(child.id, docs, allAlbums, seen)
      if (deep) return deep
    }
  }
  return undefined
}

function buildAlbumCard(
  al: GalleryAlbum,
  docs: GalleryDoc[],
  allAlbums: GalleryAlbum[],
  parentAlbum?: GalleryAlbum | null,
): GalleryAlbumCard {
  const slug = (al.slug ?? '').trim()
  const children = allAlbums.filter((c) => parentIdFromAlbum(c) === al.id)

  const photoCount = countPhotosDeep(al.id, docs, allAlbums)
  const coverSrc =
    pickGallerySrc(al.cover as Media | number | null | undefined) ??
    findCoverDeep(al.id, docs, allAlbums)

  return {
    id: al.id,
    slug,
    title: al.title,
    description: al.description ?? undefined,
    eventDate: al.eventDate ?? undefined,
    coverSrc,
    photoCount,
    subAlbumCount: children.length,
    parentSlug: parentAlbum?.slug?.trim() ?? undefined,
    parentTitle: parentAlbum?.title ?? undefined,
  }
}

function countOrphans(docs: GalleryDoc[]): number {
  let n = 0
  for (const d of docs) {
    if (albumIdFromDoc(d) != null) continue
    if (adaptCmsGallery(d)) n++
  }
  return n
}

// ── Publiczne API ─────────────────────────────────────────────────────────────

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
  url.searchParams.set('limit', '500')
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

/**
 * Dane dla /galeria — tylko foldery główne (bez rodzica), posortowane najnowsze pierwsze.
 */
export async function fetchGalleryIndex(): Promise<GalleryIndexMode> {
  const [docs, albumDocs] = await Promise.all([fetchGalleryDocs(), fetchGalleryAlbumDocs()])

  if (docs === null) return { kind: 'site-fallback', items: galleryFromSite() }
  if (docs.length === 0) return { kind: 'site-fallback', items: galleryFromSite() }

  const albums = albumDocs ?? []
  if (albums.length === 0) {
    const items: GalleryItem[] = []
    for (const d of docs) {
      const item = adaptCmsGallery(d)
      if (item) items.push(item)
    }
    return { kind: 'flat-cms', items: items.length > 0 ? items : galleryFromSite() }
  }

  // Tylko foldery bez rodzica
  const rootAlbums = albums
    .filter((al) => !parentIdFromAlbum(al) && (al.slug ?? '').trim())
    .sort(sortAlbums)

  const cards = rootAlbums
    .map((al) => buildAlbumCard(al, docs, albums))
    .filter((c) => c.photoCount > 0 || c.subAlbumCount > 0)

  const orphanCount = countOrphans(docs)
  return { kind: 'albums', albums: cards, orphanCount }
}

/**
 * Dane dla /galeria/[slug].
 * Jeśli folder ma podfoldery → { kind: 'category', subAlbums }.
 * Jeśli liść → { kind: 'leaf', items, parentAlbum? }.
 */
export async function fetchGalleryByAlbumSlug(slug: string): Promise<AlbumPageData | null> {
  const url = new URL('/api/gallery-albums', CMS_INTERNAL_URL)
  url.searchParams.set('where[slug][equals]', slug)
  url.searchParams.set('limit', '1')
  url.searchParams.set('depth', '2')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: GalleryAlbum[] }
    const album = json.docs?.[0]
    if (!album) return null

    const [allDocs, allAlbums] = await Promise.all([fetchGalleryDocs(), fetchGalleryAlbumDocs()])
    if (!allDocs) return null
    const albums = allAlbums ?? []

    const children = albums
      .filter((c) => parentIdFromAlbum(c) === album.id && (c.slug ?? '').trim())
      .sort(sortAlbums)

    if (children.length > 0) {
      const subAlbums = children.map((child) => buildAlbumCard(child, allDocs, albums, album))
      return { kind: 'category', album, subAlbums }
    }

    const items = galleryItemsForAlbumId(allDocs, album.id)
    const parentId = parentIdFromAlbum(album)
    let parentAlbum: { title: string; slug: string } | null = null
    if (parentId) {
      const parent = albums.find((a) => a.id === parentId)
      if (parent?.slug) parentAlbum = { title: parent.title, slug: parent.slug }
    }

    return { kind: 'leaf', album, items, parentAlbum }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Album galerii "${slug}": ${msg}`)
    return null
  }
}

/** Zdjęcia bez przypisanego albumu. */
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
