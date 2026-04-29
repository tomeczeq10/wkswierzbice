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
  team?: { id: number; name?: string } | number | null
}

type TeamDoc = {
  id: number
  name: string
  category: string
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function toInt(x: unknown, fallback = 0): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
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

function positionGroup(pos: string | null | undefined): 'Bramkarze' | 'Obrońcy' | 'Pomocnicy' | 'Napastnicy' | 'Inni' {
  const p = String(pos ?? '').toLowerCase()
  if (p.includes('bramkarz')) return 'Bramkarze'
  if (p.includes('obro')) return 'Obrońcy'
  if (p.includes('pomocnik') || p.includes('rozgr') || p.includes('skrzy')) return 'Pomocnicy'
  if (p.includes('napastnik')) return 'Napastnicy'
  return 'Inni'
}

function labelForKind(kind: LiveMatchKind): string {
  if (kind === 'league') return 'Ligowy'
  if (kind === 'friendly') return 'Sparing'
  if (kind === 'cup') return 'Puchar'
  return 'Własny'
}

function kindFromMatch(m: MatchDoc | null): LiveMatchKind {
  if (!m) return 'league'
  return m.competitionType === 'friendly' ? 'friendly' : m.competitionType === 'cup' ? 'cup' : 'league'
}

function opponentFromMatch(m: MatchDoc | null): string {
  if (!m) return ''
  return m.wksSide === 'home' ? m.awayTeamLabel : m.homeTeamLabel
}

function resolveMatchLabels({
  opponent,
  wksSide,
}: {
  opponent: string
  wksSide: 'home' | 'away'
}): { homeTeamLabel: string; awayTeamLabel: string; venue: 'home' | 'away' } {
  const opp = opponent.trim() || 'Rywal'
  if (wksSide === 'home') return { homeTeamLabel: 'WKS Wierzbice', awayTeamLabel: opp, venue: 'home' }
  return { homeTeamLabel: opp, awayTeamLabel: 'WKS Wierzbice', venue: 'away' }
}

export default function LiveStartModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const baseUrl = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), [])

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [suggested, setSuggested] = useState<MatchDoc | null>(null)
  const [useSuggested, setUseSuggested] = useState(true)

  const [kind, setKind] = useState<LiveMatchKind>('league')
  const [wksSide, setWksSide] = useState<'home' | 'away'>('home')
  const [opponent, setOpponent] = useState('')
  const [kickoffPlannedLocal, setKickoffPlannedLocal] = useState('')

  const [seniorTeam, setSeniorTeam] = useState<TeamDoc | null>(null)
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const fetchSuggested = useCallback(async () => {
    const nowIso = new Date().toISOString()
    const url = new URL(`${baseUrl}/api/matches`)
    url.searchParams.set('limit', '1')
    url.searchParams.set('sort', 'kickoffPlanned')
    url.searchParams.set('depth', '1')
    url.searchParams.set('where[kickoffPlanned][greater_than_equal]', nowIso)
    const res = await fetch(url.toString(), { credentials: 'include', headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const doc = Array.isArray(json?.docs) ? json.docs[0] : null
    return (doc as MatchDoc) ?? null
  }, [baseUrl])

  const fetchSeniorTeam = useCallback(async () => {
    const url = new URL(`${baseUrl}/api/teams`)
    url.searchParams.set('limit', '1')
    url.searchParams.set('sort', '-order')
    url.searchParams.set('depth', '0')
    url.searchParams.set('where[category][equals]', 'seniorzy')
    const res = await fetch(url.toString(), { credentials: 'include', headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const doc = Array.isArray(json?.docs) ? json.docs[0] : null
    if (!doc) return null
    return doc as TeamDoc
  }, [baseUrl])

  const fetchPlayers = useCallback(
    async (teamId: number | null) => {
      if (!teamId) return []
      const url = new URL(`${baseUrl}/api/players`)
      url.searchParams.set('limit', '200')
      url.searchParams.set('sort', 'number')
      url.searchParams.set('depth', '0')
      url.searchParams.set('where[team][equals]', String(teamId))
      const res = await fetch(url.toString(), { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!res.ok) return []
      const json = await res.json()
      return (Array.isArray(json?.docs) ? json.docs : []) as PlayerDoc[]
    },
    [baseUrl],
  )

  const resetFromSuggested = useCallback((m: MatchDoc | null) => {
    setSuggested(m)
    setUseSuggested(Boolean(m))
    setKind(kindFromMatch(m))
    setWksSide(m?.wksSide ?? 'home')
    setOpponent(opponentFromMatch(m))
    setKickoffPlannedLocal(toLocalInputValue(m?.kickoffPlanned ?? null))

    const lineupIds = Array.isArray(m?.lineup)
      ? (m!.lineup! as any[])
          .map((x) => (typeof x === 'number' ? x : toInt((x as any)?.id, 0)))
          .filter((id) => Number.isFinite(id) && id > 0)
      : []
    setSelected(new Set(lineupIds))
  }, [])

  useEffect(() => {
    if (!open) return
    setErr(null)
    setBusy(true)
    Promise.all([fetchSuggested(), fetchSeniorTeam()])
      .then(([m, st]) => {
        setSeniorTeam(st)
        resetFromSuggested(m)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }, [open, fetchSuggested, fetchSeniorTeam, resetFromSuggested])

  useEffect(() => {
    if (!open) return
    const suggestedTeamId = (() => {
      const m = suggested
      if (!m?.wksTeam) return null
      if (typeof m.wksTeam === 'number') return m.wksTeam
      if (isRecord(m.wksTeam) && typeof (m.wksTeam as any).id === 'number') return (m.wksTeam as any).id as number
      return null
    })()
    const teamId = suggestedTeamId ?? seniorTeam?.id ?? null

    fetchPlayers(teamId)
      .then(setPlayers)
      .catch(() => setPlayers([]))
  }, [open, suggested, seniorTeam, fetchPlayers])

  const groupedPlayers = useMemo(() => {
    const arr = [...players]
    arr.sort((a, b) => (toInt(a.number, 999) - toInt(b.number, 999)) || a.name.localeCompare(b.name, 'pl'))
    const groups: Record<string, PlayerDoc[]> = { Bramkarze: [], Obrońcy: [], Pomocnicy: [], Napastnicy: [], Inni: [] }
    for (const p of arr) groups[positionGroup(p.position)].push(p)
    return groups as Record<'Bramkarze' | 'Obrońcy' | 'Pomocnicy' | 'Napastnicy' | 'Inni', PlayerDoc[]>
  }, [players])

  const togglePlayer = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllInGroup = useCallback((ids: number[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  const clearAllInGroup = useCallback((ids: number[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [])

  const save = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const kickoffIso = fromLocalInputValue(kickoffPlannedLocal) ?? (suggested?.kickoffPlanned ?? null)
      if (!kickoffIso) throw new Error('Ustaw godzinę rozpoczęcia.')

      const matchup = resolveMatchLabels({ opponent, wksSide })
      const lineupIds = [...selected].sort((a, b) => a - b)

      let matchId: number
      let matchLabels: { homeTeamLabel: string; awayTeamLabel: string }

      if (useSuggested && suggested?.id) {
        matchId = suggested.id
        matchLabels = { homeTeamLabel: matchup.homeTeamLabel, awayTeamLabel: matchup.awayTeamLabel }

        const res = await fetch(`${baseUrl}/api/matches/${matchId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            competitionType: kind === 'custom' ? suggested.competitionType : kind,
            kickoffPlanned: kickoffIso,
            venue: matchup.venue,
            wksSide,
            homeTeamLabel: matchup.homeTeamLabel,
            awayTeamLabel: matchup.awayTeamLabel,
            lineup: lineupIds,
          }),
        })
        if (!res.ok) throw new Error(`Nie udało się zapisać meczu (HTTP ${res.status})`)
      } else {
        const res = await fetch(`${baseUrl}/api/matches`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            competitionType: kind === 'custom' ? 'friendly' : kind,
            competitionLabel: null,
            kickoffPlanned: kickoffIso,
            venue: matchup.venue,
            locationLabel: null,
            wksSide,
            homeTeamLabel: matchup.homeTeamLabel,
            awayTeamLabel: matchup.awayTeamLabel,
            lineup: lineupIds,
          }),
        })
        if (!res.ok) throw new Error(`Nie udało się utworzyć meczu (HTTP ${res.status})`)
        const doc = (await res.json()) as MatchDoc
        matchId = doc.id
        matchLabels = { homeTeamLabel: doc.homeTeamLabel, awayTeamLabel: doc.awayTeamLabel }
      }

      const res2 = await fetch(`${baseUrl}/api/globals/liveMatch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled: true,
          status: 'pre',
          mode: 'fromMatch',
          kind,
          match: matchId,
          kickoffPlanned: kickoffIso,
          kickoffReal: null,
          pauseAt: null,
          resumeAt: null,
          addedTime1: 0,
          addedTime2: 0,
          homeLabel: matchLabels.homeTeamLabel,
          awayLabel: matchLabels.awayTeamLabel,
          scoreHome: 0,
          scoreAway: 0,
          events: [],
        }),
      })
      if (!res2.ok) throw new Error(`Nie udało się ustawić LiveMatch (HTTP ${res2.status})`)

      window.location.href = '/admin/live-studio'
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [baseUrl, kickoffPlannedLocal, kind, opponent, selected, suggested, useSuggested, wksSide])

  if (!open) return null

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'grid',
    placeItems: 'center',
    padding: 18,
    zIndex: 80,
  }
  const panel: React.CSSProperties = {
    width: 'min(920px, 96vw)',
    borderRadius: 16,
    background: '#0b1f14',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#fff',
    padding: 16,
    boxSizing: 'border-box',
    maxHeight: '88vh',
    overflow: 'hidden',
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 1000 as any, letterSpacing: '0.10em', textTransform: 'uppercase', fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
              Rozpocznij mecz live
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>
              {seniorTeam?.name ? `Skład: ${seniorTeam.name}` : 'Skład: Seniorzy'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1.3fr',
            gap: 14,
            alignItems: 'start',
            height: 'calc(88vh - 86px)',
            minHeight: 420,
          }}
        >
          {/* Left: essentials */}
          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', padding: 12, overflow: 'auto' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>Podstawy</div>

            {suggested && (
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>
                <input type="checkbox" checked={useSuggested} onChange={(e) => setUseSuggested(e.target.checked)} />
                Użyj sugerowanego meczu z terminarza
              </label>
            )}

            {suggested && useSuggested && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  {suggested.homeTeamLabel} <span style={{ opacity: 0.6 }}>vs</span> {suggested.awayTeamLabel}
                </div>
                <div style={{ marginTop: 3, fontSize: 11, opacity: 0.75 }}>
                  {suggested.kickoffPlanned ? new Date(suggested.kickoffPlanned).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(['league', 'friendly', 'cup', 'custom'] as LiveMatchKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={busy}
                  onClick={() => setKind(k)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: kind === k ? 'rgba(255,255,255,0.16)' : 'transparent',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {labelForKind(k)}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                WKS gra
                <select
                  value={wksSide}
                  disabled={busy}
                  onChange={(e) => setWksSide(e.target.value === 'away' ? 'away' : 'home')}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                >
                  <option value="home">u siebie</option>
                  <option value="away">na wyjeździe</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                Start (planowany)
                <input
                  type="datetime-local"
                  value={kickoffPlannedLocal}
                  disabled={busy}
                  onChange={(e) => setKickoffPlannedLocal(e.target.value)}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 10 }}>
              Przeciwnik
              <input
                value={opponent}
                disabled={busy}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="np. Polonia Bielany Wrocławskie"
                style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
              />
            </label>

            {err && <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>{err}</div>}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                disabled={busy}
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.88)',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                Anuluj
              </button>
              <button
                disabled={busy || !opponent.trim() || !kickoffPlannedLocal}
                type="button"
                onClick={save}
                style={{ padding: '10px 12px', borderRadius: 12, background: '#166534', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 900 }}
              >
                {busy ? 'Zapisuję…' : 'Przejdź do Studia'}
              </button>
            </div>
          </div>

          {/* Right: lineup */}
          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', padding: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Skład (WKS)</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{selected.size} zaznaczonych</div>
            </div>

            <div style={{ marginTop: 10, height: 'calc(88vh - 150px)', minHeight: 300, overflow: 'auto', paddingRight: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(Object.keys(groupedPlayers) as Array<keyof typeof groupedPlayers>).map((g) => {
                const list = groupedPlayers[g]
                if (!list.length) return null
                const ids = list.map((p) => p.id)
                return (
                  <div key={g} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.16)', padding: 10, minHeight: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>{g}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={busy} onClick={() => selectAllInGroup(ids)} style={{ fontSize: 11 }}>
                          Wszystkich
                        </button>
                        <button type="button" disabled={busy} onClick={() => clearAllInGroup(ids)} style={{ fontSize: 11 }}>
                          Wyczyść
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {list.map((p) => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => togglePlayer(p.id)} />
                          <span style={{ width: 26, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
                            {p.number != null ? String(p.number) : ''}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
              </div>
            </div>

            {players.length === 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Brak zawodników do wyświetlenia dla drużyny Seniorów. Dodaj ich w kolekcji „Zawodnicy” i przypisz do drużyny „Seniorzy”.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

