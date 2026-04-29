/**
 * Live match (hero) — pobierane z Payload global `liveMatch`.
 * Minimalny klient: używamy REST bez auth (public read) i defensywny fallback.
 */
import type { LiveMatch } from '@wks/shared'

// UWAGA (SSR w Docker): `import.meta.env.*` jest wypiekane w buildzie.
// Na produkcji źródłem prawdy muszą być zmienne runtime z `process.env`.
const CMS_INTERNAL_URL: string =
  process.env.CMS_INTERNAL_URL ||
  process.env.CMS_URL ||
  import.meta.env.CMS_INTERNAL_URL ||
  import.meta.env.CMS_URL ||
  'http://localhost:3000'

const FETCH_TIMEOUT_MS = 3_000

export type LiveMatchUi = {
  enabled: boolean
  state: 'pre' | 'live' | 'ht' | 'live2' | 'ft'
  mode: NonNullable<LiveMatch['mode']>
  kind: 'league' | 'friendly' | 'cup' | 'custom'
  competitionLabel?: string
  kickoffPlanned?: string
  kickoffReal?: string
  pauseAt?: string
  resumeAt?: string
  homeLabel: string
  awayLabel: string
  scoreHome: number
  scoreAway: number
  clock?: {
    label: string // np. "12'" albo "45+2'"
    minute: number
    half: 1 | 2
    isAddedTime: boolean
    time?: string // mm:ss (clamped for UI)
    minuteClamped?: number // clamp to <=100 for UI
  }
  events: Array<{
    minute?: number
    half?: 1 | 2
    type: 'goal' | 'card' | 'sub' | 'info'
    team?: 'wks' | 'opponent'
    side?: 'home' | 'away' | 'neutral'
    text: string
  }>
  updatedAt?: string
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function toInt(x: unknown, fallback = 0): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback
}

function toIsoOrNull(x: unknown): string | null {
  if (!x) return null
  const s = String(x)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function diffMinutes(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, Math.floor((b - a) / 60_000))
}

function diffSeconds(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, Math.floor((b - a) / 1000))
}

function fmtMmss(totalSeconds: number): string {
  const s = Math.max(0, Math.trunc(totalSeconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(mm)}:${pad(ss)}`
}

function computeClock(raw: LiveMatch): LiveMatchUi['clock'] {
  if (!raw?.enabled) return undefined
  // CMS trzyma to jako `status`; w typach shared może to być `state` lub `status` zależnie od generacji.
  const state = (raw as any).status ?? (raw as any).state
  if (state === 'pre' || state === 'ft') return undefined
  const kickoffReal = toIsoOrNull(raw.kickoffReal)
  if (!kickoffReal) return undefined

  const now = new Date().toISOString()
  const pauseAt = toIsoOrNull(raw.pauseAt)
  const resumeAt = toIsoOrNull(raw.resumeAt)

  const added1 = toInt(raw.addedTime1, 0)
  const added2 = toInt(raw.addedTime2, 0)

  const formatHalf = (base: 45 | 90, extraMinutes: number, minute: number, half: 1 | 2): LiveMatchUi['clock'] => {
    // extraMinutes: 0 przy dokładnie 45:00 / 90:00. Wtedy pokazujemy "45'" / "90'", nie "45+0'".
    if (extraMinutes <= 0) return { label: `${base}'`, minute, half, isAddedTime: false }
    const cap = base === 45 ? added1 : added2
    const shown = cap > 0 ? Math.min(extraMinutes, cap) : extraMinutes
    return { label: `${base}+${shown}'`, minute, half, isAddedTime: true }
  }

  // Minuta "piłkarsko":
  // - 1. połowa: 1..45, a po 45:00 → 45+X (X = pełne minuty po 45:00)
  // - 2. połowa: 46..90, a po 90:00 → 90+X
  if (state === 'live' || state === 'ht') {
    const end1 = state === 'ht' ? (pauseAt || now) : now
    const elapsed = diffMinutes(kickoffReal, end1) // 0 w kickoff, 45 przy 45:00
    const minute = elapsed + 1
    const elapsedSec = diffSeconds(kickoffReal, end1)
    const shownSec = Math.min(100 * 60, elapsedSec)
    if (elapsed >= 45) {
      const base = formatHalf(45, elapsed - 45, minute, 1)
      return { ...base, time: fmtMmss(shownSec), minuteClamped: Math.min(100, minute) }
    }
    return {
      label: `${minute}'`,
      minute,
      half: 1,
      isAddedTime: false,
      time: fmtMmss(shownSec),
      minuteClamped: Math.min(100, minute),
    }
  }

  // state === 'live2'
  const start2 = resumeAt || now
  const elapsed2 = diffMinutes(start2, now) // 0 przy wznowieniu
  const totalElapsed = 45 + elapsed2 // 45 przy wznowieniu
  const minute = totalElapsed + 1 // 46 przy wznowieniu
  const firstSec = pauseAt ? diffSeconds(kickoffReal, pauseAt) : diffSeconds(kickoffReal, now)
  const secondSec = resumeAt ? diffSeconds(resumeAt, now) : 0
  const totalSec = pauseAt && resumeAt ? firstSec + secondSec : diffSeconds(kickoffReal, now)
  const shownSec = Math.min(100 * 60, totalSec)
  if (totalElapsed >= 90) {
    const base = formatHalf(90, totalElapsed - 90, minute, 2)
    return { ...base, time: fmtMmss(shownSec), minuteClamped: Math.min(100, minute) }
  }
  return { label: `${minute}'`, minute, half: 2, isAddedTime: false, time: fmtMmss(shownSec), minuteClamped: Math.min(100, minute) }
}

