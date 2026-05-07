'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useHasSpecialAccess } from './PermissionGuard'

type LiveSnapshot = {
  enabled?: boolean
  status?: 'pre' | 'live' | 'ht' | 'live2' | 'ft'
  scoreHome?: number
  scoreAway?: number
} | null

/**
 * Two-link block above the standard nav:
 *  1. "Utwórz mecz live" — opens config form
 *  2. "Studio Live" — control panel; pulsing red dot when live is active
 *
 * Polls /api/globals/liveMatch every 15s so the indicator reflects current
 * state across browser reloads (so editor knows there's an active live to
 * return to without digging through the panel).
 */
export default function LiveStudioNavLink() {
  const pathname = usePathname()
  const setupActive = useMemo(() => pathname === '/admin/live-setup', [pathname])
  const studioActive = useMemo(() => pathname === '/admin/live-studio', [pathname])
  const canAccess = useHasSpecialAccess('liveStudio')

  const [live, setLive] = useState<LiveSnapshot>(null)
  useEffect(() => {
    let cancelled = false
    const fetchLive = async () => {
      try {
        const r = await fetch('/api/globals/liveMatch?depth=0', { credentials: 'include' })
        if (!r.ok) return
        const json = await r.json()
        if (!cancelled) setLive(json as LiveSnapshot)
      } catch {
        // ignore
      }
    }
    fetchLive()
    const t = window.setInterval(fetchLive, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [])

  const isLive = Boolean(live?.enabled && live?.status && live.status !== 'ft')
  const sh = live?.scoreHome ?? 0
  const sa = live?.scoreAway ?? 0

  if (!canAccess) return null

  return (
    <div style={{ padding: 'calc(var(--base) * 0.5)', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* "Utwórz mecz live" — pokazujemy TYLKO gdy nie trwa aktywna relacja.
          Gdy mecz trwa, jedyną sensowną akcją jest powrót do Studia (link niżej). */}
      {!isLive && (
        <a
          href="/admin/live-setup"
          aria-current={setupActive ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            textDecoration: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            border: `1px solid ${setupActive ? 'rgba(22, 101, 52, 0.42)' : 'rgba(0,0,0,0.10)'}`,
            background: setupActive ? 'rgba(22, 101, 52, 0.16)' : 'rgba(22, 101, 52, 0.06)',
            color: 'inherit',
            boxShadow: setupActive ? '0 1px 10px rgba(22, 101, 52, 0.10)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Utwórz mecz live
            </span>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.72 }}>Konfiguracja meczu + skład</div>
        </a>
      )}

      {/* Studio Live — pokazujemy TYLKO gdy trwa aktywna relacja.
          Bez aktywnego live nie ma czego sterować — admin idzie najpierw do "Utwórz mecz live". */}
      {isLive && (
        <a
          href="/admin/live-studio"
          aria-current={studioActive ? 'page' : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            textDecoration: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            border: `1px solid rgba(220, 38, 38, 0.55)`,
            background: 'rgba(220, 38, 38, 0.14)',
            color: 'inherit',
            boxShadow: '0 2px 14px rgba(220,38,38,0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: 'rgba(220, 38, 38, 0.95)',
                boxShadow: '0 0 0 6px rgba(220, 38, 38, 0.14)',
                animation: 'wks-pulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Studio Live
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: '#dc2626',
                background: 'rgba(220,38,38,0.16)',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              TRWA
            </span>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.78 }}>
            Aktualny wynik: {sh}:{sa} — kliknij, aby wrócić
          </div>
        </a>
      )}
    </div>
  )
}
