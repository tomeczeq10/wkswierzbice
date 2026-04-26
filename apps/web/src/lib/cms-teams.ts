import { getCollection } from 'astro:content'
import type { Media, Player, Team } from '@wks/shared'

const CMS_URL: string =
  import.meta.env.CMS_URL || import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 2500

type TeamCategory =
  | 'seniorzy'
  | 'rezerwy'
  | 'juniorzy'
  | 'trampkarze'
  | 'orlik'
  | 'zak'
  | 'skrzat'
  | 'kobiety'
  | 'inna'

export type TeamRosterEntry = {
  name: string
  number?: number | string
  position?: string
  photo?: string
}

export type TeamBody =
  | { type: 'lexical'; value: NonNullable<Team['description']> }
  | { type: 'md'; entry: Awaited<ReturnType<typeof getCollection<'teams'>>>[number] }
  | { type: 'empty' }

export type TeamItem = {
  slug: string
  data: {
    name: string
    category: TeamCategory
    league?: string
    coach: string
    assistantCoach?: string
    trainingSchedule?: string
    photo?: string
    order: number
    roster: TeamRosterEntry[]
  }
  body: TeamBody
}

function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl
  return new URL(maybeUrl, CMS_URL).toString()
}

function pickMediaUrl(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  const url =
    media.sizes?.card?.url ??
    media.sizes?.thumbnail?.url ??
    media.url ??
    null
  return absolutizeCmsUrl(url)
}

function adaptCmsTeam(team: Team): TeamItem {
  const photoUrl = pickMediaUrl(team.photo as Media | number | null | undefined)

  const category = team.category as TeamCategory

  return {
    slug: team.slug,
    data: {
      name: team.name,
      category,
      league: team.league ?? undefined,
      coach: team.coach,
      assistantCoach: team.assistantCoach ?? undefined,
      trainingSchedule: team.trainingSchedule ?? undefined,
      photo: photoUrl,
      order: team.order ?? 0,
      roster: [],
    },
    body: team.description ? { type: 'lexical', value: team.description } : { type: 'empty' },
  }
}

function adaptCmsPlayers(players: Player[]): TeamRosterEntry[] {
  return players.map((p) => ({
    name: p.name,
    number: p.number ?? undefined,
    position: p.position ?? undefined,
    photo: pickMediaUrl(p.photo as Media | number | null | undefined),
  }))
}

async function fetchTeamsFromCms(): Promise<Team[] | null> {
  const url = new URL('/api/teams', CMS_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '200')
  url.searchParams.set('sort', '-order')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: Team[] }
    return Array.isArray(json.docs) ? json.docs : []
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[cms] Niedostępne (${CMS_URL}): ${msg} — fallback do teams .md`)
    return null
  }
}

async function fetchPlayersForTeamFromCms(teamId: number): Promise<Player[] | null> {
  const url = new URL('/api/players', CMS_URL)
  url.searchParams.set('depth', '2')
  url.searchParams.set('limit', '500')
  url.searchParams.set('sort', 'number')
  url.searchParams.set('where[team][equals]', String(teamId))

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { docs?: Player[] }
    return Array.isArray(json.docs) ? json.docs : []
  } catch {
    // Playerzy są dodatkiem — jeśli nie dojdą, pokażemy pustą kadrę.
    return null
  }
}

async function fetchTeamsFromMd(): Promise<TeamItem[]> {
  const entries = await getCollection('teams')
  return entries
    .map((entry) => ({
      slug: entry.slug,
      data: {
        name: entry.data.name,
        category: entry.data.category,
        league: entry.data.league,
        coach: entry.data.coach,
        assistantCoach: entry.data.assistantCoach,
        trainingSchedule: entry.data.trainingSchedule,
        photo: entry.data.photo,
        order: entry.data.order,
        roster: entry.data.roster,
      },
      body: { type: 'md', entry },
    }))
    .sort((a, b) => b.data.order - a.data.order)
}

/**
 * Lista drużyn do SSG (paths) + fallback do .md.
 * Jeśli CMS jest dostępny, ale nie ma jeszcze danych (0 docs), też spadamy na .md
 * żeby istniejąca strona nie „zniknęła” w trakcie migracji.
 */
export async function fetchTeamsList(): Promise<TeamItem[]> {
  const cmsTeams = await fetchTeamsFromCms()
  if (cmsTeams === null) return await fetchTeamsFromMd()
  if (cmsTeams.length === 0) return await fetchTeamsFromMd()

  // Dociągamy roster z Players per-team. To jest SSG-only, liczby są małe.
  const result: TeamItem[] = []
  for (const t of cmsTeams) {
    const item = adaptCmsTeam(t)
    const teamId = t.id as number
    const cmsPlayers = await fetchPlayersForTeamFromCms(teamId)
    item.data.roster = cmsPlayers ? adaptCmsPlayers(cmsPlayers) : []
    result.push(item)
  }

  // Etap 8: jeśli w CMS nie ma jeszcze `photo` (upload), a w legacy .md jest
  // ścieżka (np. placeholdery SVG z /gallery/…), pokazujemy ją na froncie —
  // dopóki redakcja nie wgra pliku rastrowego do Media i nie podlinkuje.
  const mdEntries = await getCollection('teams')
  const mdPhotoBySlug = new Map(
    mdEntries.map((e) => [e.slug, e.data.photo] as const),
  )
  for (const item of result) {
    if (!item.data.photo) {
      const legacy = mdPhotoBySlug.get(item.slug)
      if (typeof legacy === 'string' && legacy.length > 0) item.data.photo = legacy
    }
  }

  return result
}

