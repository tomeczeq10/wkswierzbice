'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MobileLiveStudio from './MobileLiveStudio'

// Hook: prawda gdy viewport ≤ 768px. SSR-safe.
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])
  return isMobile
}

type LiveMatchState = 'pre' | 'live' | 'ht' | 'live2' | 'ft'
type LiveMatchMode = 'fromMatch' | 'manual'
type LiveMatchKind = 'league' | 'friendly' | 'cup' | 'custom'

type LiveMatchDoc = {
  enabled?: boolean
  status?: LiveMatchState
  mode?: LiveMatchMode
  kind?: LiveMatchKind
  match?: string | number | { id: string | number } | null
  competitionLabel?: string | null
  competitionCustomLabel?: string | null
  homeLabel?: string | null
  awayLabel?: string | null
  kickoffReal?: string | null
  pauseAt?: string | null
  resumeAt?: string | null
  addedTime1?: number | null
  addedTime2?: number | null
  scoreHome?: number | null
  scoreAway?: number | null
  events?: any[]
  updatedAt?: string | null
}

type MatchDoc = {
  id: string | number
  kickoffPlanned?: string | null
  competitionLabel?: string | null
  homeTeamLabel?: string | null
  awayTeamLabel?: string | null
  wksSide?: 'home' | 'away'
  lineup?: Array<{ id: string | number; name?: string | null; number?: number | null }> | Array<string | number>
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  const ms = d.getTime()
  return Number.isNaN(ms) ? null : ms
}

function clampInt(x: unknown, fallback = 0): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback
}

function fmt2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function stateLabel(s: LiveMatchState | undefined): string {
  if (s === 'live') return '1. połowa'
  if (s === 'ht') return 'Przerwa'
  if (s === 'live2') return '2. połowa'
  if (s === 'ft') return 'Koniec'
  return 'Przed meczem'
}

function computeClock(nowMs: number, doc: LiveMatchDoc): { minute: number; second: number } | null {
  const kickoffMs = parseMs(doc.kickoffReal ?? null)
  if (!kickoffMs) return null

  const pauseMs = parseMs(doc.pauseAt ?? null)
  const resumeMs = parseMs(doc.resumeAt ?? null)
  const st = doc.status ?? 'pre'

  if (st === 'pre') return { minute: 0, second: 0 }
  if (st === 'ht') {
    const end = pauseMs ?? nowMs
    const s = Math.max(0, Math.floor((end - kickoffMs) / 1000))
    return { minute: Math.floor(s / 60), second: s % 60 }
  }

  if (st === 'live') {
    // Pause/resume inside half: freeze when pauseAt is set and not resumed yet.
    const frozenEnd = pauseMs && (!resumeMs || resumeMs < pauseMs) ? pauseMs : nowMs
    const s = Math.max(0, Math.floor((frozenEnd - kickoffMs) / 1000))
    return { minute: Math.floor(s / 60), second: s % 60 }
  }

  if (st === 'live2') {
    // UX: po kliknięciu „Start 2. połowy” licz od 45:00 (jak w relacjach live),
    // niezależnie od realnego czasu pauzy/przerwy.
    if (resumeMs) {
      const frozenEnd = pauseMs && pauseMs > resumeMs ? pauseMs : nowMs
      const second = Math.max(0, Math.floor((frozenEnd - resumeMs) / 1000))
      const s = 45 * 60 + second
      return { minute: Math.floor(s / 60), second: s % 60 }
    }
    // fallback: jeśli brak resumeAt, licz jak dotychczas od kickoffReal
    const s = Math.max(0, Math.floor((nowMs - kickoffMs) / 1000))
    return { minute: Math.floor(s / 60), second: s % 60 }
  }

  // ft: freeze at last known moment
  const end = pauseMs ?? nowMs
  if (resumeMs && st === 'ft') {
    const second = Math.max(0, Math.floor((end - resumeMs) / 1000))
    const s = 45 * 60 + second
    return { minute: Math.floor(s / 60), second: s % 60 }
  }
  const s = Math.max(0, Math.floor((end - kickoffMs) / 1000))
  return { minute: Math.floor(s / 60), second: s % 60 }
}

const T = {
  bg: '#0f2a1c',
  panel: 'rgba(0,0,0,0.28)',
  panelBorder: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.7)',
  subtle: 'rgba(255,255,255,0.55)',
  red: '#dc2626',
  green: '#166534',
}