function playerName(x: unknown): string | null {
  if (typeof x === 'string') return x.trim() || null
  if (!isRecord(x)) return null
  const name = typeof x.name === 'string' ? x.name.trim() : ''
  return name || null
}

function normalizeEvent(raw: unknown): LiveMatchUi['events'][number] | null {
  if (!isRecord(raw)) return null
  const type = String(raw.type ?? 'info') as LiveMatchUi['events'][number]['type']
  const minuteRaw = raw.minute
  const minute = minuteRaw === undefined || minuteRaw === null ? undefined : toInt(minuteRaw, 0)
  const halfRaw = raw.half
  const half = halfRaw === '1' ? 1 : halfRaw === '2' ? 2 : undefined
  const team = String(raw.team ?? 'wks') === 'opponent' ? 'opponent' : 'wks'
  const side = type === 'info' ? 'neutral' : undefined

  // Payload wymusza `text` tylko dla info, ale defensywnie budujemy tekst zawsze.
  if (type === 'goal') {
    const ownGoal = Boolean(raw.ownGoal)
    if (team === 'wks') {
      const scorer =
        playerName(raw.scorerWks) || (typeof (raw as any).scorerText === 'string' ? (raw as any).scorerText.trim() : '') || 'Zawodnik WKS'
      const assist =
        playerName(raw.assistWks) ||
        (typeof (raw as any).assistText === 'string' ? (raw as any).assistText.trim() : '')
      const assistPart = assist ? ` (asysta ${assist})` : ''
      const own = ownGoal ? ' (samobój)' : ''
      return { minute, half, type, team, side, text: `Gol${own}: ${scorer}${assistPart}` }
    }
    const scorerText = String(raw.scorerOpponentText ?? '').trim() || 'Rywal'
    const assistText = String(raw.assistOpponentText ?? '').trim()
    const assistPart = assistText ? ` (asysta ${assistText})` : ''
    const own = ownGoal ? ' (samobój)' : ''
    return { minute, half, type, team, side, text: `Gol${own}: ${scorerText}${assistPart}` }
  }

  if (type === 'card') {
    const text = String(raw.text ?? '').trim()
    if (text) return { minute, half, type, team, side, text }
    return { minute, half, type, team, side, text: 'Kartka' }
  }

  if (type === 'sub') {
    const text = String(raw.text ?? '').trim()
    if (text) return { minute, half, type, team, side, text }
    return { minute, half, type, team, side, text: 'Zmiana' }
  }

  // info
  const text = String(raw.text ?? '').trim()
  if (!text) return null
  return { minute, half, type, side: 'neutral', text }
}

function resolveLabelsFromMatch(
  match: LiveMatch['match'],
): { competitionLabel?: string; homeLabel?: string; awayLabel?: string; kickoffPlanned?: string } {
  if (!match) return {}
  if (typeof match === 'number') return {}
  const m = match as any
  return {
    competitionLabel: typeof m.competitionLabel === 'string' ? m.competitionLabel : undefined,
    homeLabel: typeof m.homeTeamLabel === 'string' ? m.homeTeamLabel : undefined,
    awayLabel: typeof m.awayTeamLabel === 'string' ? m.awayTeamLabel : undefined,
    kickoffPlanned: typeof m.kickoffPlanned === 'string' ? m.kickoffPlanned : undefined,
  }
}

