'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@payloadcms/ui'
import MobileDashboard from './MobileDashboard'

// ─── Permissions helper (RBAC 2026-05-08) ────────────────────────────────────
// Identyczna logika jak w MobileDashboard — Administrator widzi wszystko,
// inne role widzą tylko sekcje z odpowiednim permission. Karty informacyjne
// (Najbliższy mecz, Ostatni wynik, Tabela) zostają widoczne dla każdej roli.

type RoleObj = { name?: string; permissions?: any } | null

// Hook zwraca rolę + flagę userLoaded. `user === undefined` oznacza
// że Payload jeszcze nie zakończył initial fetchowania zalogowanego usera.
// Bez tej flagi dashboard renderuje się jako "niezalogowany" w pierwszym
// momencie (wszystkie canRead/canCreate zwracają false → sekcje znikają),
// co user widzi jako "zaraz po loginie dashboard jest pusty, dopiero po
// refresh się pojawia treść".
const useRoleState = (): { role: RoleObj; userLoaded: boolean } => {
  const { user } = useAuth()
  const userLoaded = user !== undefined
  const r: any = (user as any)?.role
  return {
    role: r && typeof r === 'object' ? r : null,
    userLoaded,
  }
}
const isAdminRole = (role: RoleObj): boolean => role?.name === 'Administrator'

// Hook: prawda gdy viewport ≤ 768px. SSR-safe (start od `false`, refresh po mount).
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

// ─── Icons ────────────────────────────────────────────────────────────────────

type IconProps = { size?: number; color?: string }
type IconComponent = (props: IconProps) => React.ReactElement

const mkIcon =
  (d: string): IconComponent =>
  ({ size = 18, color = 'currentColor' }) =>
    (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    )

const IconNewspaper: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6" />
    <path d="M8 6h8M8 10h8M8 14h4" />
  </svg>
)
const IconUsers: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconShield    = mkIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
const IconImage: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
)
const IconTag: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
  </svg>
)
const IconTrophy: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    <path d="M7 4H2v3a5 5 0 0 0 5 5M17 4h5v3a5 5 0 0 1-5 5M7 4a5 5 0 0 0 5 5 5 5 0 0 0 5-5z" />
  </svg>
)
const IconStar      = mkIcon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z')
const IconSettings: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconDatabase: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" />
  </svg>
)
const IconUserCheck: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
)
const IconHandshake: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
  </svg>
)
const IconSlides: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="14" x="3" y="5" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
)
const IconPlus: IconComponent = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5v14" />
  </svg>
)
const IconArrow     = mkIcon('M5 12h14m-7-7 7 7-7 7')
const IconRefresh: IconComponent = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
  </svg>
)
const IconCheck: IconComponent = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M9 11l3 3L22 4" />
  </svg>
)
const IconAlert     = mkIcon('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01')
const IconClock: IconComponent = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconGlobe: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
// Football-specific icons
const IconBall: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2C9.5 5.5 9.5 8 12 12c2.5 4 2.5 6.5 0 10" />
    <path d="M2 12h20" />
    <path d="M12 2c2.5 3.5 2.5 6 0 10-2.5 4-2.5 6.5 0 10" />
  </svg>
)
const IconCalendar: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)
const IconHome: IconComponent = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconBus       = mkIcon('M8 6v6M16 6v6M2 12h20M7 18h2a2 2 0 0 0 0-4H7v4zm8 0h2a2 2 0 0 0 0-4h-2v4zM5 6h14a1 1 0 0 1 1 1v5H4V7a1 1 0 0 1 1-1zM4 18l-1 3M20 18l1 3')
const IconListCheck: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 12H3M16 6H3M16 18H3" /><path d="m19 10-4 4 2 2 4-4-2-2z" />
  </svg>
)
const IconBolt      = mkIcon('M13 2L3 14h7l-1 8 10-12h-7l1-8z')
const IconScore: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M8 10h2M8 14h2M14 10h2M14 14h2" />
  </svg>
)

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg: '#f8fafc',
  surface: '#ffffff',
  border: 'rgba(0,0,0,0.07)',
  borderHover: 'rgba(0,0,0,0.13)',
  text: '#0f172a',
  muted: '#64748b',
  subtle: '#94a3b8',
  // WKS brand
  green: '#166534',
  greenDk: '#14532d',
  greenLt: '#f0fdf4',
  ink: '#0f2a1c',
  red: '#dc2626',
  redLt: '#fef2f2',
  redDk: '#b91c1c',
  // palette
  blue: '#3b82f6',
  blueLt: '#eff6ff',
  amber: '#d97706',
  amberLt: '#fffbeb',
  rose: '#f43f5e',
  roseLt: '#fff1f2',
  purple: '#7c3aed',
  purpleLt: '#f5f3ff',
  slate: '#475569',
  slateLt: '#f1f5f9',
  // radii
  r2xl: '16px',
  rXl: '12px',
  rLg: '10px',
  rMd: '8px',
  // shadows
  sm: '0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 16px rgba(0,0,0,0.08),0 2px 4px rgba(0,0,0,0.04)',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WksMatch = {
  round: number
  date: string | null
  time: string | null
  venue: 'home' | 'away'
  opponent: string
  played: boolean
  result: { ours: number; theirs: number; outcome: 'win' | 'draw' | 'loss'; scoreLabel: string } | null
}
type Standing = { position: number; team: string; played: number; points: number; wins: number; draws: number; losses: number; goals: string }
type SeasonData = {
  wks?: { played?: WksMatch[]; upcoming?: WksMatch[] }
  standings?: Standing[]
}
type SeasonGlobal = {
  lastSync?: string | null
  lastSyncStatus?: 'idle' | 'running' | 'success' | 'error'
  lastSyncError?: string | null
  data?: SeasonData | null
}
type NewsDoc = { id: string; title: string; date?: string; draft?: boolean; createdAt: string }
type PlayerDoc = { id: string; name: string; position?: string; team?: { name: string } | null; createdAt: string }
type CollectionDef = { slug: string; label: string; Icon: IconComponent; accent: string; accentLt: string }

