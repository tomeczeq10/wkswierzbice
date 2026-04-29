'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useField } from '@payloadcms/ui'

type MatchLineupGroupedFieldProps = {
  path: string
  data?: Record<string, unknown>
}

type PlayerLite = {
  id: string
  name: string
  position?: string | null
  number?: number | null
}

function groupKeyFromPosition(posRaw: unknown): 'gk' | 'def' | 'mid' | 'fwd' | 'other' {
  const p = String(posRaw ?? '')
    .toLowerCase()
    .trim()
  if (!p) return 'other'
  if (p.includes('bram')) return 'gk'
  if (p.includes('obro')) return 'def'
  if (p.includes('pomoc') || p.includes('rozgr') || p.includes('skrzy')) return 'mid'
  if (p.includes('napast')) return 'fwd'
  return 'other'
}

const GROUPS: Array<{ key: ReturnType<typeof groupKeyFromPosition>; label: string }> = [
  { key: 'gk', label: 'Bramkarze' },
  { key: 'def', label: 'Obrońcy' },
  { key: 'mid', label: 'Pomocnicy' },
  { key: 'fwd', label: 'Napastnicy' },
  { key: 'other', label: 'Inni' },
]

export default function MatchLineupGroupedField(props: MatchLineupGroupedFieldProps) {
  const path = props.path
  const { value, setValue } = useField<string[] | null>({ path })

  const selectedIds = useMemo(() => {
    if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
    return []
  }, [value])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const wksTeam = (props?.data as any)?.wksTeam
  const wksTeamId = typeof wksTeam === 'string' || typeof wksTeam === 'number' ? String(wksTeam) : wksTeam?.id ? String(wksTeam.id) : ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<PlayerLite[]>([])
  const [q, setQ] = useState('')

  const fetchPlayersForTeam = useCallback(async () => {
    if (!wksTeamId) return []
    const url = new URL('/api/players', window.location.origin)
    url.searchParams.set('limit', '500')
    url.searchParams.set('depth', '0')
    url.searchParams.set('sort', 'name')
    url.searchParams.set('where[team][equals]', wksTeamId)
    const res = await fetch(url.toString(), { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const docs = Array.isArray(json?.docs) ? json.docs : []
    const list: PlayerLite[] = docs
      .map((p: any) => ({
        id: String(p?.id ?? '').trim(),
        name: String(p?.name ?? '').trim(),
        position: typeof p?.position === 'string' ? p.position : null,
        number: typeof p?.number === 'number' ? p.number : null,
      }))
      .filter((p: PlayerLite) => p.id && p.name)
    return list
  }, [wksTeamId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!wksTeamId) {
        // Gating: bez drużyny WKS nie pobieramy “wszystkich” zawodników.
        setPlayers([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const list = await fetchPlayersForTeam()
        if (!cancelled) setPlayers(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fetchPlayersForTeam, wksTeamId])

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const missingSelectedIds = useMemo(() => {
    if (!selectedIds.length) return []
    if (!wksTeamId) return []
    return selectedIds.filter((id) => !byId.has(id))
  }, [byId, selectedIds, wksTeamId])

  const filteredPlayers = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return players
    return players.filter((p) => `${p.name} ${p.number ?? ''} ${p.position ?? ''}`.toLowerCase().includes(qq))
  }, [players, q])

  const sortPlayers = useCallback((list: PlayerLite[]) => {
    const copy = [...list]
    copy.sort((a, b) => {
      const an = typeof a.number === 'number' ? a.number : Number.POSITIVE_INFINITY
      const bn = typeof b.number === 'number' ? b.number : Number.POSITIVE_INFINITY
      if (an !== bn) return an - bn
      return a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
    })
    return copy
  }, [])

  const grouped = useMemo(() => {
    const out: Record<string, PlayerLite[]> = { gk: [], def: [], mid: [], fwd: [], other: [] }
    for (const p of filteredPlayers) out[groupKeyFromPosition(p.position)].push(p)
    for (const k of Object.keys(out)) out[k] = sortPlayers(out[k])
    return out as Record<ReturnType<typeof groupKeyFromPosition>, PlayerLite[]>
  }, [filteredPlayers, sortPlayers])

  const selectedGrouped = useMemo(() => {
    const out: Record<string, PlayerLite[]> = { gk: [], def: [], mid: [], fwd: [], other: [] }
    for (const id of selectedIds) {
      const p = byId.get(id)
      if (!p) continue
      out[groupKeyFromPosition(p.position)].push(p)
    }
    for (const k of Object.keys(out)) out[k] = sortPlayers(out[k])
    return out as Record<ReturnType<typeof groupKeyFromPosition>, PlayerLite[]>
  }, [byId, selectedIds, sortPlayers])

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setValue(Array.from(next))
    },
    [selectedIds, setValue],
  )

  const removeMissing = useCallback(() => {
    if (!missingSelectedIds.length) return
    const next = selectedIds.filter((id) => !missingSelectedIds.includes(id))
    setValue(next)
  }, [missingSelectedIds, selectedIds, setValue])

  const fillFromTeam = useCallback(async () => {
    if (!wksTeamId) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchPlayersForTeam()
      const ids = list.map((p) => p.id)
      setPlayers(list)
      setValue(ids)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [fetchPlayersForTeam, setValue, wksTeamId])

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {!wksTeamId && (
        <div style={{ fontSize: 12, opacity: 0.85, padding: 12, borderRadius: 14, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(15,42,28,0.04)' }}>
          Ustaw <strong>Drużyna WKS</strong> (w sidebarze), żeby wybrać kadrę na mecz.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={wksTeamId ? 'Szukaj w drużynie…' : 'Szukaj… (najpierw ustaw „Drużyna WKS”)'}
          style={{
            flex: 1,
            minWidth: 240,
            padding: '9px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
          }}
          disabled={!wksTeamId}
        />
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Wybrano: <strong>{selectedIds.length}</strong>
        </div>
        {wksTeamId && (
          <button type="button" onClick={fillFromTeam} disabled={loading} style={{ padding: '8px 10px', borderRadius: 10 }}>
            Uzupełnij z drużyny WKS
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: '#b91c1c' }}>{error}</div>}
      {loading && <div style={{ fontSize: 12, opacity: 0.75 }}>Ładowanie zawodników…</div>}

      {missingSelectedIds.length > 0 && (
        <div style={{ border: '1px solid rgba(185, 28, 28, 0.25)', borderRadius: 14, padding: 12, background: 'rgba(185, 28, 28, 0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
            Uwaga: {missingSelectedIds.length} wybranych zawodników nie należy do aktualnej drużyny (albo został usunięty).
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={removeMissing} style={{ padding: '8px 10px', borderRadius: 10 }}>
              Usuń brakujących z kadry
            </button>
          </div>
        </div>
      )}

      {/* Quick verification of selection */}
      {selectedIds.length > 0 && players.length > 0 && (
        <div style={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14, padding: 12, background: 'rgba(22,101,52,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75 }}>
            Podgląd wybranej kadry
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {GROUPS.map((g) => (
              <div key={g.key}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{g.label} ({selectedGrouped[g.key].length})</div>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedGrouped[g.key].length ? (
                    selectedGrouped[g.key].map((p) => (
                      <div key={p.id} style={{ fontSize: 12, opacity: 0.9 }}>
                        {typeof p.number === 'number' ? `${p.number} · ` : ''}{p.name}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.55 }}>—</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection */}
      <div style={{ display: 'grid', gap: 10 }}>
        {GROUPS.map((g) => (
          <div key={g.key} style={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{g.label}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{grouped[g.key].length}</div>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {grouped[g.key].length ? (
                grouped[g.key].map((p) => {
                  const checked = selectedSet.has(p.id)
                  return (
                    <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof p.number === 'number' ? `${p.number} · ` : ''}{p.name}
                      </span>
                    </label>
                  )
                })
              ) : (
                <div style={{ fontSize: 12, opacity: 0.55 }}>Brak zawodników w tej grupie.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

