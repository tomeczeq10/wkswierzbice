'use client'

/**
 * MobileDashboard
 * ────────────────────────────────────────────────────────────────────────────
 * Dedicated layout for the Payload `/admin` landing page on small screens.
 * Renders only when viewport ≤ 768px (see Dashboard.tsx). Self-contained:
 * pulls data via REST API, no shared logic with desktop Dashboard so we can
 * iterate on the mobile UX without touching the desktop view.
 *
 * Design rules:
 *  - single column, full-bleed cards (no horizontal scroll, ever)
 *  - tap targets ≥ 48px, font-size ≥ 14px
 *  - most-used actions (live match, add news, sync) at the top
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@payloadcms/ui'

// ─── Permissions helper (RBAC 2026-05-07) ────────────────────────────────────
// Dashboard renderuje tylko sekcje, do których zalogowany user ma uprawnienia.
// Administrator (isSystem) widzi wszystko (bypass). Inne role: filtrujemy
// per-sekcja. Karty informacyjne (Najbliższy mecz, Ostatni wynik, Standings)
// zostają widoczne dla każdej roli — to dane publiczne, kontekst pracy.

type RoleObj = { name?: string; permissions?: any } | null

// Hook zwraca rolę + flagę userLoaded. Problem przy pierwszym zalogowaniu:
// `useAuth().user.role` może wrócić jako ID (number) zamiast pełnego obiektu
// z permissions, niezależnie od `auth.depth: 1` w Users collection (Payload UI
// cache'uje user z innym depth). Wtedy `role.permissions` to undefined →
// wszystkie sekcje filtrowane permission-em znikają.
//
// Rozwiązanie: oprócz polegania na `useAuth()`, robimy własny `GET /api/users/me?depth=1`
// po mount i tam dostajemy rolę z pełnymi permissions. Cache w state komponentu.
const useRoleState = (): { role: RoleObj; userLoaded: boolean } => {
  const { user } = useAuth()
  const [fetchedRole, setFetchedRole] = React.useState<RoleObj>(null)
  const [roleLoaded, setRoleLoaded] = React.useState(false)

  React.useEffect(() => {
    // Jeśli user już ma populated rolę (object z permissions), użyjemy jej.
    const r: any = (user as any)?.role
    if (r && typeof r === 'object' && r.permissions) {
      setFetchedRole(r)
      setRoleLoaded(true)
      return
    }
    // Inaczej: zalogowany ale brak rola.permissions → fetchujemy ręcznie.
    if (user) {
      let cancelled = false
      fetch('/api/users/me?depth=1', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return
          const role = data?.user?.role
          if (role && typeof role === 'object') setFetchedRole(role)
          setRoleLoaded(true)
        })
        .catch(() => {
          if (!cancelled) setRoleLoaded(true)
        })
      return () => {
        cancelled = true
      }
    }
    // user === null lub undefined — czekamy.
  }, [user])

  return {
    role: fetchedRole,
    userLoaded: user !== undefined && roleLoaded,
  }
}
const isAdminRole = (role: RoleObj): boolean => role?.name === 'Administrator'

// ─── Types (mirror Dashboard.tsx, kept local to allow independent evolution) ──

type WksMatch = {
  round: number
  date: string | null
  time: string | null
  venue: 'home' | 'away'
  opponent: string
  played: boolean
  result: { ours: number; theirs: number; outcome: 'win' | 'draw' | 'loss'; scoreLabel: string } | null
}
type Standing = { position: number; team: string; played: number; points: number; goals: string }
type SeasonGlobal = {
  lastSync?: string | null
  lastSyncStatus?: 'idle' | 'running' | 'success' | 'error'
  lastSyncError?: string | null
  data?: { wks?: { played?: WksMatch[]; upcoming?: WksMatch[] }; standings?: Standing[] } | null
}
type NewsDoc = { id: string; title: string; date?: string; draft?: boolean; createdAt: string }
type LiveMatch = {
  enabled?: boolean
  status?: 'pre' | 'live' | 'ht' | 'live2' | 'ft'
  scoreHome?: number
  scoreAway?: number
  homeLabel?: string | null
  awayLabel?: string | null
  kickoffReal?: string | null
  pauseAt?: string | null
  resumeAt?: string | null
  addedTime1?: number | null
  addedTime2?: number | null
  match?: number | { id: number } | null
}
type UpcomingMatchDoc = {
  id: number
  competitionType?: 'league' | 'friendly' | 'cup'
  kickoffPlanned?: string
  homeTeamLabel?: string
  awayTeamLabel?: string
  wksSide?: 'home' | 'away'
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

const T = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  border: 'rgba(15, 23, 42, 0.08)',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#94a3b8',
  green: '#166534',
  greenDk: '#14532d',
  greenLt: '#dcfce7',
  ink: '#0f2a1c',
  red: '#dc2626',
  redLt: '#fef2f2',
  amber: '#d97706',
  amberLt: '#fffbeb',
  blue: '#2563eb',
  blueLt: '#eff6ff',
  purple: '#7c3aed',
  purpleLt: '#f5f3ff',
  rose: '#f43f5e',
  roseLt: '#fff1f2',
  slateLt: '#f1f5f9',
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: 'include' })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

async function getCount(slug: string): Promise<number> {
  const r = await fetchJson<{ totalDocs: number }>(`/api/${slug}?limit=1&depth=0`)
  return r?.totalDocs ?? 0
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function rel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'przed chwilą'
  if (diff < 3600) return `${Math.floor(diff / 60)} min temu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} godz. temu`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} dni temu`
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
}

function fmtMatchDate(date: string | null, time: string | null): string {
  if (!date) return 'Termin nieznany'
  const d = new Date(date)
  const day = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
  return time ? `${day} · ${time}` : day
}

function countdown(date: string | null, time: string | null): string | null {
  if (!date) return null
  const t = time ?? '12:00'
  const target = new Date(`${date}T${t}:00`).getTime()
  return countdownFromMs(target)
}

function isoCountdown(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return countdownFromMs(d.getTime())
}

function countdownFromMs(target: number): string | null {
  const diff = target - Date.now()
  if (diff < 0) return null
  const days = Math.floor(diff / 86400000)
  if (days >= 1) return `za ${days} ${days === 1 ? 'dzień' : 'dni'}`
  const hours = Math.floor(diff / 3600000)
  if (hours >= 1) return `za ${hours} godz.`
  const mins = Math.floor(diff / 60000)
  return `za ${mins} min`
}

function fmtKickoff(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day} · ${time}`
}

function kindLabel(k: 'league' | 'friendly' | 'cup'): string {
  return k === 'league' ? 'Ligowy' : k === 'friendly' ? 'Sparing' : 'Puchar'
}

/**
 * Wylicza aktualną minutę meczu z live globala.
 * Kanoniczne wartości na zatrzymaniach: po HT pokazuje 45 (+ doliczony 1. poł.),
 * po FT pokazuje 90 (+ doliczony 2. poł.). Zgodne z computeClock w Studio.
 */
