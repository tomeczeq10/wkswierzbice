'use client'

/**
 * LiveSetupPage
 * ────────────────────────────────────────────────────────────────────────────
 * Dedicated, full-page form for starting a new live relation.
 * Replaces the chaotic /admin/globals/liveMatch view + LiveStartModal flow.
 *
 * One step:
 *  1. Pick competition kind (league / friendly / cup)
 *  2. Pick from schedule OR enter opponent + venue manually
 *  3. Set kickoff date+time
 *  4. Pick lineup (senior squad players, grouped by position)
 *  5. Submit → creates/updates Match in `Matches` collection,
 *     sets `liveMatch` global to status=pre, redirects to /admin/live-studio
 *
 * Mobile-first: single column, inputs ≥ 16px font, tap-targets ≥ 44px.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'

type LiveMatchKind = 'league' | 'friendly' | 'cup' | 'custom'

type MatchDoc = {
  id: number
  competitionType: 'league' | 'friendly' | 'cup'
  competitionLabel?: string | null
  kickoffPlanned: string
  venue: 'home' | 'away' | 'neutral'
  homeTeamLabel: string
  awayTeamLabel: string
  wksSide: 'home' | 'away'
  wksTeam?: { id: number } | number | null
  lineup?: Array<{ id: number; name?: string | null; number?: number | null; position?: string | null }> | number[] | null
}

type PlayerDoc = {
  id: number
  name: string
  number?: number | null
  position?: string | null
}

type TeamDoc = { id: number; name: string; category: string }

type PosGroup = 'Bramkarze' | 'Obrońcy' | 'Pomocnicy' | 'Napastnicy' | 'Inni'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function toInt(x: unknown, fb = 0): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? Math.trunc(n) : fb
}

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function toLocalInputValue(iso: string | null | undefined): string {
  const d = parseIso(iso)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function positionGroup(pos: string | null | undefined): PosGroup {
  const p = String(pos ?? '').toLowerCase()
  if (p.includes('bramkarz')) return 'Bramkarze'
  if (p.includes('obro')) return 'Obrońcy'
  if (p.includes('pomocnik') || p.includes('rozgr') || p.includes('skrzy')) return 'Pomocnicy'
  if (p.includes('napastnik')) return 'Napastnicy'
  return 'Inni'
}

function fmtMatchPreview(m: MatchDoc): string {
  const home = m.homeTeamLabel ?? '?'
  const away = m.awayTeamLabel ?? '?'
  const d = parseIso(m.kickoffPlanned)
  const date = d ? d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '?'
  const time = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '?'
  return `${home} vs ${away} · ${date} ${time}`
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

const T = {
  bg: '#f8fafc',
  surface: '#ffffff',
  border: 'rgba(15, 23, 42, 0.10)',
  borderHi: 'rgba(15, 23, 42, 0.18)',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#94a3b8',
  green: '#166534',
  greenDk: '#14532d',
  greenLt: '#dcfce7',
  red: '#dc2626',
  redLt: '#fef2f2',
  amber: '#b45309',
  amberLt: '#fef3c7',
  ink: '#0f2a1c',
  blue: '#2563eb',
  blueLt: '#eff6ff',
}

// ─── UI primitives ───────────────────────────────────────────────────────────

function Card({ children, padding = 16 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: T.subtle,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 16px',
        borderRadius: 99,
        border: `1px solid ${active ? T.green : T.border}`,
        background: active ? T.green : T.surface,
        color: active ? '#fff' : T.text,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        opacity: disabled ? 0.5 : 1,
        minHeight: 44,
      }}
    >
      {children}
    </button>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: 16, // 16px = no auto-zoom on iOS focus
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    background: T.surface,
    color: T.text,
    minHeight: 48,
    outline: 'none',
    fontFamily: 'inherit',
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{children}</div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LiveSetupPage() {
  const baseUrl = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), [])

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  // Source: from schedule OR manual
  const [source, setSource] = useState<'schedule' | 'manual'>('schedule')

  // Schedule list (upcoming matches)
  const [upcoming, setUpcoming] = useState<MatchDoc[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const selectedMatch = useMemo(() => upcoming.find((m) => m.id === selectedMatchId) ?? null, [upcoming, selectedMatchId])

  // Form state
  const [kind, setKind] = useState<LiveMatchKind>('league')
  const [customKindLabel, setCustomKindLabel] = useState('')
  const [wksSide, setWksSide] = useState<'home' | 'away'>('home')
  const [opponent, setOpponent] = useState('')
  const [kickoffLocal, setKickoffLocal] = useState('')

  // Lineup
  const [seniorTeam, setSeniorTeam] = useState<TeamDoc | null>(null)
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<PosGroup>>(new Set())

  // ── Loaders ─────────────────────────────────────────────────────────────

  const fetchUpcoming = useCallback(async (): Promise<MatchDoc[]> => {
    const url = new URL(`${baseUrl}/api/matches`)
    url.searchParams.set('limit', '20')
    url.searchParams.set('sort', 'kickoffPlanned')
    url.searchParams.set('depth', '1')
    // Show matches from "1h ago" forward (so a match starting now is still selectable)
    url.searchParams.set('where[kickoffPlanned][greater_than_equal]', new Date(Date.now() - 3600_000).toISOString())
    const res = await fetch(url.toString(), { credentials: 'include' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.docs) ? (json.docs as MatchDoc[]) : []
  }, [baseUrl])

  const fetchSeniorTeam = useCallback(async (): Promise<TeamDoc | null> => {
    const url = new URL(`${baseUrl}/api/teams`)
    url.searchParams.set('limit', '1')
    url.searchParams.set('depth', '0')
    url.searchParams.set('where[category][equals]', 'seniorzy')
    const res = await fetch(url.toString(), { credentials: 'include' })
    if (!res.ok) return null
    const json = await res.json()
    return Array.isArray(json?.docs) && json.docs[0] ? (json.docs[0] as TeamDoc) : null
  }, [baseUrl])

  const fetchPlayers = useCallback(
    async (teamId: number | null): Promise<PlayerDoc[]> => {
      if (!teamId) return []
      const url = new URL(`${baseUrl}/api/players`)
      url.searchParams.set('limit', '200')
      url.searchParams.set('sort', 'number')
      url.searchParams.set('depth', '0')
      url.searchParams.set('where[team][equals]', String(teamId))
      const res = await fetch(url.toString(), { credentials: 'include' })
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json?.docs) ? (json.docs as PlayerDoc[]) : []
    },
    [baseUrl],
  )

  // ── Initial load ────────────────────────────────────────────────────────

  useEffect(() => {
    setBootstrapping(true)
    // Read ?matchId query param to pre-select a specific match (used by "Włącz live" CTA on dashboard)
    const wantedMatchId = (() => {
      if (typeof window === 'undefined') return null
      const sp = new URLSearchParams(window.location.search)
      const v = sp.get('matchId')
      const n = v ? Number(v) : NaN
      return Number.isFinite(n) && n > 0 ? n : null
    })()

    Promise.all([fetchUpcoming(), fetchSeniorTeam()])
      .then(async ([up, st]) => {
        setUpcoming(up)
        setSeniorTeam(st)

        // Choose default match: ?matchId wins, then closest upcoming, then manual
        const wanted = wantedMatchId ? up.find((m) => m.id === wantedMatchId) : null
        const def = wanted ?? up[0] ?? null
        if (def) {
          applyMatchToForm(def)
        } else {
          setSource('manual')
          const d = new Date()
          d.setMinutes(0, 0, 0)
          d.setHours(d.getHours() + 1)
          setKickoffLocal(toLocalInputValue(d.toISOString()))
        }

        // Players: fetch from selected match's wksTeam, fall back to senior team
        const teamId = (def?.wksTeam ? (typeof def.wksTeam === 'number' ? def.wksTeam : (def.wksTeam as any)?.id) : null) ?? st?.id ?? null
        const ps = await fetchPlayers(teamId)
        setPlayers(ps)

        if (def?.lineup && Array.isArray(def.lineup)) {
          const ids = def.lineup
            .map((x: any) => (typeof x === 'number' ? x : toInt(x?.id, 0)))
            .filter((x: number) => x > 0)
          setSelectedPlayers(new Set(ids))
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBootstrapping(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Apply schedule match to form ────────────────────────────────────────

  function applyMatchToForm(m: MatchDoc) {
    setSelectedMatchId(m.id)
    setKind(m.competitionType ?? 'league')
    setWksSide(m.wksSide ?? 'home')
    const opp = m.wksSide === 'home' ? m.awayTeamLabel : m.homeTeamLabel
    setOpponent(opp ?? '')
    setKickoffLocal(toLocalInputValue(m.kickoffPlanned))
    if (Array.isArray(m.lineup)) {
      const ids = (m.lineup as any[])
        .map((x) => (typeof x === 'number' ? x : toInt(x?.id, 0)))
        .filter((x) => x > 0)
      setSelectedPlayers(new Set(ids))
    }
  }

  // ── Lineup helpers ──────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const arr = [...players].sort(
      (a, b) => (toInt(a.number, 999) - toInt(b.number, 999)) || a.name.localeCompare(b.name, 'pl'),
    )
    const groups: Record<PosGroup, PlayerDoc[]> = { Bramkarze: [], Obrońcy: [], Pomocnicy: [], Napastnicy: [], Inni: [] }
    for (const p of arr) groups[positionGroup(p.position)].push(p)
    return groups
  }, [players])

  const togglePlayer = useCallback((id: number) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleGroup = useCallback((g: PosGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }, [])

  const groupSelectAll = useCallback((g: PosGroup) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      const ids = grouped[g].map((p) => p.id)
      const allSelected = ids.every((id) => next.has(id))
      if (allSelected) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }, [grouped])

  // ── Submit ──────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const kickoffIso = fromLocalInputValue(kickoffLocal)
      if (!kickoffIso) throw new Error('Ustaw datę i godzinę rozpoczęcia.')
      if (source === 'manual' && !opponent.trim()) throw new Error('Podaj nazwę przeciwnika.')

      const opp = opponent.trim() || 'Rywal'
      const homeLabel = wksSide === 'home' ? 'WKS Wierzbice' : opp
      const awayLabel = wksSide === 'home' ? opp : 'WKS Wierzbice'
      const venue: 'home' | 'away' = wksSide === 'home' ? 'home' : 'away'
      const lineupIds = [...selectedPlayers].sort((a, b) => a - b)

      // The Matches collection only knows league/friendly/cup. Map "custom" → "friendly"
      // and keep the user's custom label in the liveMatch global field competitionCustomLabel.
      const matchType: 'league' | 'friendly' | 'cup' = kind === 'custom' ? 'friendly' : kind

      let matchId: number

      if (source === 'schedule' && selectedMatchId) {
        matchId = selectedMatchId
        const r = await fetch(`${baseUrl}/api/matches/${matchId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            competitionType: matchType,
            kickoffPlanned: kickoffIso,
            venue,
            wksSide,
            homeTeamLabel: homeLabel,
            awayTeamLabel: awayLabel,
            lineup: lineupIds,
          }),
        })
        if (!r.ok) throw new Error(`Nie udało się zapisać meczu (HTTP ${r.status})`)
      } else {
        const r = await fetch(`${baseUrl}/api/matches`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            competitionType: matchType,
            kickoffPlanned: kickoffIso,
            venue,
            wksSide,
            homeTeamLabel: homeLabel,
            awayTeamLabel: awayLabel,
            lineup: lineupIds,
          }),
        })
        if (!r.ok) throw new Error(`Nie udało się utworzyć meczu (HTTP ${r.status})`)
        const doc = (await r.json()) as MatchDoc
        matchId = doc.id
      }

      const r2 = await fetch(`${baseUrl}/api/globals/liveMatch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled: true,
          status: 'pre',
          mode: 'fromMatch',
          kind,
          match: matchId,
          competitionCustomLabel: kind === 'custom' ? customKindLabel.trim() || null : null,
          kickoffPlanned: kickoffIso,
          kickoffReal: null,
          pauseAt: null,
          resumeAt: null,
          addedTime1: 0,
          addedTime2: 0,
          homeLabel,
          awayLabel,
          scoreHome: 0,
          scoreAway: 0,
          events: [],
        }),
      })
      if (!r2.ok) throw new Error(`Nie udało się ustawić relacji LiveMatch (HTTP ${r2.status})`)

      window.location.href = '/admin/live-studio'
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [baseUrl, customKindLabel, kickoffLocal, kind, opponent, selectedMatchId, selectedPlayers, source, wksSide])

  // ── Render ──────────────────────────────────────────────────────────────

  const selectedCount = selectedPlayers.size

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        padding: '14px 12px 96px', // bottom padding for sticky CTA
        boxSizing: 'border-box',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <a
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 10,
            background: T.surface,
            border: `1px solid ${T.border}`,
            color: T.text,
            textDecoration: 'none',
            fontSize: 18,
          }}
          aria-label="Wróć"
        >
          ←
        </a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.subtle }}>
            Nowa relacja
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Skonfiguruj mecz</div>
        </div>
      </div>

      {bootstrapping ? (
        <div style={{ padding: 24, textAlign: 'center', color: T.muted }}>Wczytuję dane…</div>
      ) : (
        <>
          {err && (
            <div
              style={{
                background: T.redLt,
                color: T.red,
                padding: '12px 14px',
                borderRadius: 10,
                fontSize: 14,
                marginBottom: 12,
                border: `1px solid ${T.red}`,
              }}
            >
              {err}
            </div>
          )}

          {/* Card 1: Source toggle */}
          <Card>
            <CardLabel>Skąd wziąć mecz?</CardLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip active={source === 'schedule'} onClick={() => setSource('schedule')}>
                📅 Z terminarza
              </Chip>
              <Chip active={source === 'manual'} onClick={() => setSource('manual')}>
                ✍️ Wpisz ręcznie
              </Chip>
            </div>
            {source === 'schedule' && (
              <div style={{ marginTop: 12 }}>
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.muted, padding: 12, background: T.amberLt, borderRadius: 10 }}>
                    Brak nadchodzących meczów w terminarzu. Wpisz mecz ręcznie.
                  </div>
                ) : (
                  <select
                    value={selectedMatchId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value)
                      const m = upcoming.find((x) => x.id === id)
                      if (m) applyMatchToForm(m)
                    }}
                    style={inputStyle()}
                  >
                    {upcoming.map((m) => (
                      <option key={m.id} value={m.id}>
                        {fmtMatchPreview(m)}
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: T.subtle }}>
                  Wybór z terminarza wstępnie wypełni rodzaj meczu, drużyny, godzinę i kadrę.
                </div>
              </div>
            )}
          </Card>

          {/* Card 2: Match details */}
          <Card>
            <CardLabel>Szczegóły meczu</CardLabel>

            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Rodzaj rozgrywek</FieldLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['league', 'friendly', 'cup', 'custom'] as LiveMatchKind[]).map((k) => (
                  <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                    {k === 'league' ? 'Ligowy' : k === 'friendly' ? 'Sparing' : k === 'cup' ? 'Puchar' : '✍️ Własny tekst'}
                  </Chip>
                ))}
              </div>
              {kind === 'custom' && (
                <input
                  type="text"
                  placeholder='np. "Turniej halowy", "Memoriał Kowalskiego"'
                  value={customKindLabel}
                  onChange={(e) => setCustomKindLabel(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <FieldLabel>WKS gra</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <Chip active={wksSide === 'home'} onClick={() => setWksSide('home')}>
                  🏠 u siebie
                </Chip>
                <Chip active={wksSide === 'away'} onClick={() => setWksSide('away')}>
                  ✈️ na wyjeździe
                </Chip>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Przeciwnik</FieldLabel>
              <input
                type="text"
                placeholder="np. Polonia Bielany Wrocławskie"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <FieldLabel>Data i godzina rozpoczęcia</FieldLabel>
              <input
                type="datetime-local"
                value={kickoffLocal}
                onChange={(e) => setKickoffLocal(e.target.value)}
                style={inputStyle()}
              />
            </div>
          </Card>

          {/* Card 3: Lineup */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <CardLabel>
                Kadra meczowa {seniorTeam ? `· ${seniorTeam.name}` : ''}
              </CardLabel>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: selectedCount > 0 ? T.green : T.subtle,
                  background: selectedCount > 0 ? T.greenLt : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 99,
                }}
              >
                {selectedCount} zaznaczonych
              </div>
            </div>

            {players.length === 0 ? (
              <div style={{ fontSize: 13, color: T.muted, padding: 12, background: T.amberLt, borderRadius: 10 }}>
                Brak zawodników w drużynie seniorów. Dodaj zawodników do drużyny seniorzy w panelu.
              </div>
            ) : (
              <div>
                {(['Bramkarze', 'Obrońcy', 'Pomocnicy', 'Napastnicy', 'Inni'] as PosGroup[]).map((g) => {
                  const list = grouped[g]
                  if (list.length === 0) return null
                  const collapsed = collapsedGroups.has(g)
                  const allSelected = list.every((p) => selectedPlayers.has(p.id))
                  const groupCount = list.filter((p) => selectedPlayers.has(p.id)).length

                  return (
                    <div key={g} style={{ marginBottom: 10, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: '#f8fafc',
                          borderBottom: collapsed ? 'none' : `1px solid ${T.border}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(g)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flex: 1,
                            minWidth: 0,
                            cursor: 'pointer',
                            font: 'inherit',
                            color: T.text,
                          }}
                        >
                          <span style={{ fontSize: 14, color: T.subtle, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .1s' }}>
                            ▶
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{g}</span>
                          <span style={{ fontSize: 12, color: T.subtle }}>
                            ({groupCount}/{list.length})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => groupSelectAll(g)}
                          style={{
                            background: allSelected ? T.greenLt : T.surface,
                            color: allSelected ? T.green : T.muted,
                            border: `1px solid ${allSelected ? T.green : T.border}`,
                            padding: '6px 10px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {allSelected ? '✓ wszyscy' : 'zaznacz'}
                        </button>
                      </div>

                      {!collapsed && (
                        <div>
                          {list.map((p, i) => {
                            const checked = selectedPlayers.has(p.id)
                            return (
                              <label
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 12px',
                                  borderBottom: i < list.length - 1 ? `1px solid ${T.border}` : 'none',
                                  cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                  background: checked ? T.greenLt : T.surface,
                                  minHeight: 48,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePlayer(p.id)}
                                  style={{ width: 22, height: 22, accentColor: T.green }}
                                />
                                <span
                                  style={{
                                    minWidth: 28,
                                    fontWeight: 800,
                                    color: T.muted,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontSize: 13,
                                  }}
                                >
                                  {p.number != null ? `#${p.number}` : '—'}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.name}
                                </span>
                                {p.position && (
                                  <span style={{ fontSize: 11, color: T.subtle, whiteSpace: 'nowrap' }}>{p.position}</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Sticky bottom CTA */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 14px calc(12px + env(safe-area-inset-bottom))',
          background: 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${T.border}`,
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 720 - 28, margin: '0 auto', display: 'flex', gap: 8 }}>
          <a
            href="/admin"
            style={{
              flex: '0 0 auto',
              padding: '14px 18px',
              borderRadius: 12,
              background: T.surface,
              border: `1px solid ${T.border}`,
              color: T.text,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Anuluj
          </a>
          <button
            type="button"
            onClick={submit}
            disabled={busy || bootstrapping}
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: 12,
              background: busy ? T.greenDk : T.green,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: busy ? 'wait' : 'pointer',
              opacity: bootstrapping ? 0.5 : 1,
              boxShadow: '0 4px 14px rgba(22,101,52,0.35)',
              minHeight: 50,
            }}
          >
            {busy ? 'Zapisuję…' : '⚡ Zapisz i przejdź do Studia'}
          </button>
        </div>
      </div>
    </div>
  )
}