// ─── API ──────────────────────────────────────────────────────────────────────

async function getCount(slug: string): Promise<number> {
  try {
    const r = await fetch(`/api/${slug}?limit=1&depth=0`, { credentials: 'include' })
    if (!r.ok) return 0
    return ((await r.json()).totalDocs as number) ?? 0
  } catch { return 0 }
}

async function getRecent<T>(slug: string, limit: number, sort = '-createdAt'): Promise<T[]> {
  try {
    const r = await fetch(`/api/${slug}?limit=${limit}&depth=1&sort=${sort}`, { credentials: 'include' })
    if (!r.ok) return []
    return ((await r.json()).docs as T[]) ?? []
  } catch { return [] }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function rel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'przed chwilą'
  if (mins < 60) return `${mins} min temu`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} godz. temu`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days} dni temu`
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtMatchDate(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return 'Data nieznana'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
  return timeStr ? `${day}, ${timeStr}` : day
}

function daysUntil(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return ''
  const dt = new Date(`${dateStr}T${timeStr ?? '12:00'}:00+02:00`)
  if (isNaN(dt.getTime())) return ''
  const diff = dt.getTime() - Date.now()
  if (diff <= 0) return 'dzisiaj / trwa'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'dzisiaj'
  if (days === 1) return 'jutro'
  return `za ${days} dni`
}

function pluralWpisow(n: number): string {
  if (n === 0) return 'brak wpisów'
  if (n === 1) return '1 wpis'
  if (n < 5) return `${n} wpisy`
  return `${n} wpisów`
}

// ─── Collections config ───────────────────────────────────────────────────────

const CONTENT: CollectionDef[] = [
  { slug: 'news',        label: 'Aktualności',      Icon: IconNewspaper, accent: T.blue,   accentLt: T.blueLt   },
  { slug: 'tags',        label: 'Tagi',              Icon: IconTag,       accent: T.purple, accentLt: T.purpleLt },
  { slug: 'staticPages', label: 'Strony statyczne',  Icon: IconGlobe,     accent: T.slate,  accentLt: T.slateLt  },
  { slug: 'heroSlides',  label: 'Slajdy hero',       Icon: IconSlides,    accent: T.amber,  accentLt: T.amberLt  },
]
const CLUB: CollectionDef[] = [
  { slug: 'teams',    label: 'Drużyny',            Icon: IconShield,    accent: T.green,  accentLt: T.greenLt  },
  { slug: 'players',  label: 'Zawodnicy',           Icon: IconUsers,     accent: T.green,  accentLt: T.greenLt  },
  { slug: 'staff',    label: 'Sztab szkoleniowy',   Icon: IconUserCheck, accent: T.blue,   accentLt: T.blueLt   },
  { slug: 'board',    label: 'Zarząd',              Icon: IconTrophy,    accent: T.amber,  accentLt: T.amberLt  },
  { slug: 'sponsors', label: 'Sponsorzy',           Icon: IconHandshake, accent: T.purple, accentLt: T.purpleLt },
  // (Galeria — kolekcja gallery jest admin.hidden=true; ścieżka idzie przez
  // Menedżer galerii w Szybkich akcjach.)
]
const SYSTEM: CollectionDef[] = [
  { slug: 'users', label: 'Użytkownicy', Icon: IconSettings, accent: T.slate, accentLt: T.slateLt },
  { slug: 'media', label: 'Media',       Icon: IconDatabase, accent: T.slate, accentLt: T.slateLt },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r2xl, boxShadow: T.sm, ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.subtle, marginBottom: 10 }}>
      {children}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green' | 'amber' | 'blue' | 'red' }) {
  const map = { green: [T.greenLt, T.green], amber: [T.amberLt, T.amber], blue: [T.blueLt, T.blue], red: [T.redLt, T.red] }
  const [bg, fg] = map[color]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 99, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ─── Football: Match strip ────────────────────────────────────────────────────