function computeLiveMinute(live: LiveMatch | null, nowMs: number): number | null {
  if (!live) return null
  const st = live.status
  if (st === 'pre') return 0

  const added1 = Number.isFinite(live.addedTime1 as any) ? Math.max(0, Math.trunc(Number(live.addedTime1))) : 0
  const added2 = Number.isFinite(live.addedTime2 as any) ? Math.max(0, Math.trunc(Number(live.addedTime2))) : 0

  if (st === 'ht') return 45 + added1
  if (st === 'ft') return 90 + added2

  const kickoff = live.kickoffReal ? new Date(live.kickoffReal).getTime() : NaN
  if (!Number.isFinite(kickoff)) return null
  const pauseMs = live.pauseAt ? new Date(live.pauseAt).getTime() : null
  const resumeMs = live.resumeAt ? new Date(live.resumeAt).getTime() : null

  if (st === 'live') {
    const end = pauseMs && (!resumeMs || resumeMs < pauseMs) ? pauseMs : nowMs
    return Math.max(0, Math.floor((end - kickoff) / 60000))
  }
  if (st === 'live2' && resumeMs) {
    const end = pauseMs && pauseMs > resumeMs ? pauseMs : nowMs
    return 45 + Math.max(0, Math.floor((end - resumeMs) / 60000))
  }
  return null
}