export default function LiveStudioPage() {
  const baseUrl = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), [])
  const liveUrl = useMemo(() => `${baseUrl}/api/globals/liveMatch?depth=1`, [baseUrl])
  const patchUrl = useMemo(() => `${baseUrl}/api/globals/liveMatch`, [baseUrl])
  const streamUrl = useMemo(() => `${baseUrl}/api/live-match/stream`, [baseUrl])

  const [live, setLive] = useState<LiveMatchDoc | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [clock, setClock] = useState<{ minute: number; second: number } | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalScorerId, setGoalScorerId] = useState<string>('')
  const [goalAssistId, setGoalAssistId] = useState<string>('')
  const [goalAssistText, setGoalAssistText] = useState<string>('')
  const [goalScorerText, setGoalScorerText] = useState<string>('')
  const [goalOwnGoal, setGoalOwnGoal] = useState(false)
  const [goalMinute, setGoalMinute] = useState<number>(1)
  const [lineup, setLineup] = useState<Array<{ id: string; name: string }>>([])
  const [match, setMatch] = useState<MatchDoc | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number>(-1)
  const [editMinute, setEditMinute] = useState<number>(1)
  const [editOwnGoal, setEditOwnGoal] = useState(false)
  const [editScorerText, setEditScorerText] = useState('')
  const [editAssistText, setEditAssistText] = useState('')
  const [editScorerOpponentText, setEditScorerOpponentText] = useState('')
  const [editAssistOpponentText, setEditAssistOpponentText] = useState('')
  const [editText, setEditText] = useState('')

  const esRef = useRef<EventSource | null>(null)
  const tickRef = useRef<number | null>(null)
  const liveRef = useRef<LiveMatchDoc | null>(null)

  const fetchLive = useCallback(async () => {
    const r = await fetch(liveUrl, { credentials: 'include' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const json = (await r.json()) as LiveMatchDoc
    setLive(json)
    return json
  }, [liveUrl])

  const fetchMatch = useCallback(
    async (matchId: string | number): Promise<MatchDoc | null> => {
      try {
        // depth=2: lineup relationship should return full player docs (id + name)
        const r = await fetch(`${baseUrl}/api/matches/${matchId}?depth=2`, { credentials: 'include' })
        if (!r.ok) return null
        return (await r.json()) as MatchDoc
      } catch {
        return null
      }
    },
    [baseUrl],
  )

  const patch = useCallback(
    async (data: Partial<LiveMatchDoc>) => {
      setErr(null)
      setBusy(true)
      try {
        const current = liveRef.current ?? live ?? (await fetchLive())
        const merged: any = { ...(current as any), ...(data as any) }
        // Payload globals update uses POST; send a safe, complete snapshot to avoid wiping fields like `match`.
        const payload: any = {
          enabled: merged.enabled,
          status: merged.status,
          mode: merged.mode,
          kind: merged.kind,
          match: merged.match,
          competitionLabel: merged.competitionLabel,
          competitionCustomLabel: merged.competitionCustomLabel,
          kickoffPlanned: merged.kickoffPlanned,
          kickoffReal: merged.kickoffReal,
          pauseAt: merged.pauseAt,
          resumeAt: merged.resumeAt,
          addedTime1: merged.addedTime1,
          addedTime2: merged.addedTime2,
          homeLabel: merged.homeLabel,
          awayLabel: merged.awayLabel,
          scoreHome: merged.scoreHome,
          scoreAway: merged.scoreAway,
          events: merged.events,
        }
        if (Array.isArray(payload.events)) {
          payload.events = payload.events.map((ev: any) => {
            const halfRaw = ev?.half
            const half =
              halfRaw === '1' || halfRaw === '2' ? halfRaw : halfRaw === 1 ? '1' : halfRaw === 2 ? '2' : undefined
            const minuteRaw = ev?.minute
            const minute = Number.isFinite(minuteRaw) ? Math.max(0, Math.trunc(minuteRaw)) : minuteRaw
            return { ...ev, ...(half ? { half } : {}), ...(minute !== minuteRaw ? { minute } : {}) }
          })
        }
        const res = await fetch(patchUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // optimistic update (SSE will correct it if needed)
        setLive((prev) => ({ ...(prev ?? {}), ...(payload as any) }))
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [patchUrl],
  )

  const setState = useCallback(
    async (st: LiveMatchState) => {
      const data: Partial<LiveMatchDoc> = { status: st }
      if (st === 'live') {
        data.enabled = true
        data.kickoffReal = new Date().toISOString()
        data.pauseAt = null
        data.resumeAt = null
      }
      if (st === 'ht') data.pauseAt = new Date().toISOString()
      if (st === 'live2') {
        data.enabled = true
        data.resumeAt = new Date().toISOString()
      }
      if (st === 'ft') {
        data.enabled = false
        // freeze clock at end moment
        data.pauseAt = new Date().toISOString()
      }
      await patch(data)
    },
    [patch],
  )

  const matchId = useMemo(() => {
    const m = live?.match
    if (typeof m === 'string' || typeof m === 'number') return m
    if (m && typeof m === 'object') {
      const id = (m as any).id
      if (typeof id === 'string' || typeof id === 'number') return id
    }
    return null
  }, [live?.match])

  const wksIsHome = (match?.wksSide ?? 'home') === 'home'

  const eventSide = useCallback(
    (ev: any): 'home' | 'away' | 'neutral' => {
      const type = String(ev?.type ?? 'info')
      if (type === 'info') return 'neutral'
      const team = String(ev?.team ?? 'wks')
      if (team === 'wks') return wksIsHome ? 'home' : 'away'
      if (team === 'opponent') return wksIsHome ? 'away' : 'home'
      return 'neutral'
    },
    [wksIsHome],
  )

  const fmtEventText = useCallback((ev: any): string => {
    const type = String(ev?.type ?? 'info')
    if (type === 'goal') {
      const own = ev?.ownGoal ? ' (samobój)' : ''
      const team = String(ev?.team ?? 'wks')
      if (team === 'wks') {
        const rawScorerText = String(ev?.scorerText ?? '').trim()
        const scorerText = /^gol\s*wks$/i.test(rawScorerText) ? '' : rawScorerText
        const scorer = scorerText || (ev?.scorerWks?.name ? String(ev.scorerWks.name).trim() : '')
        const assist = String(ev?.assistText ?? '').trim() || (ev?.assistWks?.name ? String(ev.assistWks.name).trim() : '')
        if (!scorer && !assist) return `⚽ Gol${own}`
        if (scorer && !assist) return `⚽ Gol${own}: ${scorer}`
        if (!scorer && assist) return `⚽ Gol${own} (🅰 ${assist})`
        return `⚽ Gol${own}: ${scorer} (🅰 ${assist})`
      }
      const rawOpp = String(ev?.scorerOpponentText ?? '').trim()
      const scorerOpp = /^gol\s*rywala$/i.test(rawOpp) ? '' : rawOpp
      const assistOpp = String(ev?.assistOpponentText ?? '').trim()
      if (!scorerOpp && !assistOpp) return `⚽ Gol${own} (rywal)`
      if (scorerOpp && !assistOpp) return `⚽ Gol${own} (rywal): ${scorerOpp}`
      if (!scorerOpp && assistOpp) return `⚽ Gol${own} (rywal) (🅰 ${assistOpp})`
      return `⚽ Gol${own} (rywal): ${scorerOpp} (🅰 ${assistOpp})`
    }
    const text = String(ev?.text ?? '').trim()
    if (text) {
      if (/czerwona/i.test(text)) return `🟥 ${text}`
      if (/żółta|zolta/i.test(text)) return `🟨 ${text}`
      return text
    }
    if (type === 'card') return '🟨 Kartka'
    if (type === 'sub') return 'Zmiana'
    return 'Info'
  }, [])

  const currentState: LiveMatchState = live?.status ?? 'pre'
  const canStartMatch = currentState === 'pre'
  const canEndFirstHalf = currentState === 'live'
  const canStartSecondHalf = currentState === 'ht'
  const canEndMatch = currentState === 'live2'

  const pickSuggestedLeagueMatch = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const now = Date.now()
      const nowIso = new Date(now).toISOString()
      const winStartIso = new Date(now - 3 * 3600_000).toISOString()
      const winEndIso = new Date(now + 3 * 3600_000).toISOString()

      async function query(where: Record<string, string>, limit = 10) {
        const url = new URL(`${baseUrl}/api/matches`)
        url.searchParams.set('limit', String(limit))
        url.searchParams.set('sort', 'kickoffPlanned')
        url.searchParams.set('depth', '0')
        for (const [k, v] of Object.entries(where)) url.searchParams.set(k, v)
        const res = await fetch(url.toString(), { credentials: 'include', headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as any
        return (json?.docs ?? []) as MatchDoc[]
      }

      const inWindow = await query({
        'where[kickoffPlanned][greater_than_equal]': winStartIso,
        'where[kickoffPlanned][less_than_equal]': winEndIso,
      })

      let best: MatchDoc | null = null
      let bestDiff = Number.POSITIVE_INFINITY
      for (const m of inWindow) {
        const ms = parseMs(m.kickoffPlanned ?? null)
        if (!ms) continue
        const diff = Math.abs(ms - now)
        if (diff < bestDiff) {
          best = m
          bestDiff = diff
        }
      }

      if (!best) {
        const future = await query({ 'where[kickoffPlanned][greater_than_equal]': nowIso }, 1)
        best = future[0] ?? null
      }

      if (!best?.id) throw new Error('Brak meczu ligowego do zasugerowania.')
      await patch({ mode: 'fromMatch', kind: 'league', match: best.id })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [baseUrl, patch])

  const openGoalModal = useCallback(async () => {
    const current = live ?? (await fetchLive())
    if (matchId) {
      const m = await fetchMatch(matchId)
      const rawLineup = (m as any)?.lineup
      let normalized: Array<{ id: string; name: string }> = Array.isArray(rawLineup)
        ? rawLineup
            .map((p: any) => {
              if (typeof p === 'string' || typeof p === 'number') return null
              const id = String(p?.id ?? '').trim()
              const name = String(p?.name ?? '').trim()
              if (!id || !name) return null
              return { id, name }
            })
            .filter((p): p is { id: string; name: string } => p !== null)
        : []

      // Fallback 1: lineup zapisany jako tablica numeric ID (depth=0). Pobierz nazwy.
      if (
        normalized.length === 0 &&
        Array.isArray(rawLineup) &&
        rawLineup.length > 0 &&
        rawLineup.every((x: any) => typeof x === 'number' || typeof x === 'string')
      ) {
        try {
          const idsCsv = rawLineup.join(',')
          const r = await fetch(
            `${baseUrl}/api/players?limit=200&depth=0&where[id][in]=${encodeURIComponent(idsCsv)}`,
            { credentials: 'include' },
          )
          if (r.ok) {
            const json = await r.json()
            const docs = (Array.isArray(json?.docs) ? json.docs : []) as any[]
            normalized = docs
              .map((d) => ({ id: String(d?.id ?? '').trim(), name: String(d?.name ?? '').trim() }))
              .filter((x) => x.id && x.name)
          }
        } catch {
          // ignore — fallback 2 below
        }
      }

      // Fallback 2: lineup pusty → pokaż całą drużynę WKS przypisaną do meczu.
      if (normalized.length === 0) {
        const wt = (m as any)?.wksTeam
        const wksTeamId =
          typeof wt === 'number' || typeof wt === 'string'
            ? wt
            : wt && typeof wt === 'object' && wt.id != null
              ? wt.id
              : null
        if (wksTeamId != null) {
          try {
            const r = await fetch(
              `${baseUrl}/api/players?limit=200&depth=0&sort=number&where[team][equals]=${encodeURIComponent(String(wksTeamId))}`,
              { credentials: 'include' },
            )
            if (r.ok) {
              const json = await r.json()
              const docs = (Array.isArray(json?.docs) ? json.docs : []) as any[]
              normalized = docs
                .map((d) => ({ id: String(d?.id ?? '').trim(), name: String(d?.name ?? '').trim() }))
                .filter((x) => x.id && x.name)
            }
          } catch {
            // ignore
          }
        }
      }

      if (normalized.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('[live-studio] openGoalModal: brak kadry meczowej. raw lineup:', rawLineup, 'match:', m)
      }

      setLineup(normalized)
      if (!goalScorerId && normalized[0]?.id) setGoalScorerId(normalized[0].id)
      if (m) setMatch(m)
    } else {
      setLineup([])
    }

    const st = current?.status ?? 'pre'
    const half = st === 'live2' || st === 'ft' ? 2 : 1
    const auto = clock ? Math.max(1, clock.minute + 1) : half === 1 ? 1 : 46
    setGoalMinute(auto)
    setGoalOwnGoal(false)
    setGoalAssistId('')
    setGoalAssistText('')
    setGoalScorerText('')
    setGoalModalOpen(true)
  }, [baseUrl, clock, fetchLive, fetchMatch, goalScorerId, live, matchId])

  const submitGoalWks = useCallback(async () => {
    const current = live ?? (await fetchLive())
    const events = Array.isArray(current?.events) ? current!.events! : []
    const st = current?.status ?? 'pre'
    const half = st === 'live2' || st === 'ft' ? '2' : '1'
    const minute = Number.isFinite(goalMinute) ? Math.max(0, Math.trunc(goalMinute)) : undefined

    const event: Record<string, any> = {
      type: 'goal',
      team: 'wks',
      ownGoal: Boolean(goalOwnGoal),
      half,
      minute,
      scorerWks: goalScorerId || undefined,
      assistWks: goalAssistId || undefined,
      scorerText: goalScorerText.trim() || undefined,
      assistText: goalAssistText.trim() || undefined,
    }

    // WKS gol: gdy WKS gra u siebie → zwiększ scoreHome; gdy na wyjeździe → scoreAway
    const next: Partial<LiveMatchDoc> = {
      events: [event, ...events].slice(0, 30),
    }
    if (wksIsHome) next.scoreHome = clampInt(current?.scoreHome, 0) + 1
    else next.scoreAway = clampInt(current?.scoreAway, 0) + 1
    await patch(next)
    setGoalModalOpen(false)
  }, [
    fetchLive,
    goalAssistId,
    goalAssistText,
    goalMinute,
    goalOwnGoal,
    goalScorerId,
    goalScorerText,
    live,
    patch,
    wksIsHome,
  ])

  const quickGoalOpponent = useCallback(async () => {
    const current = live ?? (await fetchLive())
    const events = Array.isArray(current?.events) ? current!.events! : []
    const st = current?.status ?? 'pre'
    const half = st === 'live2' || st === 'ft' ? '2' : '1'
    const minuteAuto = clock ? Math.max(1, clock.minute + 1) : undefined
    const event: Record<string, any> = {
      type: 'goal',
      team: 'opponent',
      half,
      minute: minuteAuto,
    }
    // Gol rywala: jeśli WKS u siebie → rywal=away → scoreAway++; jeśli WKS na wyjeździe → rywal=home → scoreHome++
    const next: Partial<LiveMatchDoc> = { events: [event, ...events].slice(0, 30) }
    if (wksIsHome) next.scoreAway = clampInt(current?.scoreAway, 0) + 1
    else next.scoreHome = clampInt(current?.scoreHome, 0) + 1
    await patch(next)
  }, [clock, fetchLive, live, patch, wksIsHome])

  const quickGoalWksFromPlus = useCallback(async () => {
    const current = live ?? (await fetchLive())
    const events = Array.isArray(current?.events) ? current!.events! : []
    const st = current?.status ?? 'pre'
    const half = st === 'live2' || st === 'ft' ? '2' : '1'
    const minuteAuto = clock ? Math.max(1, clock.minute + 1) : undefined
    const event: Record<string, any> = {
      type: 'goal',
      team: 'wks',
      half,
      minute: minuteAuto,
    }
    const next: Partial<LiveMatchDoc> = { events: [event, ...events].slice(0, 30) }
    if (wksIsHome) next.scoreHome = clampInt(current?.scoreHome, 0) + 1
    else next.scoreAway = clampInt(current?.scoreAway, 0) + 1
    await patch(next)
  }, [clock, fetchLive, live, patch, wksIsHome])

  const quickGoalOpponentFromPlus = useCallback(async () => {
    // alias (żeby +1 zachowywało się jak gol z minutą)
    await quickGoalOpponent()
  }, [quickGoalOpponent])

  const undoLastGoalFor = useCallback(
    async (team: 'wks' | 'opponent') => {
      const current = live ?? (await fetchLive())
      const events = Array.isArray(current?.events) ? (current!.events as any[]) : []
      const idx = events.findIndex((e) => e?.type === 'goal' && String(e?.team ?? '') === team)
      const nextEvents = idx >= 0 ? events.filter((_, i) => i !== idx) : events
      const next: Partial<LiveMatchDoc> = { events: nextEvents }
      // wksSide-aware: dekrementuj odpowiednią stronę punktacji
      const wksScored = team === 'wks'
      const decrementHome = (wksScored && wksIsHome) || (!wksScored && !wksIsHome)
      if (decrementHome) next.scoreHome = Math.max(0, clampInt(current?.scoreHome, 0) - 1)
      else next.scoreAway = Math.max(0, clampInt(current?.scoreAway, 0) - 1)
      await patch(next)
    },
    [fetchLive, live, patch, wksIsHome],
  )

  const undoLast = useCallback(async () => {
    const current = live ?? (await fetchLive())
    const events = Array.isArray(current?.events) ? current!.events! : []
    const last = events[0]
    if (!last) return

    const nextEvents = events.slice(1)
    const isGoal = last?.type === 'goal'
    const team = String(last?.team ?? '')

    const next: Partial<LiveMatchDoc> = { events: nextEvents }
    if (isGoal && (team === 'wks' || team === 'opponent')) {
      const wksScored = team === 'wks'
      const decrementHome = (wksScored && wksIsHome) || (!wksScored && !wksIsHome)
      if (decrementHome) next.scoreHome = Math.max(0, clampInt(current?.scoreHome, 0) - 1)
      else next.scoreAway = Math.max(0, clampInt(current?.scoreAway, 0) - 1)
    }
    await patch(next)
  }, [fetchLive, live, patch, wksIsHome])

  const deleteEventAt = useCallback(
    async (idx: number) => {
      const current = live ?? (await fetchLive())
      const events = Array.isArray(current?.events) ? current!.events! : []
      const ev = events[idx]
      if (!ev) return

      let revertScore = false
      const isGoal = ev?.type === 'goal'
      const team = String(ev?.team ?? '')
      if (isGoal && (team === 'wks' || team === 'opponent')) {
        revertScore = window.confirm('To był gol. Czy cofnąć też wynik?')
      } else {
        const ok = window.confirm('Usunąć zdarzenie?')
        if (!ok) return
      }

      const nextEvents = events.filter((_, i) => i !== idx)
      const next: Partial<LiveMatchDoc> = { events: nextEvents }
      if (revertScore) {
        const wksScored = team === 'wks'
        const decrementHome = (wksScored && wksIsHome) || (!wksScored && !wksIsHome)
        if (decrementHome) next.scoreHome = Math.max(0, clampInt(current?.scoreHome, 0) - 1)
        else next.scoreAway = Math.max(0, clampInt(current?.scoreAway, 0) - 1)
      }
      await patch(next)
    },
    [fetchLive, live, patch, wksIsHome],
  )

  const openEdit = useCallback(
    async (idx: number) => {
      const current = live ?? (await fetchLive())
      const events = Array.isArray(current?.events) ? current!.events! : []
      const ev = events[idx]
      if (!ev) return
      setEditIndex(idx)
      setEditMinute(typeof ev.minute === 'number' ? ev.minute : clock ? Math.max(1, clock.minute + 1) : 1)
      setEditOwnGoal(Boolean(ev.ownGoal))
      setEditScorerText(String(ev.scorerText ?? '').trim())
      setEditAssistText(String(ev.assistText ?? '').trim())
      setEditScorerOpponentText(String(ev.scorerOpponentText ?? '').trim())
      setEditAssistOpponentText(String(ev.assistOpponentText ?? '').trim())
      setEditText(String(ev.text ?? '').trim())
      setEditOpen(true)
    },
    [clock, fetchLive, live],
  )

  const saveEdit = useCallback(async () => {
    const idx = editIndex
    if (idx < 0) return
    const current = live ?? (await fetchLive())
    const events = Array.isArray(current?.events) ? current!.events! : []
    const ev = events[idx]
    if (!ev) return

    const nextEv: any = { ...ev, minute: Math.max(0, Math.trunc(editMinute)) }
    if (String(ev.type) === 'goal') {
      nextEv.ownGoal = Boolean(editOwnGoal)
      if (String(ev.team) === 'wks') {
        nextEv.scorerText = editScorerText.trim() || undefined
        nextEv.assistText = editAssistText.trim() || undefined
      } else {
        nextEv.scorerOpponentText = editScorerOpponentText.trim() || undefined
        nextEv.assistOpponentText = editAssistOpponentText.trim() || undefined
      }
    } else {
      nextEv.text = editText.trim()
    }

    const nextEvents = events.map((x, i) => (i === idx ? nextEv : x))
    await patch({ events: nextEvents })
    setEditOpen(false)
  }, [
    editAssistOpponentText,
    editAssistText,
    editIndex,
    editMinute,
    editOwnGoal,
    editScorerOpponentText,
    editScorerText,
    editText,
    fetchLive,
    live,
    patch,
  ])

  const addEventQuick = useCallback(
    async (type: 'goal' | 'card' | 'sub' | 'info', team?: 'wks' | 'opponent') => {
      const text =
        type === 'info'
          ? (window.prompt('Info — treść', '') ?? '').trim()
          : type === 'sub'
            ? (window.prompt('Zmiana — treść (np. „Kowalski za Nowaka”)', '') ?? '').trim()
            : type === 'card'
              ? (window.prompt('Kartka — treść (np. „Żółta: Kowalski”)', '') ?? '').trim()
              : ''

      const event: Record<string, any> = type === 'goal'
        ? { type: 'goal', team: team ?? 'wks', ownGoal: false }
        : { type, ...(type === 'info' ? {} : { team: team ?? 'wks' }), text: text || (type === 'info' ? 'Info' : type === 'sub' ? 'Zmiana' : 'Kartka') }

      setErr(null)
      setBusy(true)
      try {
        const current = live ?? (await fetchLive())
        const events = Array.isArray(current?.events) ? current!.events! : []
        // auto-minute (delikatnie): dla czytelności logów
        const minuteAuto = clock ? Math.max(1, clock.minute + 1) : undefined
        const st = current?.status ?? 'pre'
        const half = st === 'live2' || st === 'ft' ? '2' : '1'
        const withMeta = { ...event, ...(minuteAuto ? { minute: minuteAuto } : {}), ...(type !== 'info' ? { half } : {}) }
        const next = [withMeta, ...events].slice(0, 30)
        await patch({ events: next })
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [clock, fetchLive, live, patch],
  )

  const addCard = useCallback(
    async (team: 'wks' | 'opponent', color: 'yellow' | 'red') => {
      const label = color === 'red' ? 'Czerwona kartka' : 'Żółta kartka'
      const who = (window.prompt(`${label} — treść (opcjonalnie)`, '') ?? '').trim()
      const text = who ? `${label}: ${who}` : label

      setErr(null)
      setBusy(true)
      try {
        const current = live ?? (await fetchLive())
        const events = Array.isArray(current?.events) ? current!.events! : []
        const minuteAuto = clock ? Math.max(1, clock.minute + 1) : undefined
        const st = current?.status ?? 'pre'
        const half = st === 'live2' || st === 'ft' ? '2' : '1'
        const ev: any = { type: 'card', team, text, ...(minuteAuto ? { minute: minuteAuto } : {}), half }
        await patch({ events: [ev, ...events].slice(0, 30) })
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [clock, fetchLive, live, patch],
  )

  const pauseMatch = useCallback(async () => {
    const current = live ?? (await fetchLive())
    // only meaningful during live halves
    const st = current?.status ?? 'pre'
    if (st !== 'live' && st !== 'live2') return
    if (current?.pauseAt) return
    await patch({ pauseAt: new Date().toISOString() })
  }, [fetchLive, live, patch])

  const resumeMatch = useCallback(async () => {
    const current = live ?? (await fetchLive())
    const st = current?.status ?? 'pre'
    if (st !== 'live' && st !== 'live2') return
    const pauseMs = parseMs(current?.pauseAt ?? null)
    if (!pauseMs) return
    const nowMs = Date.now()
    const delta = Math.max(0, nowMs - pauseMs)

    // Keep the clock continuous by shifting the half anchor forward by paused duration.
    if (st === 'live') {
      const kickoffMs = parseMs(current?.kickoffReal ?? null)
      if (!kickoffMs) {
        await patch({ pauseAt: null })
        return
      }
      await patch({ kickoffReal: new Date(kickoffMs + delta).toISOString(), pauseAt: null })
      return
    }

    // live2: resumeAt is used as 2H anchor (45:00). Shift it forward.
    const resumeMs = parseMs(current?.resumeAt ?? null)
    if (!resumeMs) {
      await patch({ pauseAt: null })
      return
    }
    await patch({ resumeAt: new Date(resumeMs + delta).toISOString(), pauseAt: null })
  }, [fetchLive, live, patch])

  // init: fetch + sse + clock tick
  useEffect(() => {
    fetchLive().catch((e) => setErr(e instanceof Error ? e.message : String(e)))

    const es = new EventSource(streamUrl, { withCredentials: true } as any)
    esRef.current = es
    es.onmessage = (ev) => {
      try {
        const json = JSON.parse(ev.data)
        if (isRecord(json)) setLive(json as any)
      } catch {
        // ignore
      }
    }
    es.onerror = () => {
      // keep UI usable; autosave still works
    }

    tickRef.current = window.setInterval(() => {
      const now = Date.now()
      const current = liveRef.current
      setClock((prev) => {
        if (!current) return null
        const st = current?.status ?? 'pre'
        if (st === 'ft') return prev ?? computeClock(now, current)
        return computeClock(now, current)
      })
    }, 250)

    return () => {
      try {
        es.close()
      } catch {
        // ignore
      }
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!live) return
    liveRef.current = live
    const now = Date.now()
    setClock((prev) => {
      const st = live?.status ?? 'pre'
      if (st === 'ft') return prev ?? computeClock(now, live)
      return computeClock(now, live)
    })
  }, [live])

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      return
    }
    fetchMatch(matchId)
      .then((m) => setMatch(m))
      .catch(() => setMatch(null))
  }, [fetchMatch, matchId])

  const preview = live
    ? {
        competition:
          (live.kind === 'custom' || live.mode === 'manual'
            ? (live.competitionCustomLabel || live.competitionLabel || '').trim()
            : '') || 'Relacja na żywo',
        state: stateLabel(live.status),
        minute: clock ? `${Math.max(0, clock.minute)}'` : '—',
        time: clock ? `${fmt2(clock.minute)}:${fmt2(clock.second)}` : '—',
        home: live.homeLabel || match?.homeTeamLabel || 'WKS Wierzbice',
        away: live.awayLabel || match?.awayTeamLabel || '—',
        sh: clampInt(live.scoreHome, 0),
        sa: clampInt(live.scoreAway, 0),
        events: Array.isArray(live.events)
          ? [...live.events]
              .slice(0, 30)
              .sort((a: any, b: any) => {
                const ma = typeof a?.minute === 'number' ? a.minute : 9999
                const mb = typeof b?.minute === 'number' ? b.minute : 9999
                if (ma !== mb) return ma - mb
                return 0
              })
              .slice(-12)
          : [],
      }
    : null

  const isMobile = useIsMobile()

  // Gate: Studio Live ma sens TYLKO gdy trwa aktywna relacja.
  // - live === null  → wciąż się ładuje (pokazujemy spinner)
  // - !live.enabled lub status='ft' → poprzedni mecz zakończony lub brak relacji.
  //   Pokazujemy przyjazny komunikat z CTA do "Utwórz mecz live", zamiast pustego interfejsu sterowania.
  const liveActive = Boolean(live?.enabled && live?.status && live.status !== 'ft')
  if (live === null) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b1f14',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        }}
      >
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Wczytuję relację…</div>
      </div>
    )
  }
  if (!liveActive) {
    return <NoActiveLive endedRecently={live?.status === 'ft'} />
  }

  if (isMobile) {
    return (
      <MobileLiveStudio
        live={live}
        clock={clock}
        busy={busy}
        err={err}
        preview={preview}
        currentState={currentState}
        canStartMatch={canStartMatch}
        canEndFirstHalf={canEndFirstHalf}
        canStartSecondHalf={canStartSecondHalf}
        canEndMatch={canEndMatch}
        match={match}
        lineup={lineup}
        setState={setState}
        patch={patch}
        pauseMatch={pauseMatch}
        resumeMatch={resumeMatch}
        quickGoalWksFromPlus={quickGoalWksFromPlus}
        quickGoalOpponent={quickGoalOpponent}
        undoLastGoalFor={undoLastGoalFor}
        openGoalModal={openGoalModal}
        addCard={addCard}
        undoLast={undoLast}
        deleteEventAt={deleteEventAt}
        openEdit={openEdit}
        pickSuggestedLeagueMatch={pickSuggestedLeagueMatch}
        fmtEventText={fmtEventText}
        eventSide={eventSide}
        goalModalOpen={goalModalOpen}
        goalMinute={goalMinute}
        goalScorerId={goalScorerId}
        goalAssistId={goalAssistId}
        goalScorerText={goalScorerText}
        goalAssistText={goalAssistText}
        goalOwnGoal={goalOwnGoal}
        setGoalModalOpen={setGoalModalOpen}
        setGoalMinute={setGoalMinute}
        setGoalScorerId={setGoalScorerId}
        setGoalAssistId={setGoalAssistId}
        setGoalScorerText={setGoalScorerText}
        setGoalAssistText={setGoalAssistText}
        setGoalOwnGoal={setGoalOwnGoal}
        submitGoalWks={submitGoalWks}
        editOpen={editOpen}
        editIndex={editIndex}
        editMinute={editMinute}
        editOwnGoal={editOwnGoal}
        editScorerText={editScorerText}
        editAssistText={editAssistText}
        editScorerOpponentText={editScorerOpponentText}
        editAssistOpponentText={editAssistOpponentText}
        editText={editText}
        setEditOpen={setEditOpen}
        setEditMinute={setEditMinute}
        setEditOwnGoal={setEditOwnGoal}
        setEditScorerText={setEditScorerText}
        setEditAssistText={setEditAssistText}
        setEditScorerOpponentText={setEditScorerOpponentText}
        setEditAssistOpponentText={setEditAssistOpponentText}
        setEditText={setEditText}
        saveEdit={saveEdit}
      />
    )
  }

  return (
    <div className="wks-live-studio" style={{ minHeight: '100vh', background: '#0b1f14', color: T.text, padding: 18, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <a href="/admin/globals/liveMatch" style={{ color: T.muted, textDecoration: 'none', fontWeight: 600 }}>
          ← LiveMatch
        </a>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Studio Live
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.subtle }}>{preview ? `${preview.time} · ${preview.state}` : '—'}</span>
          {err && <span style={{ fontSize: 12, color: '#fca5a5' }}>{err}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>
        {/* Preview */}
        <div
          style={{
            background: `radial-gradient(1200px 500px at 20% 40%, rgba(22,101,52,0.55), rgba(15,42,28,1))`,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 18,
            minHeight: 520,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 'min(620px, 92%)',
              borderRadius: 16,
              border: `1px solid ${T.panelBorder}`,
              background: T.panel,
              backdropFilter: 'blur(10px)',
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.muted, fontWeight: 800 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: T.red, boxShadow: '0 0 0 6px rgba(220,38,38,0.14)' }} />
                  Relacja na żywo
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: T.subtle, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {preview?.competition}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  <span data-preview-state>{preview?.state ?? '—'}</span>
                  <span style={{ opacity: 0.35 }}>•</span>
                  <span data-preview-time style={{ fontWeight: 900, color: 'rgba(255,255,255,0.90)' }}>{preview?.time ?? '—'}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'end' }}>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview?.home ?? 'WKS'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 14 }}>
                <span style={{ fontSize: 56, fontWeight: 1000 as any, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {preview?.sh ?? 0}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.subtle, fontWeight: 900 }}>
                    {preview?.state ?? '—'}
                  </div>
                  <div data-preview-time style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.96)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                    {preview?.time ?? '—'}
                  </div>
                </div>
                <span style={{ fontSize: 56, fontWeight: 1000 as any, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {preview?.sa ?? 0}
                </span>
              </div>

              <div style={{ minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview?.away ?? '—'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 12 }}>
              {(() => {
                const homeList = (preview?.events ?? []).filter((e: any) => eventSide(e) === 'home').slice(0, 6)
                const awayList = (preview?.events ?? []).filter((e: any) => eventSide(e) === 'away').slice(0, 6)
                if (!homeList.length && !awayList.length) return null

                const renderList = (list: any[]) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {list.map((e: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.86)' }}>
                        <div style={{ width: 38, color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                          {typeof e?.minute === 'number' ? `${e.minute}'` : ''}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fmtEventText(e)}
                        </div>
                      </div>
                    ))}
                  </div>
                )

                return (
                  <>
                    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.subtle, fontWeight: 800 }}>
                      Zdarzenia
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ padding: 0 }}>{renderList(homeList)}</div>
                      <div style={{ padding: 0 }}>{renderList(awayList)}</div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            padding: 14,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>
            Sterowanie
          </div>

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              disabled={busy || !canStartMatch}
              onClick={() => setState('live')}
              style={{ padding: '10px 10px', borderRadius: 12, opacity: canStartMatch ? 1 : 0.55 }}
              title={canStartMatch ? '' : 'Dozwolone tylko przed meczem'}
            >
              Start meczu
            </button>
            <button
              disabled={busy || !canEndFirstHalf}
              onClick={() => setState('ht')}
              style={{ padding: '10px 10px', borderRadius: 12, opacity: canEndFirstHalf ? 1 : 0.55 }}
              title={canEndFirstHalf ? '' : 'Dozwolone tylko w 1. połowie'}
            >
              Koniec 1. połowy
            </button>
            <button
              disabled={busy || !canStartSecondHalf}
              onClick={() => setState('live2')}
              style={{ padding: '10px 10px', borderRadius: 12, opacity: canStartSecondHalf ? 1 : 0.55 }}
              title={canStartSecondHalf ? '' : 'Dozwolone tylko w przerwie'}
            >
              Start 2. połowy
            </button>
            <button
              disabled={busy || !canEndMatch}
              onClick={() => setState('ft')}
              style={{ padding: '10px 10px', borderRadius: 12, opacity: canEndMatch ? 1 : 0.55 }}
              title={canEndMatch ? '' : 'Dozwolone tylko w 2. połowie'}
            >
              Koniec meczu
            </button>
          </div>

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              disabled={busy || !(currentState === 'live' || currentState === 'live2') || Boolean(live?.pauseAt)}
              onClick={pauseMatch}
              title="Zatrzymuje zegar (bez zmiany połowy)"
            >
              Pauza
            </button>
            <button
              disabled={busy || !(currentState === 'live' || currentState === 'live2') || !Boolean(live?.pauseAt)}
              onClick={resumeMatch}
              title="Wznawia zegar (bez zmiany połowy)"
            >
              Wznów
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.subtle, marginBottom: 6 }}>Wynik (WKS)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={busy} onClick={quickGoalWksFromPlus} style={{ flex: 1 }} title="Dodaje gola (z minutą)">
                  +1
                </button>
                <button
                  disabled={busy}
                  onClick={() => undoLastGoalFor('wks')}
                  style={{ flex: 1 }}
                  title="Cofa ostatniego gola WKS (event + wynik)"
                >
                  −1
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.subtle, marginBottom: 6 }}>Wynik (rywal)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={busy} onClick={quickGoalOpponentFromPlus} style={{ flex: 1 }} title="Dodaje gola (z minutą)">
                  +1
                </button>
                <button
                  disabled={busy}
                  onClick={() => undoLastGoalFor('opponent')}
                  style={{ flex: 1 }}
                  title="Cofa ostatniego gola rywala (event + wynik)"
                >
                  −1
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button disabled={busy} onClick={openGoalModal}>
              Gol WKS (wybierz)
            </button>
            <button disabled={busy} onClick={quickGoalOpponent}>
              Gol rywala (+1)
            </button>
          </div>

          {currentState === 'pre' && (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: T.subtle, marginBottom: 8 }}>Rodzaj meczu</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['league', 'friendly', 'cup', 'custom'] as LiveMatchKind[]).map((k) => (
                  <button
                    key={k}
                    disabled={busy}
                    onClick={() => patch({ kind: k, mode: k === 'league' ? 'fromMatch' : 'manual' })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: live?.kind === k ? 'rgba(255,255,255,0.14)' : 'transparent',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {k === 'league' ? 'Ligowy' : k === 'friendly' ? 'Sparing' : k === 'cup' ? 'Puchar' : 'Własny tekst'}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button disabled={busy} onClick={pickSuggestedLeagueMatch} style={{ flex: 1 }}>
                  Sugestia meczu ligowego
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: T.subtle, marginBottom: 8 }}>Zdarzenia</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button disabled={busy} onClick={openGoalModal}>
                Gol (WKS)
              </button>
              <button disabled={busy} onClick={quickGoalOpponent}>
                Gol (rywal)
              </button>
              <button disabled={busy} onClick={() => addCard('wks', 'yellow')}>
                Żółta (WKS)
              </button>
              <button disabled={busy} onClick={() => addCard('opponent', 'yellow')}>
                Żółta (rywal)
              </button>
              <button disabled={busy} onClick={() => addCard('wks', 'red')}>
                Czerwona (WKS)
              </button>
              <button disabled={busy} onClick={() => addCard('opponent', 'red')}>
                Czerwona (rywal)
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: T.subtle }}>Lista zdarzeń</div>
              <button disabled={busy || !(live?.events && (live.events as any[]).length)} onClick={undoLast}>
                Cofnij ostatnią akcję
              </button>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['home', 'away'] as const).map((side) => {
                const raw = Array.isArray(live?.events) ? (live!.events! as any[]) : []
                const list = raw
                  .map((ev, idx) => ({ ev, idx }))
                  .filter(({ ev }) => eventSide(ev) === side)
                  .sort((a, b) => {
                    const ma = typeof a.ev?.minute === 'number' ? a.ev.minute : 9999
                    const mb = typeof b.ev?.minute === 'number' ? b.ev.minute : 9999
                    if (ma !== mb) return ma - mb
                    return a.idx - b.idx
                  })
                return (
                  <div key={side} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.16)', padding: 10 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.70)', fontWeight: 900 }}>
                      {side === 'home' ? preview?.home : preview?.away}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {list.length ? (
                        list.map(({ ev, idx }) => (
                          <div
                            key={idx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '54px 1fr auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: 10,
                              borderRadius: 14,
                              border: '1px solid rgba(255,255,255,0.10)',
                              background: 'rgba(0,0,0,0.18)',
                            }}
                          >
                            <div style={{ fontSize: 12, color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
                              {typeof ev?.minute === 'number' ? `${ev.minute}'` : '—'}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.88)',
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fmtEventText(ev).trim() || '(bez opisu)'}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button disabled={busy} onClick={() => openEdit(idx)}>
                                Edytuj
                              </button>
                              <button disabled={busy} onClick={() => deleteEventAt(idx)}>
                                Usuń
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: T.subtle, fontSize: 13 }}>Brak zdarzeń.</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: T.subtle }}>
            Zmiany zapisują się automatycznie.
          </div>
        </div>
      </div>

      {goalModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setGoalModalOpen(false)}
        >
          <div
            style={{
              width: 'min(520px, 96vw)',
              borderRadius: 16,
              background: '#0b1f14',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: 14,
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12, color: T.muted }}>
                Gol WKS
              </div>
              <button onClick={() => setGoalModalOpen(false)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Minuta
                <input
                  type="number"
                  value={goalMinute}
                  min={0}
                  onChange={(e) => setGoalMinute(Number(e.target.value))}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Strzelec (z kadry)
                <select
                  value={goalScorerId}
                  onChange={(e) => setGoalScorerId(e.target.value)}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                >
                  {lineup.length === 0 && (
                    <option value="">
                      Brak kadry — ustaw mecz w LiveMatch (tryb: Z terminarza) lub użyj „Sugestia meczu ligowego”
                    </option>
                  )}
                  {lineup.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Strzelec (tekst, opcjonalnie)
                <input
                  value={goalScorerText}
                  onChange={(e) => setGoalScorerText(e.target.value)}
                  placeholder="np. Testowy (gdy nie ma na liście)"
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Asysta (z kadry, opcjonalnie)
                <select
                  value={goalAssistId}
                  onChange={(e) => setGoalAssistId(e.target.value)}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                >
                  <option value="">— brak —</option>
                  {lineup.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Asysta (tekst, opcjonalnie)
                <input
                  value={goalAssistText}
                  onChange={(e) => setGoalAssistText(e.target.value)}
                  placeholder="np. Kowalski (jeśli spoza listy)"
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                />
              </label>

              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: T.muted }}>
                <input type="checkbox" checked={goalOwnGoal} onChange={(e) => setGoalOwnGoal(e.target.checked)} />
                Samobój
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button disabled={busy} onClick={() => setGoalModalOpen(false)} style={{ padding: '10px 12px', borderRadius: 12 }}>
                  Anuluj
                </button>
                <button
                  disabled={busy || (!goalScorerId && !goalScorerText.trim())}
                  onClick={submitGoalWks}
                  style={{ padding: '10px 12px', borderRadius: 12, background: '#166534', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800 }}
                >
                  Zapisz gol (+1)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 60,
          }}
          onClick={() => setEditOpen(false)}
        >
          <div
            style={{
              width: 'min(520px, 96vw)',
              borderRadius: 16,
              background: '#0b1f14',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: 14,
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12, color: T.muted }}>
                Edycja zdarzenia
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                Minuta
                <input
                  type="number"
                  value={editMinute}
                  min={0}
                  onChange={(e) => setEditMinute(Number(e.target.value))}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                />
              </label>

              {(() => {
                const ev = Array.isArray(live?.events) ? (live!.events! as any[])[editIndex] : null
                const isGoal = ev?.type === 'goal'
                const team = String(ev?.team ?? '')
                if (!isGoal) {
                  return (
                    <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                      Treść
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                      />
                    </label>
                  )
                }
                return (
                  <>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: T.muted }}>
                      <input type="checkbox" checked={editOwnGoal} onChange={(e) => setEditOwnGoal(e.target.checked)} />
                      Samobój
                    </label>
                    {team === 'wks' ? (
                      <>
                        <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                          Strzelec (tekst, opcjonalnie)
                          <input
                            value={editScorerText}
                            onChange={(e) => setEditScorerText(e.target.value)}
                            style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                          />
                        </label>
                        <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                          Asysta (tekst, opcjonalnie)
                          <input
                            value={editAssistText}
                            onChange={(e) => setEditAssistText(e.target.value)}
                            style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                          Strzelec (rywal)
                          <input
                            value={editScorerOpponentText}
                            onChange={(e) => setEditScorerOpponentText(e.target.value)}
                            style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                          />
                        </label>
                        <label style={{ display: 'grid', gap: 6, fontSize: 12, color: T.muted }}>
                          Asysta (rywal, opcjonalnie)
                          <input
                            value={editAssistOpponentText}
                            onChange={(e) => setEditAssistOpponentText(e.target.value)}
                            style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                          />
                        </label>
                      </>
                    )}
                  </>
                )
              })()}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button disabled={busy} onClick={() => setEditOpen(false)} style={{ padding: '10px 12px', borderRadius: 12 }}>
                  Anuluj
                </button>
                <button
                  disabled={busy}
                  onClick={saveEdit}
                  style={{ padding: '10px 12px', borderRadius: 12, background: '#1d4ed8', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800 }}
                >
                  Zapisz zmiany
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Ekran "brak aktywnej relacji". Pokazuje się gdy ktoś wejdzie do /admin/live-studio
 * a nie ma aktualnie aktywnego live (poprzedni mecz zakończony albo nigdy nie był utworzony).
 * Mobile-first, single column, jasny przekaz: "tu nic teraz nie sterujesz, idź utworzyć mecz".
 */
