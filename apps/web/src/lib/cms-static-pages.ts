import type { StaticPage } from '@wks/shared'

const CMS_INTERNAL_URL: string =
  import.meta.env.CMS_INTERNAL_URL || import.meta.env.CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 4000

export async function fetchStaticPage(slug: 'o-klubie' | 'nabory' | 'kontakt' | 'polityka-prywatnosci') {
  const url = new URL('/api/staticPages', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '1')
  url.searchParams.set('limit', '1')
  url.searchParams.set('where[slug][equals]', slug)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: StaticPage[] }
    const doc = json.docs?.[0] ?? null
    return doc
  } catch {
    return null
  }
}

