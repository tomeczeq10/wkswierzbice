'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@payloadcms/ui'

type SeasonGlobal = {
  lastSync?: string | null
  lastSyncStatus?: 'idle' | 'running' | 'success' | 'error'
  lastSyncError?: string | null
}

async function fetchSeason(): Promise<SeasonGlobal> {
  const res = await fetch('/api/globals/season', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as SeasonGlobal
}

export default function SeasonSyncWidget() {
  // RBAC: przycisk "Odśwież teraz" wywołuje POST /api/season/sync, który
  // wymaga special.syncSeason. Bez tego permission user dostałby 403 po
  // kliknięciu — ukrywamy przycisk żeby UX-owo nie kusić.
  const { user } = useAuth()
  const role: any = (user as any)?.role
  const isAdmin = role && typeof role === 'object' && role.name === 'Administrator'
  const canSync = isAdmin || (role && typeof role === 'object' && role.permissions?.special?.syncSeason)

  const [season, setSeason] = useState<SeasonGlobal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = season?.lastSyncStatus ?? 'idle'
  const lastSyncLabel = useMemo(() => {
    if (!season?.lastSync) return '—'
    const d = new Date(season.lastSync)
    if (Number.isNaN(d.getTime())) return season.lastSync
    return d.toLocaleString('pl-PL')
  }, [season?.lastSync])

  const refresh = async () => {
    try {
      setError(null)
      setBusy(true)
      const res = await fetch('/api/season/sync', { method: 'POST' })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `HTTP ${res.status}`)
      }
      // Poll status
      const startedAt = Date.now()
      while (Date.now() - startedAt < 60_000) {
        const s = await fetchSeason()
        setSeason(s)
        if (s.lastSyncStatus === 'success' || s.lastSyncStatus === 'error') break
        await new Promise((r) => setTimeout(r, 1500))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    fetchSeason()
      .then(setSeason)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        padding: 16,
        background: 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Wyniki 90minut</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Ostatni sync: {lastSyncLabel}</div>
        </div>
        {canSync ? (
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: busy ? 'rgba(0,0,0,0.04)' : 'white',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {busy || status === 'running' ? 'Synchronizuję…' : 'Odśwież teraz'}
          </button>
        ) : (
          <span style={{ fontSize: 11, opacity: 0.55, fontStyle: 'italic' }}>
            Brak uprawnień do ręcznego sync
          </span>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12 }}>
        <span style={{ opacity: 0.7 }}>Status: </span>
        <strong>
          {status === 'idle'
            ? 'idle'
            : status === 'running'
              ? 'running'
              : status === 'success'
                ? 'success'
                : 'error'}
        </strong>
      </div>

      {(season?.lastSyncError || error) && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c' }}>
          {error || season?.lastSyncError}
        </div>
      )}
    </div>
  )
}