/** Etykieta stanu po polsku (pre/live/ht/live2/ft). */
function liveStateLabel(s: LiveMatch['status']): string {
  if (s === 'live') return '1. połowa'
  if (s === 'ht') return 'Przerwa'
  if (s === 'live2') return '2. połowa'
  if (s === 'ft') return 'Koniec'
  return 'Przed meczem'
}

/** Klasyfikator karty meczu — decyduje co pokazać na karcie i jaki przycisk. */
type MatchCardState =
  | { kind: 'live'; minute: number | null }
  | { kind: 'ready' /* w oknie kickoffu, brak active live */ }
  | { kind: 'upcoming' /* > kickoff_window do meczu */ }
  | { kind: 'past' /* mecz minął bez utworzonego live */ }

function classifyMatchCard(args: {
  kickoffPlannedIso?: string
  isLive: boolean
  nowMs: number
}): MatchCardState {
  const { kickoffPlannedIso, isLive, nowMs } = args
  if (isLive) return { kind: 'live', minute: null }
  if (!kickoffPlannedIso) return { kind: 'upcoming' }
  const k = new Date(kickoffPlannedIso).getTime()
  if (!Number.isFinite(k)) return { kind: 'upcoming' }
  // Okno "czas startu live": od 60 min przed do 30 min po planowanym kickoffie.
  const KICKOFF_BEFORE_MS = 60 * 60_000
  const KICKOFF_AFTER_MS = 30 * 60_000
  // Po 2.5h od kickoffu uznajemy mecz za zakończony (nawet bez live).
  const FINISHED_AFTER_MS = 2.5 * 60 * 60_000
  if (nowMs >= k - KICKOFF_BEFORE_MS && nowMs <= k + KICKOFF_AFTER_MS) return { kind: 'ready' }
  if (nowMs > k + FINISHED_AFTER_MS) return { kind: 'past' }
  return { kind: 'upcoming' }
}

// ─── Icons (compact set, only what's needed here) ─────────────────────────────

type Icn = (p: { size?: number; color?: string }) => React.ReactElement
const mk = (d: string): Icn => ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const IcPlus = mk('M5 12h14M12 5v14')
const IcRefresh: Icn = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
  </svg>
)
const IcBolt = mk('M13 2L3 14h7l-1 8 10-12h-7l1-8z')
const IcNews: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6" />
    <path d="M8 6h8M8 10h8M8 14h4" />
  </svg>
)
const IcUsers: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IcImage: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
)
const IcShield = mk('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
const IcCalendar: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)
const IcTrophy: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    <path d="M7 4H2v3a5 5 0 0 0 5 5M17 4h5v3a5 5 0 0 1-5 5M7 4a5 5 0 0 0 5 5 5 5 0 0 0 5-5z" />
  </svg>
)
const IcSettings: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IcChevron = mk('m9 18 6-6-6-6')
const IcFolder: Icn = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)
const IcDot: Icn = ({ size = 8, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={color} /></svg>
)

// ─── Building blocks ─────────────────────────────────────────────────────────

function Card({ children, padding = 16 }: { children: React.ReactNode; padding?: number | string }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: T.subtle,
        margin: '4px 4px 8px',
      }}
    >
      {children}
    </div>
  )
}

function ActionTile({
  href,
  onClick,
  Icon,
  label,
  accent,
  accentLt,
  badge,
}: {
  href?: string
  onClick?: () => void
  Icon: Icn
  label: string
  accent: string
  accentLt: string
  badge?: string
}) {
  const inner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
        minHeight: 90,
        textDecoration: 'none',
        color: T.text,
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent} />
        </div>
        {badge ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: accentLt, padding: '2px 8px', borderRadius: 99 }}>{badge}</span>
        ) : null}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.25 }}>{label}</div>
    </div>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ all: 'unset', display: 'block' }}>
        {inner}
      </button>
    )
  }
  return (
    <a href={href} style={{ display: 'block', textDecoration: 'none' }}>
      {inner}
    </a>
  )
}

