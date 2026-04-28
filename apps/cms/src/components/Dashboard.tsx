'use client'

import React, { useCallback, useEffect, useState } from 'react'

// ─── Icons (inline SVG, no external deps) ────────────────────────────────────

type IconProps = { size?: number; color?: string }
type IconComponent = (props: IconProps) => React.ReactElement

const mkIcon =
  (d: string, extra?: string): IconComponent =>
  ({ size = 18, color = 'currentColor' }) =>
    (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={d} />
        {extra && <path d={extra} />}
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
const IconShield: IconComponent = mkIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
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
const IconStar: IconComponent = mkIcon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z')
const IconLayout: IconComponent = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" />
  </svg>
)
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
const IconArrow: IconComponent = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
)
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
const IconAlert: IconComponent = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
)
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg: '#f8fafc',
  surface: '#ffffff',
  border: 'rgba(0,0,0,0.07)',
  borderHover: 'rgba(0,0,0,0.13)',
  text: '#0f172a',
  muted: '#64748b',
  subtle: '#94a3b8',
  // accent = club green
  green: '#16a34a',
  greenDk: '#15803d',
  greenLt: '#f0fdf4',
  // other palette
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

type NewsDoc = { id: string; title: string; date?: string; draft?: boolean; createdAt: string }
type PlayerDoc = { id: string; name: string; position?: string; number?: number; team?: { name: string } | null; createdAt: string }
type SeasonGlobal = { lastSync?: string | null; lastSyncStatus?: 'idle' | 'running' | 'success' | 'error'; lastSyncError?: string | null }
type CollectionDef = { slug: string; label: string; Icon: IconComponent; accent: string; accentLt: string }

// ─── API ──────────────────────────────────────────────────────────────────────

async function getCount(slug: string): Promise<number> {
  try {
    const r = await fetch(`/api/${slug}?limit=1&depth=0`, { credentials: 'include' })
    if (!r.ok) return 0
    return ((await r.json()).totalDocs as number) ?? 0
  } catch {
    return 0
  }
}

