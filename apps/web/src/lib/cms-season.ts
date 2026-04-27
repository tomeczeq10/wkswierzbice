import seasonLocal from '@/data/season.json'

const CMS_INTERNAL_URL: string =
  import.meta.env.CMS_INTERNAL_URL || import.meta.env.CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 4000

export type SeasonData = typeof seasonLocal

export async function fetchSeason(): Promise<SeasonData> {
  const url = new URL('/api/globals/season', CMS_INTERNAL_URL)
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data?: SeasonData }
    if (json?.data && typeof json.data === 'object') return json.data
    return seasonLocal
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Season niedostępny (${CMS_INTERNAL_URL}): ${msg} — fallback do season.json`)
    return seasonLocal
  }
}