function ListRow({
  href,
  Icon,
  iconBg,
  iconColor,
  title,
  meta,
  rightLabel,
  rightSubtle,
}: {
  href?: string
  Icon: Icn
  iconBg: string
  iconColor: string
  title: string
  meta?: string
  rightLabel?: string
  rightSubtle?: string
}) {
  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: T.surface,
        textDecoration: 'none',
        color: T.text,
        WebkitTapHighlightColor: 'rgba(0,0,0,0.04)',
        minHeight: 56,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {meta && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        {rightLabel && <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{rightLabel}</div>}
        {rightSubtle && <div style={{ fontSize: 11, color: T.subtle }}>{rightSubtle}</div>}
      </div>
      {href && (
        <div style={{ flexShrink: 0, color: T.subtle, marginLeft: -4 }}>
          <IcChevron size={16} color={T.subtle} />
        </div>
      )}
    </div>
  )
  return href ? (
    <a href={href} style={{ display: 'block', textDecoration: 'none' }}>
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: T.border }} />
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MobileDashboard() {
  // ── RBAC permissions (rola usera + helpery do warunkowego renderowania) ──
  const { role, userLoaded } = useRoleState()
  const admin = isAdminRole(role)
  // Implicite: liveStudio = matches.read + liveArchives.read (lustrzane do
  // hasPermission.LIVE_STUDIO_IMPLIES — operator live musi widzieć terminarz
  // i archiwum w panelu, mimo że nie ma checkboxów dla nich).
  const liveStudioImplies = Boolean(role?.permissions?.special?.liveStudio)
  const canRead = (slug: string): boolean => {
    if (admin) return true
    if (role?.permissions?.[slug]?.read) return true
    if (liveStudioImplies && (slug === 'matches' || slug === 'liveArchives')) return true
    return false
  }
  const canCreate = (slug: string): boolean => {
    if (admin) return true
    if (role?.permissions?.[slug]?.create) return true
    if (liveStudioImplies && (slug === 'matches' || slug === 'liveArchives')) return true
    return false
  }
  const canSpecial = (key: 'liveStudio' | 'galleryManager' | 'syncSeason'): boolean =>
    admin || Boolean(role?.permissions?.special?.[key])
  const canGlobalUpdate = (key: 'siteConfig' | 'season'): boolean =>
    admin || Boolean(role?.permissions?.globals?.[`${key}Update`])

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [news, setNews] = useState<NewsDoc[]>([])
  const [season, setSeason] = useState<SeasonGlobal | null>(null)
  const [live, setLive] = useState<LiveMatch | null>(null)
  const [upcomingMatch, setUpcomingMatch] = useState<UpcomingMatchDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  // Tick co 30s — wystarczające do aktualizacji minuty live i przejść stanu karty meczu.
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  // Live polling: gdy nie ma SSE w tym widoku, odświeżaj liveMatch co 10s żeby banner i karta meczu były aktualne.
  useEffect(() => {
    let cancelled = false
    const t = window.setInterval(async () => {
      const fresh = await fetchJson<LiveMatch>('/api/globals/liveMatch?depth=0')
      if (!cancelled) setLive(fresh ?? null)
    }, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const slugs = ['news', 'players', 'teams', 'media', 'gallery', 'sponsors', 'staff', 'board', 'liveArchives']
    const sinceIso = new Date(Date.now() - 3600_000).toISOString()
    Promise.all([
      ...slugs.map((s) => getCount(s).then((n) => [s, n] as const)),
      fetchJson<{ docs: NewsDoc[] }>('/api/news?limit=4&depth=0&sort=-date'),
      fetchJson<SeasonGlobal>('/api/globals/season'),
      fetchJson<LiveMatch>('/api/globals/liveMatch?depth=0'),
      fetchJson<{ docs: UpcomingMatchDoc[] }>(
        `/api/matches?limit=1&sort=kickoffPlanned&depth=0&where[kickoffPlanned][greater_than_equal]=${encodeURIComponent(sinceIso)}`,
      ),
    ]).then(([...rest]) => {
      const entries = rest.slice(0, slugs.length) as Array<readonly [string, number]>
      setCounts(Object.fromEntries(entries))
      setNews(((rest[slugs.length] as { docs?: NewsDoc[] } | null)?.docs) ?? [])
      setSeason((rest[slugs.length + 1] as SeasonGlobal | null) ?? null)
      setLive((rest[slugs.length + 2] as LiveMatch | null) ?? null)
      const upDocs = (rest[slugs.length + 3] as { docs?: UpcomingMatchDoc[] } | null)?.docs
      setUpcomingMatch(upDocs && upDocs.length > 0 ? upDocs[0] : null)
      setLoading(false)
    })
  }, [])

  const handleSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    setSyncError(null)
    try {
      const r = await fetch('/api/season/sync', { method: 'POST', credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const t0 = Date.now()
      while (Date.now() - t0 < 60_000) {
        const s = await fetchJson<SeasonGlobal>('/api/globals/season')
        if (s) setSeason(s)
        if (s?.lastSyncStatus === 'success' || s?.lastSyncStatus === 'error') break
        await new Promise((ok) => setTimeout(ok, 1500))
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  // ── Pre-auth guard: dopóki Payload nie zwróci użytkownika, nie filtrujemy.
  // Bez tego user widziałby pusty dashboard (sekcje filtrowane permission-em
  // znikają przy `userLoaded === false`) aż do pierwszego refresha.
  if (!userLoaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.subtle,
          fontSize: 13,
          fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
          background: T.bg,
        }}
      >
        Ładowanie…
      </div>
    )
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const sd = season?.data
  const upcoming = sd?.wks?.upcoming ?? []
  const played = sd?.wks?.played ?? []
  const standings = sd?.standings ?? []
  const nextMatch = upcoming.find((m) => m.date) ?? upcoming[0] ?? null
  const lastMatch = played.length > 0 ? played[played.length - 1] : null
  const wksPos = standings.find((s) => s.team?.includes('Wierzbice')) ?? null
  const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  // Live aktywny gdy enabled=true I status w {pre, live, ht, live2}. Status=ft nie liczy się (mecz zakończony).
  const isLive = Boolean(live?.enabled && live.status && live.status !== 'ft')
  const liveMinute = isLive ? computeLiveMinute(live, nowMs) : null
  const matchCardState = classifyMatchCard({
    kickoffPlannedIso: upcomingMatch?.kickoffPlanned,
    isLive,
    nowMs,
  })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        padding: '14px 12px 0',
        paddingBottom: 'calc(48px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: T.ink,
          borderRadius: 16,
          padding: '14px 16px',
          color: '#fff',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(22,101,52,0.35)', pointerEvents: 'none' }} />
        <img src="/herb-wks.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', position: 'relative' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>WKS Wierzbice</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize', marginTop: 2 }}>{today}</div>
        </div>
      </div>

      {/* Persistent live banner — gdy mecz trwa, jest tu zawsze do powrotu po zamknięciu/otwarciu przeglądarki.
          RBAC: tylko dla rolami z dostępem do Live Studio (operatorzy meczu live). */}
      {canSpecial('liveStudio') && (isLive ? (
        <a
          href="/admin/live-studio"
          style={{
            display: 'block',
            background: `linear-gradient(135deg, ${T.red} 0%, #991b1b 100%)`,
            color: '#fff',
            padding: '14px 16px',
            borderRadius: 14,
            textDecoration: 'none',
            marginBottom: 14,
            boxShadow: '0 6px 20px rgba(220,38,38,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: '#fff',
                boxShadow: '0 0 0 6px rgba(255,255,255,0.18)',
                animation: 'wks-pulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              LIVE · {liveStateLabel(live?.status)}
              {liveMinute != null && live?.status !== 'pre' ? ` · ${liveMinute}'` : ''}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.85, textTransform: 'uppercase' }}>
              Wróć do studia →
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {live?.homeLabel ?? 'WKS'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {live?.scoreHome ?? 0}
              </span>
              <span style={{ fontSize: 18, opacity: 0.6 }}>:</span>
              <span style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {live?.scoreAway ?? 0}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {live?.awayLabel ?? '—'}
            </div>
          </div>
        </a>
      ) : (
        <a
          href="/admin/live-setup"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: `linear-gradient(135deg, ${T.green} 0%, ${T.greenDk} 100%)`,
            color: '#fff',
            padding: '14px 16px',
            borderRadius: 14,
            width: '100%',
            marginBottom: 14,
            boxShadow: '0 4px 14px rgba(22,101,52,0.3)',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)' }}>
            <IcBolt size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>Mecz na żywo</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>⚡ Utwórz mecz live</div>
          </div>
          <IcChevron size={18} color="#fff" />
        </a>
      ))}

      {/* Quick action grid — kafelki widoczne tylko dla rola z odpowiednią permission. */}
      {(canCreate('news') || canCreate('players') || canSpecial('galleryManager') || canSpecial('syncSeason')) && (
        <>
          <SectionLabel>Szybkie akcje</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {canCreate('news') && (
              <ActionTile href="/admin/collections/news/create" Icon={IcNews} label="Nowy news" accent={T.green} accentLt={T.greenLt} />
            )}
            {canCreate('players') && (
              <ActionTile href="/admin/collections/players/create" Icon={IcUsers} label="Nowy zawodnik" accent={T.blue} accentLt={T.blueLt} />
            )}
            {canSpecial('galleryManager') && (
              <ActionTile href="/admin/gallery-manager" Icon={IcFolder} label="Menedżer galerii" accent={T.rose} accentLt={T.roseLt} />
            )}
            {canSpecial('syncSeason') && (
              <ActionTile
                onClick={handleSync}
                Icon={IcRefresh}
                label={syncing ? 'Synchronizuję...' : 'Sync wyników'}
                accent={T.amber}
                accentLt={T.amberLt}
                badge={season?.lastSync ? rel(season.lastSync).replace(' temu', '') : undefined}
              />
            )}
          </div>
        </>
      )}
      {syncError && (
        <div style={{ marginTop: -8, marginBottom: 18, padding: 10, background: T.redLt, color: T.red, borderRadius: 10, fontSize: 13 }}>
          Sync error: {syncError}
        </div>
      )}

      {/* Smart match card — kontekstowo: live / ready / upcoming / past.
          Pomijamy gdy live trwa (jest już persistent banner powyżej).
          RBAC: karta zawiera akcje (rozpocznij live, uzupełnij wynik) —
          ma sens tylko dla rolami z liveStudio LUB matches.update. */}
      {!isLive && upcomingMatch && (canSpecial('liveStudio') || canRead('matches')) && (
        <>
          <SectionLabel>
            {matchCardState.kind === 'ready'
              ? 'Mecz dnia'
              : matchCardState.kind === 'past'
                ? 'Ostatni mecz'
                : 'Najbliższy mecz'}
          </SectionLabel>
          <div style={{ marginBottom: 18 }}>
            <Card>
              {/* Wspólny nagłówek — drużyny + termin + typ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: matchCardState.kind === 'ready' ? T.greenLt : matchCardState.kind === 'past' ? T.slateLt : T.greenLt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IcCalendar size={16} color={matchCardState.kind === 'past' ? T.muted : T.green} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {upcomingMatch.homeTeamLabel ?? '?'} <span style={{ color: T.subtle }}>vs</span> {upcomingMatch.awayTeamLabel ?? '?'}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {upcomingMatch.kickoffPlanned ? fmtKickoff(upcomingMatch.kickoffPlanned) : 'termin do ustalenia'}
                    {upcomingMatch.competitionType ? ` · ${kindLabel(upcomingMatch.competitionType)}` : ''}
                  </div>
                </div>
                {matchCardState.kind === 'upcoming' && upcomingMatch.kickoffPlanned && (() => {
                  const cd = isoCountdown(upcomingMatch.kickoffPlanned)
                  return cd ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.green, background: T.greenLt, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                      {cd}
                    </div>
                  ) : null
                })()}
                {matchCardState.kind === 'ready' && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.red,
                      background: T.redLt,
                      padding: '4px 10px',
                      borderRadius: 99,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Czas startu
                  </div>
                )}
              </div>

              {/* Kontekstowy CTA */}
              {matchCardState.kind === 'ready' && (
                <a
                  href={`/admin/live-setup?matchId=${upcomingMatch.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    background: `linear-gradient(135deg, ${T.green} 0%, ${T.greenDk} 100%)`,
                    color: '#fff',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: '0 4px 14px rgba(22,101,52,0.35)',
                  }}
                >
                  ⚡ Rozpocznij live (wybierz skład)
                </a>
              )}

              {matchCardState.kind === 'upcoming' && (
                <a
                  href={`/admin/live-setup?matchId=${upcomingMatch.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    background: T.surface,
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Przygotuj relację z wyprzedzeniem
                </a>
              )}

              {matchCardState.kind === 'past' && (
                <a
                  href={`/admin/collections/matches/${upcomingMatch.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    background: T.slateLt,
                    color: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Mecz zakończony — uzupełnij wynik →
                </a>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Fallback (źródło 90minut) — pokazuj tylko gdy nie mamy żadnego meczu w terminarzu Matches */}
      {!isLive && !upcomingMatch && nextMatch && (
        <>
          <SectionLabel>Najbliższy mecz (źródło: 90minut)</SectionLabel>
          <div style={{ marginBottom: 18 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IcCalendar size={16} color={T.green} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {nextMatch.venue === 'home' ? 'WKS' : nextMatch.opponent} <span style={{ color: T.subtle }}>vs</span> {nextMatch.venue === 'home' ? nextMatch.opponent : 'WKS'}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {fmtMatchDate(nextMatch.date, nextMatch.time)} · Runda {nextMatch.round}
                  </div>
                </div>
                {countdown(nextMatch.date, nextMatch.time) && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.green, background: T.greenLt, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {countdown(nextMatch.date, nextMatch.time)}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: T.subtle }}>
                Zsynchronizuj sezon żeby utworzyć ten mecz w terminarzu — wtedy pokaże się przycisk live.
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Last result + standings position */}
      {(lastMatch || wksPos) && (
        <div style={{ display: 'grid', gridTemplateColumns: lastMatch && wksPos ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 18 }}>
          {lastMatch && lastMatch.result && (
            <Card padding="14px">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.subtle, marginBottom: 8 }}>
                Ostatni wynik
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color:
                    lastMatch.result.outcome === 'win' ? T.green : lastMatch.result.outcome === 'loss' ? T.red : T.amber,
                }}
              >
                {lastMatch.result.scoreLabel}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastMatch.opponent}
              </div>
            </Card>
          )}
          {wksPos && (
            <Card padding="14px">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.subtle, marginBottom: 8 }}>
                Pozycja
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.green }}>
                {wksPos.position}.
                <span style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginLeft: 8 }}>
                  {wksPos.points} pkt
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{wksPos.played} mecze · {wksPos.goals}</div>
            </Card>
          )}
        </div>
      )}

      {/* Recent news — tylko dla rolami z dostępem do edycji aktualności. */}
      {canRead('news') && news.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 4px 8px' }}>
            <SectionLabel>Ostatnie aktualności</SectionLabel>
            <a href="/admin/collections/news" style={{ fontSize: 12, fontWeight: 600, color: T.green, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Wszystkie →
            </a>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
            {news.slice(0, 4).map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <Divider />}
                <ListRow
                  href={`/admin/collections/news/${n.id}`}
                  Icon={IcNews}
                  iconBg={T.greenLt}
                  iconColor={T.green}
                  title={n.title}
                  meta={n.date ? new Date(n.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  rightSubtle={n.draft ? 'szkic' : 'pub.'}
                />
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {/* Collections grid — każdy wiersz tylko dla rolami z READ na danej kolekcji.
          Cała sekcja zwija się gdy user nie ma żadnej widocznej kolekcji.
          Galeria (kolekcja gallery) jest ukryta z całego panelu — Menedżer galerii
          to jedyna ścieżka, więc nie ma jej w tej liście. */}
      {(() => {
        const collectionsToShow: Array<{
          slug: string
          href: string
          Icon: Icn
          iconBg: string
          iconColor: string
          title: string
          countKey: string
        }> = [
          { slug: 'news', href: '/admin/collections/news', Icon: IcNews, iconBg: T.greenLt, iconColor: T.green, title: 'Aktualności', countKey: 'news' },
          { slug: 'players', href: '/admin/collections/players', Icon: IcUsers, iconBg: T.blueLt, iconColor: T.blue, title: 'Zawodnicy', countKey: 'players' },
          { slug: 'teams', href: '/admin/collections/teams', Icon: IcShield, iconBg: T.amberLt, iconColor: T.amber, title: 'Drużyny', countKey: 'teams' },
          { slug: 'sponsors', href: '/admin/collections/sponsors', Icon: IcTrophy, iconBg: T.roseLt, iconColor: T.rose, title: 'Sponsorzy', countKey: 'sponsors' },
          { slug: 'staff', href: '/admin/collections/staff', Icon: IcUsers, iconBg: T.slateLt, iconColor: T.muted, title: 'Sztab', countKey: 'staff' },
          { slug: 'board', href: '/admin/collections/board', Icon: IcUsers, iconBg: T.slateLt, iconColor: T.muted, title: 'Zarząd', countKey: 'board' },
          { slug: 'media', href: '/admin/collections/media', Icon: IcImage, iconBg: T.slateLt, iconColor: T.muted, title: 'Media (pliki)', countKey: 'media' },
        ]
        const visible = collectionsToShow.filter((c) => canRead(c.slug))
        if (visible.length === 0) return null
        return (
          <>
            <SectionLabel>Kolekcje</SectionLabel>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
              {visible.map((c, i) => (
                <React.Fragment key={c.slug}>
                  {i > 0 && <Divider />}
                  <ListRow
                    href={c.href}
                    Icon={c.Icon}
                    iconBg={c.iconBg}
                    iconColor={c.iconColor}
                    title={c.title}
                    rightLabel={String(counts[c.countKey] ?? 0)}
                  />
                </React.Fragment>
              ))}
            </div>
          </>
        )
      })()}

      {/* Live & matches section — każdy wiersz tylko dla rolami z odpowiednim
          dostępem. Cała sekcja zwija się gdy nikt z trzech wierszy nie pasuje. */}
      {(canSpecial('liveStudio') || canRead('liveArchives') || canRead('matches')) && (
        <>
          <SectionLabel>Mecze i relacje</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
            {canSpecial('liveStudio') && (
              isLive ? (
                <ListRow
                  href="/admin/live-studio"
                  Icon={IcBolt}
                  iconBg={T.redLt}
                  iconColor={T.red}
                  title="Studio Live · TRWA"
                  meta={`${liveStateLabel(live?.status)}${liveMinute != null && live?.status !== 'pre' ? ` · ${liveMinute}'` : ''} · ${live?.scoreHome ?? 0}:${live?.scoreAway ?? 0}`}
                />
              ) : (
                <ListRow
                  href="/admin/live-setup"
                  Icon={IcBolt}
                  iconBg={T.greenLt}
                  iconColor={T.green}
                  title="Utwórz mecz live"
                  meta="Konfiguracja meczu + skład"
                />
              )
            )}
            {canSpecial('liveStudio') && canRead('liveArchives') && <Divider />}
            {canRead('liveArchives') && (
              <ListRow href="/admin/collections/liveArchives" Icon={IcCalendar} iconBg={T.purpleLt} iconColor={T.purple} title="Archiwum relacji" meta="Po meczu — do napisania artykułu" rightLabel={String(counts.liveArchives ?? 0)} />
            )}
            {(canSpecial('liveStudio') || canRead('liveArchives')) && canRead('matches') && <Divider />}
            {canRead('matches') && (
              <ListRow href="/admin/collections/matches" Icon={IcCalendar} iconBg={T.amberLt} iconColor={T.amber} title="Terminarz" meta="Mecze (ligowe, sparingi, puchar)" />
            )}
          </div>
        </>
      )}

      {/* Globals + settings — sekcja widoczna tylko dla rola z dostępem
          do edycji któregoś z globalsów (Konfiguracja strony / Sezon). */}
      {(canGlobalUpdate('siteConfig') || canGlobalUpdate('season')) && (
        <>
          <SectionLabel>Ustawienia strony</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
            {canGlobalUpdate('siteConfig') && (
              <ListRow href="/admin/globals/siteConfig" Icon={IcSettings} iconBg={T.slateLt} iconColor={T.muted} title="Konfiguracja strony" />
            )}
            {canGlobalUpdate('siteConfig') && canGlobalUpdate('season') && <Divider />}
            {canGlobalUpdate('season') && (
              <ListRow href="/admin/globals/season" Icon={IcCalendar} iconBg={T.greenLt} iconColor={T.green} title="Sezon (terminarz 90minut, tabela)" meta={season?.lastSync ? `Sync: ${rel(season.lastSync)}` : 'Brak synchronizacji'} />
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: T.subtle, padding: '20px 0' }}>
        WKS Wierzbice · Panel admina · {loading ? 'ładuję dane…' : 'mobile'}
      </div>

    </div>
  )
}
