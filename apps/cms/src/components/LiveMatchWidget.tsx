'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

type LiveMatchState = 'pre' | 'live' | 'ht' | 'live2' | 'ft'
type LiveMatchMode = 'fromMatch' | 'manual'
type LiveMatchKind = 'league' | 'friendly' | 'cup' | 'custom'

type LiveMatchDoc = {
  enabled?: boolean
  status?: LiveMatchState
  mode?: LiveMatchMode
  kind?: LiveMatchKind
  match?: string | { id: string } | null
  competitionCustomLabel?: string | null
  kickoffReal?: string | null
  pauseAt?: string | null
  resumeAt?: string | null
  addedTime1?: number | null
  addedTime2?: number | null
  scoreHome?: number | null
  scoreAway?: number | null
  events?: any[]
}

type MatchDoc = {
  id: string
  kickoffPlanned?: string | null
  wksSide?: 'home' | 'away'
  label?: string | null
  homeTeamLabel?: string | null
  awayTeamLabel?: string | null
}

function isoNow(): string {
  return new Date().toISOString()
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  const ms = d.getTime()
  return Number.isNaN(ms) ? null : ms
}

export default function LiveMatchWidget() {
  const router = useRouter()
  const { id } = useDocumentInfo()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  const apiUrl = useMemo(() => `${baseUrl}/api/globals/liveMatch`, [baseUrl])

  const getLive = useCallback(async (): Promise<LiveMatchDoc> => {
    const res = await fetch(`${apiUrl}?depth=0`, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as LiveMatchDoc
  }, [apiUrl])

  const getMatch = useCallback(
    async (matchId: string): Promise<MatchDoc> => {
      const res = await fetch(`${baseUrl}/api/matches/${matchId}?depth=0`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as MatchDoc
    },
    [baseUrl],
  )

  const patch = useCallback(
    async (data: Record<string, any>) => {
      setError(null)
      setBusy(true)
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // payload admin refresh
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [apiUrl, router],
  )

  const setState = useCallback(
    async (state: LiveMatchState) => {
      const data: Record<string, any> = { status: state }
      if (state === 'live') {
        data.enabled = true
        data.kickoffReal = isoNow()
        data.pauseAt = null
        data.resumeAt = null
      }
      if (state === 'ht') data.pauseAt = isoNow()
      if (state === 'live2') {
        data.enabled = true
        data.resumeAt = isoNow()
      }
      if (state === 'ft') {
        data.enabled = false
        // freeze clock at end moment
        data.pauseAt = isoNow()
      }
      await patch(data)
    },
    [patch],
  )

  const pickSuggestedMatch = useCallback(async () => {
    setError(null)
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

      // Prefer: kickoff within ±3h window (closest)
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

      // Fallback: nearest future (kickoff >= now)
      if (!best) {
        const future = await query({ 'where[kickoffPlanned][greater_than_equal]': nowIso }, 1)
        best = future[0] ?? null
      }

      if (!best?.id) throw new Error('Brak meczu do zasugerowania w terminarzu.')
      await patch({ mode: 'fromMatch', kind: 'league', match: best.id })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [baseUrl, patch])

  const openStudio = useCallback(() => {
    window.location.href = '/admin/live-studio'
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(15,42,28,0.12)',
        background: 'rgba(15,42,28,0.04)',
        marginBottom: 12,
      }}
    >
      <strong style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Mecz na żywo
      </strong>

      <button type="button" disabled={busy} onClick={() => setState('live')}>
        Start 1. połowy
      </button>
      <button type="button" disabled={busy} onClick={() => setState('ht')}>
        Przerwa
      </button>
      <button type="button" disabled={busy} onClick={() => setState('live2')}>
        Start 2. połowy
      </button>
      <button type="button" disabled={busy} onClick={() => setState('ft')}>
        Koniec
      </button>

      <span style={{ width: 12 }} />
      <button type="button" disabled={busy} onClick={pickSuggestedMatch}>
        Wybierz sugerowany mecz
      </button>

      <span style={{ width: 12 }} />
      <button type="button" disabled={busy} onClick={openStudio} style={{ fontWeight: 700 }}>
        Przejdź do Studio
      </button>

      {error && (
        <span style={{ color: '#b91c1c', fontSize: 12 }}>
          {error}
        </span>
      )}
      {id ? null : null}
    </div>
  )
}