function NextMatchCard({ match }: { match: WksMatch | null }) {
  const countdown = match ? daysUntil(match.date, match.time) : ''
  const isHome = match?.venue === 'home'
  return (
    <Card style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCalendar size={13} color={T.green} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.subtle }}>
          Następny mecz
        </span>
      </div>

      {match ? (
        <>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {match.opponent}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {fmtMatchDate(match.date, match.time)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
              background: isHome ? T.greenLt : T.blueLt,
              color: isHome ? T.green : T.blue,
            }}>
              {isHome ? <IconHome size={11} color={T.green} /> : <IconBus size={11} color={T.blue} />}
              {isHome ? 'Domowy' : 'Wyjazdowy'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>Runda {match.round}</span>
          </div>
          {countdown && (
            <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{countdown}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: T.subtle, marginTop: 4 }}>Brak zaplanowanych meczów</div>
      )}
    </Card>
  )
}

function LastResultCard({ match, onAddNews }: { match: WksMatch | null; onAddNews: () => void }) {
  if (!match?.result) {
    return (
      <Card style={{ flex: 1, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.slateLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconBall size={13} color={T.slate} />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.subtle }}>Ostatni wynik</span>
        </div>
        <div style={{ fontSize: 13, color: T.subtle }}>Brak danych</div>
      </Card>
    )
  }

  const { outcome, ours, theirs } = match.result
  const outcomeMap = {
    win:  { label: 'Wygrana',  bg: T.greenLt, color: T.green,  border: 'rgba(22,101,52,0.2)'  },
    draw: { label: 'Remis',    bg: T.amberLt, color: T.amber,  border: 'rgba(217,119,6,0.2)'  },
    loss: { label: 'Porażka',  bg: T.redLt,   color: T.red,    border: 'rgba(220,38,38,0.2)'  },
  }
  const oc = outcomeMap[outcome]
  const isHome = match.venue === 'home'

  return (
    <Card style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${oc.border}`, background: oc.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconBall size={13} color={oc.color} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: oc.color }}>
          Ostatni wynik
        </span>
      </div>

      <div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>{fmtMatchDate(match.date, match.time)}</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
          {isHome ? `WKS vs ${match.opponent}` : `${match.opponent} vs WKS`}
        </div>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: oc.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {isHome ? ours : theirs}
          </span>
          <span style={{ fontSize: 20, color: T.muted, fontWeight: 300 }}>:</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: oc.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {isHome ? theirs : ours}
          </span>
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.7)', color: oc.color }}>
            {oc.label}
          </span>
        </div>
      </div>

      <button
        onClick={onAddNews}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: T.rLg, background: 'rgba(255,255,255,0.8)', border: `1px solid ${oc.border}`, fontSize: 12, fontWeight: 600, color: oc.color, cursor: 'pointer', width: 'fit-content' }}
      >
        <IconNewspaper size={12} color={oc.color} />
        Dodaj relację
      </button>
    </Card>
  )
}

function TableCard({ standings, wksPosition }: { standings: Standing[]; wksPosition: Standing | null }) {
  const leader = standings[0]
  const gap = wksPosition && leader ? wksPosition.points - leader.points : null

  return (
    <Card style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: T.amberLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconTrophy size={13} color={T.amber} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.subtle }}>
          Tabela
        </span>
      </div>

      {wksPosition ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: T.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {wksPosition.position}.
            </span>
            <span style={{ fontSize: 14, color: T.muted, marginBottom: 6, fontWeight: 500 }}>miejsce</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{wksPosition.points}</div>
              <div style={{ fontSize: 11, color: T.muted }}>punktów</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{wksPosition.goals}</div>
              <div style={{ fontSize: 11, color: T.muted }}>gole</div>
            </div>
          </div>
          {gap !== null && gap < 0 && (
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
              {Math.abs(gap)} pkt do lidera ({leader?.team?.split(' ')[0]})
            </div>
          )}
          {gap === 0 && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.green }}>🏆 Lider tabeli!</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: T.subtle }}>Brak danych tabeli</div>
      )}
    </Card>
  )
}

// ─── Football: Form strip ─────────────────────────────────────────────────────

function FormStrip({ matches }: { matches: WksMatch[] }) {
  const last5 = matches.slice(-5)
  if (last5.length === 0) return null

  const outcomeStyle: Record<string, { bg: string; color: string; label: string }> = {
    win:  { bg: T.green, color: '#fff', label: 'W' },
    draw: { bg: T.amber, color: '#fff', label: 'R' },
    loss: { bg: T.red,   color: '#fff', label: 'P' },
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r2xl, boxShadow: T.sm, marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.subtle, whiteSpace: 'nowrap' }}>
        Ostatnie 5:
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {last5.map((m, i) => {
          const outcome = m.result?.outcome ?? 'draw'
          const s = outcomeStyle[outcome]
          return (
            <div
              key={i}
              title={`${m.opponent} ${m.result?.scoreLabel ?? ''}`}
              style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: s.color, cursor: 'default' }}
            >
              {s.label}
            </div>
          )
        })}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
        {(['win', 'draw', 'loss'] as const).map((o) => {
          const count = last5.filter(m => m.result?.outcome === o).length
          const labels = { win: 'wygr.', draw: 'remis', loss: 'por.' }
          return (
            <div key={o} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: outcomeStyle[o].bg }}>{count}</div>
              <div style={{ fontSize: 10, color: T.subtle }}>{labels[o]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Post-match checklist ─────────────────────────────────────────────────────

function PostMatchPanel({ lastMatch, onSync, canCreateNews, canGalleryManager, canHeroSlides, canSync }: {
  lastMatch: WksMatch | null
  onSync: () => void
  canCreateNews: boolean
  canGalleryManager: boolean
  canHeroSlides: boolean
  canSync: boolean
}) {
  const isRecent = lastMatch?.date
    ? (Date.now() - new Date(lastMatch.date).getTime()) < 7 * 86400000
    : false

  // Filtrujemy zadania per permission. "Galeria" celuje w Menedżer galerii
  // (kolekcja gallery jest hidden — zdjęcia wgrywa się przez /admin/gallery-manager).
  type Task = { label: string; href: string | null; Icon: IconComponent; key: string; action?: () => void }
  const tasks: Task[] = []
  if (canCreateNews) tasks.push({ label: 'Dodaj relację z meczu do Aktualności', href: '/admin/collections/news/create',   Icon: IconNewspaper,  key: 'news' })
  if (canGalleryManager) tasks.push({ label: 'Wgraj zdjęcia (Menedżer galerii)',  href: '/admin/gallery-manager',           Icon: IconImage,      key: 'gallery' })
  if (canHeroSlides) tasks.push({ label: 'Zaktualizuj slajdy hero (jeśli trzeba)', href: '/admin/collections/heroSlides',    Icon: IconSlides,     key: 'hero' })
  if (canSync) tasks.push({ label: 'Zsynchronizuj wyniki (90minut)',          href: null,                                Icon: IconRefresh,    key: 'sync', action: onSync })

  return (
    <Card style={{ padding: '18px 18px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: isRecent ? T.amberLt : T.slateLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconListCheck size={13} color={isRecent ? T.amber : T.slate} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Po meczu — co zrobić?</div>
          {isRecent && lastMatch && (
            <div style={{ fontSize: 11, color: T.amber, marginTop: 1 }}>Ostatni mecz: {fmtMatchDate(lastMatch.date, null)}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tasks.map((t) => {
          const el = t.href ? (
            <a
              key={t.key}
              href={t.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: T.rLg, textDecoration: 'none', color: T.text, transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.Icon size={12} color={T.green} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{t.label}</span>
            </a>
          ) : (
            <button
              key={t.key}
              type="button"
              onClick={t.action}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: T.rLg, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.Icon size={12} color={T.green} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{t.label}</span>
            </button>
          )
          return el
        })}
      </div>
    </Card>
  )
}

// ─── Collection card ──────────────────────────────────────────────────────────

function CollectionCard({ def, count }: { def: CollectionDef; count: number }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={`/admin/collections/${def.slug}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: hov ? T.bg : T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: T.rXl, textDecoration: 'none', transition: 'all .12s', boxShadow: hov ? '0 2px 8px rgba(0,0,0,0.07)' : 'none', position: 'relative' }}
    >
      <div style={{ width: 32, height: 32, borderRadius: T.rMd, background: def.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <def.Icon size={14} color={def.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{def.label}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{pluralWpisow(count)}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: hov ? def.accent : T.subtle, marginRight: hov ? 16 : 0, transition: 'all .12s' }}>
        {count}
      </div>
      {hov && <div style={{ position: 'absolute', right: 13, color: def.accent }}><IconArrow size={13} color={def.accent} /></div>}
    </a>
  )
}