function NoActiveLive({ endedRecently }: { endedRecently?: boolean }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1f14',
        color: '#fff',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.06)',
            marginBottom: 14,
            fontSize: 28,
          }}
        >
          {endedRecently ? '🏁' : '⚪'}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          Studio Live
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '6px 0 10px', letterSpacing: '-0.01em' }}>
          {endedRecently ? 'Mecz zakończony' : 'Brak aktywnej relacji'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: '0 0 20px', lineHeight: 1.5 }}>
          {endedRecently
            ? 'Ostatnia relacja została zamknięta. Snapshot meczu trafił do Archiwum relacji — możesz tam wrócić, żeby napisać artykuł.'
            : 'Aby uruchomić Studio Live, najpierw utwórz nową relację z meczu (skonfiguruj rywala, godzinę i kadrę).'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href="/admin/live-setup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
              color: '#fff',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(22,101,52,0.40)',
              minHeight: 50,
              boxSizing: 'border-box',
            }}
          >
            ⚡ Utwórz mecz live
          </a>
          {endedRecently && (
            <a
              href="/admin/collections/liveArchives"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                minHeight: 46,
                boxSizing: 'border-box',
              }}
            >
              📋 Archiwum relacji
            </a>
          )}
          <a
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.72)',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            ← Wróć do dashboardu
          </a>
        </div>
      </div>
    </div>
  )
}