function resolveWksSideFromMatch(match: LiveMatch['match']): 'home' | 'away' | null {
  if (!match || typeof match === 'number') return null
  const m = match as any
  const s = String(m.wksSide ?? '').trim()
  return s === 'away' ? 'away' : s === 'home' ? 'home' : null
}

function normalizeLiveMatch(raw: unknown): LiveMatchUi | null {
  if (!isRecord(raw)) return null
  const enabled = Boolean(raw.enabled)
  const state = String((raw as any).status ?? (raw as any).state ?? 'pre') as LiveMatchUi['state']
  const mode = String(raw.mode ?? 'fromMatch') as LiveMatchUi['mode']
  const kind = String((raw as any).kind ?? 'league') as LiveMatchUi['kind']

  const matchLabels = resolveLabelsFromMatch((raw as any).match)
  const manual = raw

  const fallbackLabels = {
    competitionLabel: raw.competitionLabel ? String(raw.competitionLabel) : undefined,
    homeLabel: raw.homeLabel ? String(raw.homeLabel) : undefined,
    awayLabel: raw.awayLabel ? String(raw.awayLabel) : undefined,
  }

  const competitionLabel =
    mode === 'manual' || kind === 'custom'
      ? (typeof (manual as any).competitionCustomLabel === 'string'
          ? (manual as any).competitionCustomLabel
          : manual?.competitionLabel
            ? String(manual.competitionLabel)
            : undefined)
      : matchLabels.competitionLabel ?? fallbackLabels.competitionLabel

  const homeLabel =
    (mode === 'manual'
      ? String(manual?.homeLabel ?? '').trim()
      : String(matchLabels.homeLabel ?? fallbackLabels.homeLabel ?? '').trim()) || 'WKS Wierzbice'

  const awayLabel = (mode === 'manual'
    ? String(manual?.awayLabel ?? '').trim()
    : String(matchLabels.awayLabel ?? fallbackLabels.awayLabel ?? '').trim()
  ).trim()
  if (!awayLabel) return null

  const kickoffPlanned =
    (typeof (raw as any).kickoffPlanned === 'string' ? (raw as any).kickoffPlanned : undefined) ??
    matchLabels.kickoffPlanned
  const kickoffReal = typeof (raw as any).kickoffReal === 'string' ? (raw as any).kickoffReal : undefined
  const pauseAt = typeof (raw as any).pauseAt === 'string' ? (raw as any).pauseAt : undefined
  const resumeAt = typeof (raw as any).resumeAt === 'string' ? (raw as any).resumeAt : undefined

  const events = Array.isArray(raw.events)
    ? raw.events.map(normalizeEvent).filter((e): e is LiveMatchUi['events'][number] => Boolean(e))
    : []

  const wksSide = resolveWksSideFromMatch((raw as any).match) ?? 'home'
  for (const e of events) {
    if (e.type === 'info') {
      e.side = 'neutral'
      continue
    }
    const team = e.team ?? 'wks'
    e.side = team === 'wks' ? (wksSide === 'home' ? 'home' : 'away') : (wksSide === 'home' ? 'away' : 'home')
  }

  // UI pokazuje "ostatnie zdarzenia", więc sortujemy malejąco po minucie (jeśli jest).
  // Jeśli minute jest undefined, zachowujemy kolejność z CMS na końcu listy.
  events.sort((a, b) => {
    const am = typeof a.minute === 'number' ? a.minute : -1
    const bm = typeof b.minute === 'number' ? b.minute : -1
    return bm - am
  })

  return {
    enabled,
    state,
    mode,
    kind,
    competitionLabel,
    kickoffPlanned,
    kickoffReal,
    pauseAt,
    resumeAt,
    homeLabel,
    awayLabel,
    scoreHome: toInt(raw.scoreHome, 0),
    scoreAway: toInt(raw.scoreAway, 0),
    events,
    clock: computeClock(raw as unknown as LiveMatch),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function fetchLiveMatch(): Promise<LiveMatchUi | null> {
  const url = new URL('/api/globals/liveMatch', CMS_INTERNAL_URL)
  url.searchParams.set('depth', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const json = (await res.json()) as LiveMatch
    return normalizeLiveMatch(json)
  } catch {
    return null
  }
}