// ─── Quick btn ────────────────────────────────────────────────────────────────

function QuickBtn({ href, label, Icon: IC, accent, accentLt, primary, onClick }: { href?: string; label: string; Icon: IconComponent; accent: string; accentLt: string; primary?: boolean; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: T.rLg, background: primary ? (hov ? T.greenDk : T.green) : hov ? accentLt : 'transparent', border: primary ? 'none' : `1px solid ${hov ? T.borderHover : T.border}`, textDecoration: 'none', transition: 'all .12s', width: '100%', cursor: 'pointer' }
  const inner = (
    <>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: primary ? 'rgba(255,255,255,0.18)' : accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={13} color={primary ? '#fff' : accent} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: primary ? '#fff' : T.text }}>{label}</span>
    </>
  )
  if (onClick) {
    return <button type="button" onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ ...style, background: hov ? T.bg : 'transparent' }}>{inner}</button>
  }
  return <a href={href} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={style}>{inner}</a>
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({
  Icon: IC,
  accent,
  accentLt,
  title,
  meta,
  time,
  badge,
  href,
}: {
  Icon: IconComponent
  accent: string
  accentLt: string
  title: string
  meta?: string
  time: string
  badge?: React.ReactNode
  href?: string
}) {
  const [hov, setHov] = useState(false)

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${T.border}`,
    textDecoration: 'none',
    color: T.text,
    background: hov ? T.bg : 'transparent',
    borderRadius: 10,
    margin: '0 -10px',
    paddingLeft: 10,
    paddingRight: 10,
    cursor: href ? 'pointer' : 'default',
    transition: 'background .12s',
  }

  const inner = (
    <>
      <div style={{ width: 29, height: 29, borderRadius: T.rMd, background: accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={12} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {meta && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{meta}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: T.subtle }}>{time}</div>
        {badge}
      </div>
    </>
  )

  if (href) {
    return (
      <a href={href} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {inner}
      </a>
    )
  }

  return (
    <div style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {inner}
    </div>
  )
}

function GlobalCard({ href, label, sub, Icon: IC, accent, accentLt }: { href: string; label: string; sub: string; Icon: IconComponent; accent: string; accentLt: string }) {
  const [hov, setHov] = useState(false)
  return (
    <a href={href} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', background: hov ? T.bg : T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: T.rXl, textDecoration: 'none', transition: 'all .12s' }}>
      <div style={{ width: 32, height: 32, borderRadius: T.rMd, background: accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={14} color={accent} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>
      </div>
    </a>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileDashboard />

  return <DashboardDesktop />
}

type LiveSnapshot = {
  enabled?: boolean
  status?: 'pre' | 'live' | 'ht' | 'live2' | 'ft'
  scoreHome?: number
  scoreAway?: number
  homeLabel?: string | null
  awayLabel?: string | null
} | null

function DashboardDesktop() {
  // ── RBAC ──
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

  const [counts,  setCounts]  = useState<Record<string, number>>({})
  const [news,    setNews]    = useState<NewsDoc[]>([])
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [season,  setSeason]  = useState<SeasonGlobal | null>(null)
  const [live,    setLive]    = useState<LiveSnapshot>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Polling liveMatch co 10s — banner LIVE w headerze ma świecić zawsze gdy mecz trwa,
  // niezależnie od tego ile czasu admin zostawił otwartą stronę.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const r = await fetch('/api/globals/liveMatch?depth=0', { credentials: 'include' })
        if (!r.ok) return
        const json = await r.json()
        if (!cancelled) setLive(json as LiveSnapshot)
      } catch {
        // ignore
      }
    }
    tick()
    const t = window.setInterval(tick, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const slugs = ['news', 'players', 'teams', 'media', 'users', 'gallery', 'sponsors', 'staff', 'board', 'tags', 'heroSlides', 'staticPages']
    Promise.all([
      ...slugs.map((s) => getCount(s).then((n) => ({ s, n }))),
      getRecent<NewsDoc>('news', 6, '-date'),
      getRecent<PlayerDoc>('players', 5, '-createdAt'),
      fetch('/api/globals/season', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then((res) => {
      const map: Record<string, number> = {}
      for (let i = 0; i < slugs.length; i++) {
        const { s, n } = res[i] as { s: string; n: number }
        map[s] = n
      }
      setCounts(map)
      setNews(res[slugs.length] as NewsDoc[])
      setPlayers(res[slugs.length + 1] as PlayerDoc[])
      setSeason(res[slugs.length + 2] as SeasonGlobal)
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
        const s: SeasonGlobal = await fetch('/api/globals/season', { credentials: 'include' }).then((x) => x.json())
        setSeason(s)
        if (s.lastSyncStatus === 'success' || s.lastSyncStatus === 'error') break
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
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: T.bg,
        }}
      >
        Ładowanie…
      </div>
    )
  }

  // Derived season data
  const sd         = season?.data
  const played     = sd?.wks?.played    ?? []
  const upcoming   = sd?.wks?.upcoming  ?? []
  const standings  = sd?.standings      ?? []
  const lastMatch  = played.length > 0 ? played[played.length - 1] : null
  const nextMatch  = upcoming.find(m => m.date) ?? upcoming[0] ?? null
  const wksPos     = standings.find((s) => s.team?.includes('Wierzbice')) ?? null

  const syncStatus = season?.lastSyncStatus ?? 'idle'
  const isBusy     = syncing || syncStatus === 'running'
  const today      = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="wks-dashboard" style={{ minHeight: '100vh', background: T.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif', color: T.text, padding: '32px 36px 60px', boxSizing: 'border-box' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: T.ink, borderRadius: T.r2xl, padding: '22px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(22,101,52,0.3)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 160, width: 90, height: 90, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <img src="/herb-wks.png" alt="Herb WKS" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>WKS Wierzbice</h1>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Panel admina</span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{today}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, position: 'relative', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* LIVE indicator — pulsujący czerwony badge gdy trwa relacja, link do Studia.
              Pojawia się obok przycisków "+ Nowy news" by admin zawsze widział gdy mecz aktywny.
              RBAC: tylko dla rolami z dostępem do Live Studio. */}
          {canSpecial('liveStudio') && live?.enabled && live.status && live.status !== 'ft' && (
            <a
              href="/admin/live-studio"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#fff',
                borderRadius: T.rLg,
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: '0 2px 12px rgba(220,38,38,0.45)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: '#fff',
                  boxShadow: '0 0 0 5px rgba(255,255,255,0.22)',
                  animation: 'wks-pulse 1.5s ease-in-out infinite',
                }}
              />
              <span style={{ textTransform: 'uppercase' }}>Studio Live</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.92 }}>
                {live.scoreHome ?? 0}:{live.scoreAway ?? 0}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', padding: '2px 6px', borderRadius: 99 }}>
                TRWA
              </span>
            </a>
          )}
          {canCreate('news') && (
            <a href="/admin/collections/news/create" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.green, color: '#fff', borderRadius: T.rLg, textDecoration: 'none', fontSize: 12.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(22,101,52,0.5)' }}>
              <IconPlus size={13} color="#fff" /> Nowy news
            </a>
          )}
          {canCreate('players') && (
            <a href="/admin/collections/players/create" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.09)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: T.rLg, textDecoration: 'none', fontSize: 12.5, fontWeight: 600 }}>
              <IconPlus size={13} color="rgba(255,255,255,0.6)" /> Nowy zawodnik
            </a>
          )}
        </div>
      </div>

      {/* ── Match strip ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <NextMatchCard match={nextMatch} />
        <LastResultCard match={lastMatch} onAddNews={() => { window.location.href = '/admin/collections/news/create' }} />
        <TableCard standings={standings} wksPosition={wksPos} />
      </div>

      {/* ── Form strip ─────────────────────────────────────────────────────── */}
      {played.length > 0 && <FormStrip matches={played} />}

      {/* ── Main grid (2/3 + 1/3) ───────────────────────────────────────────
          RBAC: lewa kolumna (Recent news + players) tylko dla rolami z
          news.read OR players.read; prawa (Mecz na żywo / Quick actions /
          PostMatchPanel) tylko gdy ma jakąkolwiek akcję. Gdy obie kolumny
          puste — cały grid znika. Gdy tylko jedna jest pełna — zajmuje
          pełną szerokość. */}
      {(() => {
        const hasLeftColumn = canRead('news') || canRead('players')
        const hasRightColumn =
          canSpecial('liveStudio') ||
          canCreate('news') ||
          canCreate('players') ||
          canSpecial('galleryManager') ||
          canCreate('teams') ||
          canSpecial('syncSeason')
        if (!hasLeftColumn && !hasRightColumn) return null
        return (
      <div style={{ display: 'grid', gridTemplateColumns: hasLeftColumn && hasRightColumn ? '1fr 290px' : '1fr', gap: 16, marginBottom: 18 }}>

        {/* Left: recent news + players */}
        {hasLeftColumn && (
        <Card>
          {canRead('news') && (
            <>
          <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Ostatnie aktualności</div>
              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Niedawno dodane i zaktualizowane</div>
            </div>
            <a href="/admin/collections/news" style={{ fontSize: 12, fontWeight: 600, color: T.green, textDecoration: 'none' }}>Wszystkie →</a>
          </div>
          <div style={{ padding: '4px 20px' }}>
            {loading ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: T.subtle, fontSize: 13 }}>Ładowanie…</div>
            ) : news.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: T.subtle, fontSize: 13 }}>Brak aktualności</div>
            ) : (
              news.slice(0, 6).map((n) => (
                <ActivityRow
                  key={n.id}
                  Icon={IconNewspaper}
                  accent={T.blue}
                  accentLt={T.blueLt}
                  title={n.title}
                  meta={n.date ? fmtDate(n.date) : undefined}
                  time={rel(n.createdAt)}
                  badge={n.draft ? <Badge label="Szkic" color="amber" /> : <Badge label="Pub." color="blue" />}
                  href={`/admin/collections/news/${n.id}`}
                />
              ))
            )}
          </div>
            </>
          )}

          {/* Recent players below */}
          {canRead('players') && players.length > 0 && (
            <>
              <div style={{ padding: '4px 20px 0' }}>
                <SectionLabel>Ostatnio dodani zawodnicy</SectionLabel>
                {players.slice(0, 3).map((p) => (
                  <ActivityRow
                    key={p.id}
                    Icon={IconUsers}
                    accent={T.green}
                    accentLt={T.greenLt}
                    title={p.name}
                    meta={[p.position, (p.team as any)?.name].filter(Boolean).join(' · ')}
                    time={rel(p.createdAt)}
                    badge={<Badge label="Zawodnik" color="green" />}
                    href={`/admin/collections/players/${p.id}`}
                  />
                ))}
              </div>
            </>
          )}
          <div style={{ height: 12 }} />
        </Card>
        )}

        {/* Right: quick actions + post-match + sync */}
        {hasRightColumn && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {canSpecial('liveStudio') && (
          <Card>
            <div style={{ padding: '16px 15px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconBolt size={13} color={T.green} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Mecz na żywo</div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Szybki start relacji + przejście do Studia</div>
                </div>
              </div>
              <a
                href="/admin/live-setup"
                style={{
                  marginTop: 12,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: T.rLg,
                  background: T.green,
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: 12.5,
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(22,101,52,0.35)',
                  boxSizing: 'border-box',
                }}
              >
                ⚡ Utwórz mecz live <IconArrow size={14} color="#fff" />
              </a>
            </div>
          </Card>
          )}

          {/* Quick actions — kafelki widoczne tylko dla odpowiednich permissions.
              "Dodaj zdjęcie" przemianowane na "Menedżer galerii" — kolekcja gallery
              jest hidden, jedyna ścieżka do dodawania zdjęć to /admin/gallery-manager. */}
          {(canCreate('news') || canCreate('players') || canSpecial('galleryManager') || canCreate('teams') || canSpecial('syncSeason')) && (
          <Card>
            <div style={{ padding: '16px 15px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Szybkie akcje</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {canCreate('news') && (
                  <QuickBtn href="/admin/collections/news/create"   label="Dodaj aktualność"    Icon={IconNewspaper}  accent={T.green}  accentLt={T.greenLt}  primary />
                )}
                {canCreate('players') && (
                  <QuickBtn href="/admin/collections/players/create" label="Dodaj zawodnika"     Icon={IconUsers}      accent={T.green}  accentLt={T.greenLt}  />
                )}
                {canSpecial('galleryManager') && (
                  <QuickBtn href="/admin/gallery-manager"            label="Menedżer galerii"    Icon={IconImage}      accent={T.rose}   accentLt={T.roseLt}   />
                )}
                {canCreate('teams') && (
                  <QuickBtn href="/admin/collections/teams/create"   label="Nowa drużyna"        Icon={IconShield}     accent={T.green}  accentLt={T.greenLt}  />
                )}
                {canSpecial('syncSeason') && (
                  <QuickBtn onClick={handleSync}                     label={isBusy ? 'Synchronizuję…' : 'Sync wyników 90minut'} Icon={IconRefresh} accent={T.blue} accentLt={T.blueLt} />
                )}
              </div>
            </div>
            <div style={{ height: 8 }} />
          </Card>
          )}

          {/* Post-match checklist — widoczne dla rolami z dostępem do tworzenia
              relacji (news), zarządzania galerią lub sync (czyli komuś, kto realnie
              ma "co zrobić po meczu"). */}
          {(canCreate('news') || canSpecial('galleryManager') || canRead('heroSlides') || canSpecial('syncSeason')) && (
            <PostMatchPanel lastMatch={lastMatch} onSync={handleSync} canCreateNews={canCreate('news')} canGalleryManager={canSpecial('galleryManager')} canHeroSlides={canRead('heroSlides')} canSync={canSpecial('syncSeason')} />
          )}

          {/* Sync status mini */}
          {(syncError || season?.lastSyncError || syncStatus === 'success') && (
            <div style={{ padding: '10px 14px', borderRadius: T.rXl, border: `1px solid ${syncStatus === 'error' || syncError ? T.redLt : T.greenLt}`, background: syncStatus === 'error' || syncError ? T.redLt : T.greenLt, fontSize: 12 }}>
              {syncStatus === 'success' && !syncError && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: T.green }}>
                  <IconCheck size={13} color={T.green} />
                  <span style={{ fontWeight: 600 }}>Wyniki zsynchronizowane</span>
                  <span style={{ color: T.muted, marginLeft: 'auto' }}>{rel(season?.lastSync)}</span>
                </div>
              )}
              {(syncError || season?.lastSyncError) && (
                <div style={{ color: T.red, fontWeight: 500 }}>{syncError || season?.lastSyncError}</div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
        )
      })()}


      {/* ── Collections grid ───────────────────────────────────────────────── */}
      {(() => {
        const visibleContent = CONTENT.filter((d) => canRead(d.slug))
        const visibleClub = CLUB.filter((d) => canRead(d.slug))
        // SYSTEM zawiera 'users' (twardo zaszyte tylko Administrator) + 'media'.
        const visibleSystem = SYSTEM.filter((d) => {
          if (d.slug === 'users') return admin
          return canRead(d.slug)
        })
        const visibleGlobals: Array<{ key: string; el: React.ReactNode }> = []
        if (canGlobalUpdate('siteConfig')) visibleGlobals.push({ key: 'siteConfig', el: <GlobalCard href="/admin/globals/siteConfig" label="Konfiguracja strony" sub="Nawigacja, kontakt, social" Icon={IconSettings} accent={T.slate} accentLt={T.slateLt} /> })
        if (canGlobalUpdate('season')) visibleGlobals.push({ key: 'season', el: <GlobalCard href="/admin/globals/season" label="Sezon 2025/2026" sub="Tabela · mecze · sync" Icon={IconTrophy} accent={T.amber} accentLt={T.amberLt} /> })
        if (canSpecial('liveStudio')) visibleGlobals.push({ key: 'liveStudio', el: <GlobalCard href="/admin/live-studio" label="Studio Live" sub="Relacja na żywo (sterowanie)" Icon={IconBolt} accent={T.green} accentLt={T.greenLt} /> })
        if (canRead('liveArchives')) visibleGlobals.push({ key: 'liveArchives', el: <GlobalCard href="/admin/collections/liveArchives" label="Archiwum relacji" sub="Zakończone live'y — do napisania artykułu" Icon={IconScore} accent={T.rose} accentLt={T.roseLt} /> })

        const showContentCard = visibleContent.length > 0
        const showClubCard = visibleClub.length > 0
        const showSystemCard = visibleSystem.length > 0 || visibleGlobals.length > 0
        const visibleCount = [showContentCard, showClubCard, showSystemCard].filter(Boolean).length
        if (visibleCount === 0) return null
        const gridTemplate = visibleCount === 3 ? '1fr 1fr 1fr' : visibleCount === 2 ? '1fr 1fr' : '1fr'

        return (
      <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 16 }}>
        {/* Treści */}
        {showContentCard && (
        <Card style={{ padding: '16px 14px' }}>
          <SectionLabel>Treści</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleContent.map((def) => <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />)}
          </div>
        </Card>
        )}

        {/* Kadra & Klub */}
        {showClubCard && (
        <Card style={{ padding: '16px 14px' }}>
          <SectionLabel>Kadra i Klub</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleClub.map((def) => <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />)}
          </div>
        </Card>
        )}

        {/* System + stats */}
        {showSystemCard && (
        <Card style={{ padding: '16px 14px' }}>
          {visibleSystem.length > 0 && (
            <>
              <SectionLabel>System</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {visibleSystem.map((def) => <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />)}
              </div>
            </>
          )}

          {visibleGlobals.length > 0 && (
          <div style={{ marginTop: visibleSystem.length > 0 ? 16 : 0 }}>
            <SectionLabel>Globale</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleGlobals.map(({ key, el }) => <React.Fragment key={key}>{el}</React.Fragment>)}
            </div>
          </div>
          )}

          {/* Season mini-stats */}
          <div style={{ marginTop: 16, borderRadius: T.rXl, overflow: 'hidden', border: `1px solid rgba(15,42,28,0.12)` }}>
            <div style={{ background: T.ink, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <img src="/herb-wks.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Sezon 2025/26</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                {(['green', 'white', 'red'] as const).map((c, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c === 'green' ? T.green : c === 'red' ? T.red : '#ffffff', border: c === 'white' ? '1px solid rgba(255,255,255,0.2)' : 'none' }} />
                ))}
              </div>
            </div>
            <div style={{ background: T.greenLt, padding: '10px 13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Drużyny',    val: counts.teams   ?? 0 },
                { label: 'Zawodnicy',  val: counts.players ?? 0 },
                { label: 'Aktualności', val: counts.news   ?? 0 },
                { label: 'Media',      val: counts.media   ?? 0 },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.green, letterSpacing: '-0.02em' }}>{loading ? '…' : val}</div>
                  <div style={{ fontSize: 10.5, color: T.greenDk, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        )}
      </div>
        )
      })()}
    </div>
  )
}