async function getRecent<T>(slug: string, limit: number, sort = '-createdAt'): Promise<T[]> {
  try {
    const r = await fetch(`/api/${slug}?limit=${limit}&depth=1&sort=${sort}`, { credentials: 'include' })
    if (!r.ok) return []
    return ((await r.json()).docs as T[]) ?? []
  } catch {
    return []
  }
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

function pluralWpisow(n: number): string {
  if (n === 0) return 'brak wpisów'
  if (n === 1) return '1 wpis'
  if (n < 5) return `${n} wpisy`
  return `${n} wpisów`
}

// ─── Collection groups config ─────────────────────────────────────────────────

const CONTENT: CollectionDef[] = [
  { slug: 'news', label: 'Aktualności', Icon: IconNewspaper, accent: T.blue, accentLt: T.blueLt },
  { slug: 'tags', label: 'Tagi', Icon: IconTag, accent: T.purple, accentLt: T.purpleLt },
  { slug: 'staticPages', label: 'Strony statyczne', Icon: IconGlobe, accent: T.slate, accentLt: T.slateLt },
  { slug: 'heroSlides', label: 'Slajdy hero', Icon: IconSlides, accent: T.amber, accentLt: T.amberLt },
]

const CLUB: CollectionDef[] = [
  { slug: 'teams', label: 'Drużyny', Icon: IconShield, accent: T.green, accentLt: T.greenLt },
  { slug: 'players', label: 'Zawodnicy', Icon: IconUsers, accent: T.green, accentLt: T.greenLt },
  { slug: 'staff', label: 'Sztab szkoleniowy', Icon: IconUserCheck, accent: T.blue, accentLt: T.blueLt },
  { slug: 'board', label: 'Zarząd', Icon: IconTrophy, accent: T.amber, accentLt: T.amberLt },
  { slug: 'sponsors', label: 'Sponsorzy', Icon: IconHandshake, accent: T.purple, accentLt: T.purpleLt },
  { slug: 'gallery', label: 'Galeria', Icon: IconImage, accent: T.rose, accentLt: T.roseLt },
]

const SYSTEM: CollectionDef[] = [
  { slug: 'users', label: 'Użytkownicy', Icon: IconSettings, accent: T.slate, accentLt: T.slateLt },
  { slug: 'media', label: 'Media', Icon: IconDatabase, accent: T.slate, accentLt: T.slateLt },
]

// ─── Primitive components ─────────────────────────────────────────────────────

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

function Badge({ label, color }: { label: string; color: 'green' | 'amber' | 'blue' }) {
  const map = { green: [T.greenLt, T.green], amber: [T.amberLt, T.amber], blue: [T.blueLt, T.blue] }
  const [bg, fg] = map[color]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 99, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, Icon: IC, accent, accentLt, sub }: { label: string; value: number | string; Icon: IconComponent; accent: string; accentLt: string; sub?: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ flex: 1, minWidth: 180, background: T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: T.r2xl, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: hov ? T.md : T.sm, transform: hov ? 'translateY(-1px)' : 'none', transition: 'box-shadow .15s,transform .15s,border-color .15s' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: T.rXl, background: accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={20} color={accent} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: T.muted, letterSpacing: '.01em' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1.15, marginTop: 1, letterSpacing: '-0.02em' }}>
          {typeof value === 'number' ? value.toLocaleString('pl-PL') : value}
        </div>
        {sub && <div style={{ fontSize: 11.5, color: T.subtle, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── CollectionCard ───────────────────────────────────────────────────────────

function CollectionCard({ def, count }: { def: CollectionDef; count: number }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={`/admin/collections/${def.slug}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: hov ? T.bg : T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: T.rXl, textDecoration: 'none', transition: 'all .12s', boxShadow: hov ? '0 2px 8px rgba(0,0,0,0.07)' : 'none', position: 'relative' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: T.rMd, background: def.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <def.Icon size={15} color={def.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{def.label}</div>
        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{pluralWpisow(count)}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: hov ? def.accent : T.subtle, marginRight: hov ? 18 : 0, transition: 'all .12s' }}>
        {count}
      </div>
      {hov && (
        <div style={{ position: 'absolute', right: 14, color: T.muted }}>
          <IconArrow size={13} color={def.accent} />
        </div>
      )}
    </a>
  )
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

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
  const Tag: any = href ? 'a' : 'div'
  return (
    <Tag
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: `1px solid ${T.border}`,
        textDecoration: 'none',
        cursor: href ? 'pointer' : 'default',
        background: hov && href ? 'rgba(148,163,184,0.08)' : 'transparent',
        transition: 'background .12s',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: T.rMd,
          background: accentLt,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IC size={13} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {meta && <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{meta}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: T.subtle, whiteSpace: 'nowrap' }}>{time}</div>
        {badge}
      </div>
      {hov && href && (
        <div style={{ marginLeft: 6, color: T.muted, flexShrink: 0 }}>
          <IconArrow size={13} color={accent} />
        </div>
      )}
    </Tag>
  )
}

// ─── QuickActionBtn ───────────────────────────────────────────────────────────

function QuickBtn({ href, label, Icon: IC, accent, accentLt, primary }: { href: string; label: string; Icon: IconComponent; accent: string; accentLt: string; primary?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: T.rLg, background: primary ? (hov ? T.greenDk : T.green) : hov ? accentLt : 'transparent', border: primary ? 'none' : `1px solid ${hov ? T.borderHover : T.border}`, textDecoration: 'none', transition: 'all .12s', width: '100%' }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 6, background: primary ? 'rgba(255,255,255,0.18)' : accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={13} color={primary ? '#fff' : accent} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: primary ? '#fff' : T.text }}>{label}</span>
    </a>
  )
}

// ─── GlobalCard ───────────────────────────────────────────────────────────────

function GlobalCard({ href, label, sub, Icon: IC, accent, accentLt }: { href: string; label: string; sub: string; Icon: IconComponent; accent: string; accentLt: string }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: hov ? T.bg : T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: T.rXl, textDecoration: 'none', transition: 'all .12s' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: T.rMd, background: accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IC size={15} color={accent} />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{sub}</div>
      </div>
    </a>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [news, setNews] = useState<NewsDoc[]>([])
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [season, setSeason] = useState<SeasonGlobal | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    const slugs = ['news', 'players', 'teams', 'media', 'users', 'gallery', 'sponsors', 'staff', 'board', 'tags', 'heroSlides', 'staticPages']
    Promise.all([
      ...slugs.map((s) => getCount(s).then((n) => ({ s, n }))),
      getRecent<NewsDoc>('news', 6, '-date'),
      getRecent<PlayerDoc>('players', 5, '-createdAt'),
      fetch('/api/globals/season', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
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

  const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const syncStatus = season?.lastSyncStatus ?? 'idle'
  const isBusy = syncing || syncStatus === 'running'
  const syncColor = syncStatus === 'success' ? T.green : syncStatus === 'error' ? T.rose : T.muted
  const syncLabel = isBusy ? 'Synchronizuję…' : syncStatus === 'success' ? 'Zsynchronizowano' : syncStatus === 'error' ? 'Błąd synchronizacji' : 'Nie zsynchronizowano'

  const skeleton = loading ? '…' : undefined

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        color: T.text,
        padding: '36px 40px 60px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: T.text }}>
              WKS Wierzbice
            </h1>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.green, background: T.greenLt, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.03em' }}>
              Panel admina
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: T.muted, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/admin/collections/news/create"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: T.green, color: '#fff', borderRadius: T.rLg, textDecoration: 'none', fontSize: 13, fontWeight: 700, boxShadow: '0 1px 4px rgba(22,163,74,0.35)', letterSpacing: '0.01em' }}
          >
            <IconPlus size={14} color="#fff" /> Nowy news
          </a>
          <a
            href="/admin/collections/players/create"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: T.rLg, textDecoration: 'none', fontSize: 13, fontWeight: 600, boxShadow: T.sm }}
          >
            <IconPlus size={14} color={T.muted} /> Nowy zawodnik
          </a>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Aktualności" value={skeleton ?? counts.news ?? 0} Icon={IconNewspaper} accent={T.blue} accentLt={T.blueLt} sub={`${counts.tags ?? 0} tagów`} />
        <StatCard label="Zawodnicy" value={skeleton ?? counts.players ?? 0} Icon={IconUsers} accent={T.green} accentLt={T.greenLt} sub={`w ${counts.teams ?? 0} drużynach`} />
        <StatCard label="Galeria" value={skeleton ?? counts.gallery ?? 0} Icon={IconImage} accent={T.rose} accentLt={T.roseLt} sub={`${counts.media ?? 0} pliki media`} />
        <StatCard label="Sponsorzy" value={skeleton ?? counts.sponsors ?? 0} Icon={IconStar} accent={T.amber} accentLt={T.amberLt} sub={`${counts.staff ?? 0} sz. + ${counts.board ?? 0} zarząd`} />
      </div>

      {/* ── Main grid (2/3 + 1/3) ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, marginBottom: 20 }}>
        {/* Activity feed */}
        <Card>
          <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Ostatnia aktywność</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Niedawno dodane newsy i zawodnicy</div>
            </div>
            <a href="/admin/collections/news" style={{ fontSize: 12, fontWeight: 600, color: T.green, textDecoration: 'none' }}>
              Wszystkie newsy →
            </a>
          </div>

          <div style={{ padding: '8px 22px 6px' }}>
            {loading ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: T.subtle, fontSize: 13 }}>Ładowanie…</div>
            ) : (
              <>
                <div style={{ marginTop: 12 }}>
                  <SectionLabel>Aktualności</SectionLabel>
                  {news.length === 0 ? (
                    <div style={{ fontSize: 13, color: T.subtle, padding: '10px 0' }}>Brak aktualności</div>
                  ) : (
                    news.slice(0, 5).map((n) => (
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

                <div style={{ marginTop: 18 }}>
                  <SectionLabel>Ostatnio dodani zawodnicy</SectionLabel>
                  {players.length === 0 ? (
                    <div style={{ fontSize: 13, color: T.subtle, padding: '10px 0' }}>Brak zawodników</div>
                  ) : (
                    players.slice(0, 4).map((p) => (
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
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <div style={{ height: 14 }} />
        </Card>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick actions */}
          <Card>
            <div style={{ padding: '18px 16px 6px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Szybkie akcje</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <QuickBtn href="/admin/collections/news/create" label="Dodaj aktualność" Icon={IconNewspaper} accent={T.green} accentLt={T.greenLt} primary />
                <QuickBtn href="/admin/collections/players/create" label="Dodaj zawodnika" Icon={IconUsers} accent={T.green} accentLt={T.greenLt} />
                <QuickBtn href="/admin/collections/gallery/create" label="Dodaj zdjęcie" Icon={IconImage} accent={T.rose} accentLt={T.roseLt} />
                <QuickBtn href="/admin/collections/teams/create" label="Nowa drużyna" Icon={IconShield} accent={T.green} accentLt={T.greenLt} />
                <QuickBtn href="/admin/globals/siteConfig" label="Konfiguracja strony" Icon={IconSettings} accent={T.slate} accentLt={T.slateLt} />
              </div>
            </div>
            <div style={{ height: 14 }} />
          </Card>

          {/* Season sync */}
          <Card>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Wyniki 90minut</div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Tabela i plan meczów</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: T.rMd, background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconRefresh size={14} color={T.green} />
                </div>
              </div>

              {/* Status pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: T.bg, borderRadius: T.rLg, marginBottom: 12 }}>
                {syncStatus === 'success' ? <IconCheck size={13} color={T.green} /> : syncStatus === 'error' ? <IconAlert size={13} color={T.rose} /> : <IconClock size={13} color={T.muted} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: syncColor }}>{syncLabel}</div>
                  {season?.lastSync && (
                    <div style={{ fontSize: 11, color: T.subtle, marginTop: 1 }}>{rel(season.lastSync)}</div>
                  )}
                </div>
              </div>

              {(syncError || season?.lastSyncError) && (
                <div style={{ padding: '8px 10px', background: T.roseLt, borderRadius: T.rMd, fontSize: 11.5, color: T.rose, marginBottom: 12, lineHeight: 1.5 }}>
                  {syncError || season?.lastSyncError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSync}
                disabled={isBusy}
                style={{ width: '100%', padding: '9px 0', background: isBusy ? T.bg : T.surface, border: `1px solid ${T.border}`, borderRadius: T.rLg, fontSize: 13, fontWeight: 600, color: isBusy ? T.subtle : T.text, cursor: isBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .12s' }}
              >
                <IconRefresh size={13} color={isBusy ? T.subtle : T.muted} />
                {isBusy ? 'Synchronizuję…' : 'Odśwież teraz'}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Collections grid ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        {/* Treści */}
        <Card style={{ padding: '18px 16px 16px' }}>
          <SectionLabel>Treści</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {CONTENT.map((def) => (
              <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />
            ))}
          </div>
        </Card>

        {/* Klub */}
        <Card style={{ padding: '18px 16px 16px' }}>
          <SectionLabel>Klub</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {CLUB.map((def) => (
              <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />
            ))}
          </div>
        </Card>

        {/* System + Globals */}
        <Card style={{ padding: '18px 16px 16px' }}>
          <SectionLabel>System</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SYSTEM.map((def) => (
              <CollectionCard key={def.slug} def={def} count={counts[def.slug] ?? 0} />
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <SectionLabel>Globale</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <GlobalCard href="/admin/globals/siteConfig" label="Konfiguracja strony" sub="Nawigacja, kontakt, social" Icon={IconSettings} accent={T.slate} accentLt={T.slateLt} />
              <GlobalCard href="/admin/globals/season" label="Sezon 2025/2026" sub="Tabela · mecze · sync" Icon={IconTrophy} accent={T.amber} accentLt={T.amberLt} />
            </div>
          </div>

          {/* Club stats summary */}
          <div style={{ marginTop: 20, padding: '14px', background: T.greenLt, borderRadius: T.rXl, border: `1px solid rgba(22,163,74,0.15)` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.green, marginBottom: 10 }}>Sezon 2025/26</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Drużyny', val: counts.teams ?? 0 },
                { label: 'Zawodnicy', val: counts.players ?? 0 },
                { label: 'Aktualności', val: counts.news ?? 0 },
                { label: 'Pliki media', val: counts.media ?? 0 },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: T.green, letterSpacing: '-0.02em' }}>{loading ? '…' : val}</div>
                  <div style={{ fontSize: 11, color: T.greenDk, opacity: 0.8 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
