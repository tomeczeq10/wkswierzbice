'use client'

/**
 * MobileLiveStudio
 * ────────────────────────────────────────────────────────────────────────────
 * Touch-first layout of /admin/live-studio. Receives all state + handlers from
 * the parent LiveStudioPage so we keep a single source of truth for live-match
 * controller logic. Visual goals:
 *  - score panel + clock visible always (sticky top)
 *  - state buttons (Start / Koniec 1 / Start 2 / Koniec) as pills, big tap area
 *  - Goal/card actions in 2-column grid, full-width buttons
 *  - event list collapsed under the score, edit/delete inline
 *  - goal modal full-screen sheet (no overflow)
 */

import React from 'react'

type LiveMatchState = 'pre' | 'live' | 'ht' | 'live2' | 'ft'
type LiveMatchKind = 'league' | 'friendly' | 'cup' | 'custom'

export type MobileStudioProps = {
  // ── data ────────────────────────────────────────────────────────────────
  live: any
  clock: { minute: number; second: number } | null
  busy: boolean
  err: string | null
  preview: {
    competition: string
    state: string
    minute: string
    time: string
    home: string
    away: string
    sh: number
    sa: number
    events: any[]
  } | null
  currentState: LiveMatchState
  canStartMatch: boolean
  canEndFirstHalf: boolean
  canStartSecondHalf: boolean
  canEndMatch: boolean
  match: any
  lineup: Array<{ id: string; name: string }>

  // ── state setters ───────────────────────────────────────────────────────
  setState: (s: LiveMatchState) => Promise<void>
  patch: (data: any) => Promise<void>
  pauseMatch: () => Promise<void>
  resumeMatch: () => Promise<void>

  // ── score + goals ───────────────────────────────────────────────────────
  quickGoalWksFromPlus: () => Promise<void>
  quickGoalOpponent: () => Promise<void>
  undoLastGoalFor: (team: 'wks' | 'opponent') => Promise<void>
  openGoalModal: () => Promise<void>
  addCard: (team: 'wks' | 'opponent', color: 'yellow' | 'red') => Promise<void>
  undoLast: () => Promise<void>
  deleteEventAt: (idx: number) => Promise<void>
  openEdit: (idx: number) => Promise<void>
  pickSuggestedLeagueMatch: () => Promise<void>
  fmtEventText: (ev: any) => string
  eventSide: (ev: any) => 'home' | 'away' | 'neutral'

  // ── goal modal state ────────────────────────────────────────────────────
  goalModalOpen: boolean
  goalMinute: number
  goalScorerId: string
  goalAssistId: string
  goalScorerText: string
  goalAssistText: string
  goalOwnGoal: boolean
  setGoalModalOpen: (v: boolean) => void
  setGoalMinute: (n: number) => void
  setGoalScorerId: (s: string) => void
  setGoalAssistId: (s: string) => void
  setGoalScorerText: (s: string) => void
  setGoalAssistText: (s: string) => void
  setGoalOwnGoal: (v: boolean) => void
  submitGoalWks: () => Promise<void>

  // ── edit modal state ────────────────────────────────────────────────────
  editOpen: boolean
  editIndex: number
  editMinute: number
  editOwnGoal: boolean
  editScorerText: string
  editAssistText: string
  editScorerOpponentText: string
  editAssistOpponentText: string
  editText: string
  setEditOpen: (v: boolean) => void
  setEditMinute: (n: number) => void
  setEditOwnGoal: (v: boolean) => void
  setEditScorerText: (s: string) => void
  setEditAssistText: (s: string) => void
  setEditScorerOpponentText: (s: string) => void
  setEditAssistOpponentText: (s: string) => void
  setEditText: (s: string) => void
  saveEdit: () => Promise<void>
}

// ─── Tokens (dark green theme matching desktop) ──────────────────────────────

const T = {
  bg: '#0b1f14',
  surface: 'rgba(255,255,255,0.05)',
  surfaceHi: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  borderHi: 'rgba(255,255,255,0.18)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.72)',
  subtle: 'rgba(255,255,255,0.50)',
  red: '#dc2626',
  redLt: 'rgba(220,38,38,0.16)',
  green: '#22c55e',
  greenDk: '#166534',
  greenLt: 'rgba(34,197,94,0.16)',
  amber: '#f59e0b',
  amberLt: 'rgba(245,158,11,0.16)',
  blue: '#3b82f6',
  blueLt: 'rgba(59,130,246,0.16)',
}

// ─── Reusable button ─────────────────────────────────────────────────────────

function Btn({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'md',
  full,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  title?: string
}) {
  const palette =
    variant === 'primary'
      ? { bg: T.green, fg: '#fff', border: 'transparent' }
      : variant === 'danger'
        ? { bg: T.red, fg: '#fff', border: 'transparent' }
        : variant === 'success'
          ? { bg: T.greenDk, fg: '#fff', border: 'transparent' }
          : variant === 'ghost'
            ? { bg: 'transparent', fg: T.text, border: T.border }
            : { bg: T.surfaceHi, fg: T.text, border: T.border }
  const padY = size === 'lg' ? 14 : size === 'sm' ? 8 : 12
  const padX = size === 'lg' ? 18 : size === 'sm' ? 10 : 14
  const fontSize = size === 'lg' ? 15 : size === 'sm' ? 12 : 14
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: `${padY}px ${padX}px`,
        fontSize,
        fontWeight: 700,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        width: full ? '100%' : undefined,
        WebkitTapHighlightColor: 'transparent',
        font: 'inherit',
        fontStyle: 'normal',
        lineHeight: 1.2,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.subtle }}>
        {children}
      </div>
      {action}
    </div>
  )
}

function Panel({ children, padding = 14 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding,
      }}
    >
      {children}
    </div>
  )
}

// ─── Sticky scoreboard ───────────────────────────────────────────────────────

function ScoreBoard({ preview, clockTime }: { preview: MobileStudioProps['preview']; clockTime: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(22,101,52,0.55) 0%, rgba(15,42,28,0.95) 100%)',
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 99,
            background: T.red,
            boxShadow: '0 0 0 5px rgba(220,38,38,0.18)',
          }}
        />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted }}>
          {preview?.competition ?? 'Relacja'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.subtle }}>
          {preview?.state ?? '—'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.92)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview?.home ?? 'WKS'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>
            {preview?.sh ?? 0}
          </span>
          <span style={{ fontSize: 28, color: T.subtle, fontWeight: 300 }}>:</span>
          <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>
            {preview?.sa ?? 0}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.92)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview?.away ?? '—'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#fff', letterSpacing: '0.02em' }}>
        {clockTime}
      </div>
    </div>
  )
}

// ─── Modal sheet (bottom-up full-screen on mobile) ───────────────────────────

function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '92vh',
          background: '#0f2a1c',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: 14,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          color: T.text,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.surfaceHi,
              color: T.text,
              border: 'none',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Anuluj
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 10 }}>{children}</div>
        {footer && <div style={{ paddingTop: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ─── Form helpers ────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: '12px 12px',
  fontSize: 16, // 16px = no auto-zoom on iOS
  color: '#fff',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.subtle, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </label>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function MobileLiveStudio(p: MobileStudioProps) {
  const { live, clock, busy, err, preview, currentState, match } = p
  const isPaused = Boolean(live?.pauseAt)
  const canPause = (currentState === 'live' || currentState === 'live2') && !isPaused
  const canResume = (currentState === 'live' || currentState === 'live2') && isPaused

  const clockTime = clock ? `${pad(clock.minute)}:${pad(clock.second)}` : '00:00'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif',
        padding: '12px 12px 28px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <a
          href="/admin/globals/liveMatch"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: T.muted,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            background: T.surfaceHi,
            padding: '8px 12px',
            borderRadius: 10,
            border: `1px solid ${T.border}`,
          }}
        >
          ←
        </a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.subtle, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 700 }}>
            Studio Live
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 1 }}>
            {currentState === 'pre'
              ? 'Przygotowanie'
              : currentState === 'live'
                ? '1. połowa'
                : currentState === 'ht'
                  ? 'Przerwa'
                  : currentState === 'live2'
                    ? '2. połowa'
                    : 'Koniec'}
            {isPaused && currentState !== 'ht' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: T.amber }}>⏸ pauza</span>}
          </div>
        </div>
      </div>

      {err && (
        <div
          style={{
            background: T.redLt,
            color: '#fca5a5',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 10,
            border: `1px solid ${T.border}`,
          }}
        >
          {err}
        </div>
      )}

      {/* Scoreboard */}
      <ScoreBoard preview={preview} clockTime={clockTime} />

      {/* Match state controls */}
      <SectionLabel>Stan meczu</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <Btn
          variant={p.canStartMatch ? 'primary' : 'default'}
          size="md"
          disabled={busy || !p.canStartMatch}
          onClick={() => p.setState('live')}
          full
        >
          ▶ Start meczu
        </Btn>
        <Btn variant="default" size="md" disabled={busy || !p.canEndFirstHalf} onClick={() => p.setState('ht')} full>
          Koniec 1. poł.
        </Btn>
        <Btn
          variant={p.canStartSecondHalf ? 'primary' : 'default'}
          size="md"
          disabled={busy || !p.canStartSecondHalf}
          onClick={() => p.setState('live2')}
          full
        >
          Start 2. poł.
        </Btn>
        <Btn variant="danger" size="md" disabled={busy || !p.canEndMatch} onClick={() => p.setState('ft')} full>
          Koniec meczu
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Btn variant="ghost" disabled={busy || !canPause} onClick={p.pauseMatch} full>
          ⏸ Pauza
        </Btn>
        <Btn variant="ghost" disabled={busy || !canResume} onClick={p.resumeMatch} full>
          ▶ Wznów
        </Btn>
      </div>

      {/* Match kind chips (only pre-match) */}
      {currentState === 'pre' && (
        <Panel>
          <SectionLabel>Rodzaj meczu</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(['league', 'friendly', 'cup', 'custom'] as LiveMatchKind[]).map((k) => {
              const isActive = live?.kind === k
              return (
                <button
                  key={k}
                  type="button"
                  disabled={busy}
                  onClick={() => p.patch({ kind: k, mode: k === 'league' ? 'fromMatch' : 'manual' })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 99,
                    border: `1px solid ${isActive ? T.borderHi : T.border}`,
                    background: isActive ? T.surfaceHi : 'transparent',
                    color: T.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {k === 'league' ? 'Ligowy' : k === 'friendly' ? 'Sparing' : k === 'cup' ? 'Puchar' : 'Własny'}
                </button>
              )
            })}
          </div>
          <Btn variant="default" disabled={busy} onClick={p.pickSuggestedLeagueMatch} full>
            Sugestia meczu z terminarza
          </Btn>
          {match && (
            <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>
              Wybrany: <strong style={{ color: T.text }}>{match?.homeTeamLabel ?? '?'}</strong> vs{' '}
              <strong style={{ color: T.text }}>{match?.awayTeamLabel ?? '?'}</strong>
            </div>
          )}
        </Panel>
      )}

      {/* Score quick controls */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Wynik · szybko</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Panel padding={12}>
            <div style={{ fontSize: 11, color: T.subtle, marginBottom: 8, textAlign: 'center', fontWeight: 700, letterSpacing: '0.04em' }}>
              WKS
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="success" size="lg" disabled={busy} onClick={p.quickGoalWksFromPlus} full>
                +1
              </Btn>
              <Btn variant="ghost" size="lg" disabled={busy} onClick={() => p.undoLastGoalFor('wks')} full>
                −1
              </Btn>
            </div>
          </Panel>
          <Panel padding={12}>
            <div style={{ fontSize: 11, color: T.subtle, marginBottom: 8, textAlign: 'center', fontWeight: 700, letterSpacing: '0.04em' }}>
              Rywal
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="default" size="lg" disabled={busy} onClick={p.quickGoalOpponent} full>
                +1
              </Btn>
              <Btn variant="ghost" size="lg" disabled={busy} onClick={() => p.undoLastGoalFor('opponent')} full>
                −1
              </Btn>
            </div>
          </Panel>
        </div>
      </div>

      {/* Detailed events */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Zdarzenia</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <Btn variant="primary" size="lg" disabled={busy} onClick={p.openGoalModal} full>
            ⚽ Gol WKS (wybierz strzelca)
          </Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <Btn disabled={busy} onClick={() => p.addCard('wks', 'yellow')} full>
            🟨 Żółta WKS
          </Btn>
          <Btn disabled={busy} onClick={() => p.addCard('opponent', 'yellow')} full>
            🟨 Żółta rywal
          </Btn>
          <Btn disabled={busy} onClick={() => p.addCard('wks', 'red')} full>
            🟥 Czerwona WKS
          </Btn>
          <Btn disabled={busy} onClick={() => p.addCard('opponent', 'red')} full>
            🟥 Czerwona rywal
          </Btn>
        </div>
      </div>

      {/* Events list */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel
          action={
            <button
              type="button"
              disabled={busy || !(live?.events && live.events.length)}
              onClick={p.undoLast}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: T.amber,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: !(live?.events && live.events.length) ? 0.4 : 1,
              }}
            >
              ↶ Cofnij ostatnie
            </button>
          }
        >
          Lista ({(live?.events ?? []).length})
        </SectionLabel>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {(live?.events ?? []).length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: T.subtle }}>
              Brak zdarzeń. Dodaj golem, kartką lub przyciskiem +1.
            </div>
          )}
          {(live?.events ?? []).map((ev: any, i: number) => {
            const side = p.eventSide(ev)
            const sideColor = side === 'home' ? T.green : side === 'away' ? T.red : T.muted
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: i < (live?.events?.length ?? 0) - 1 ? `1px solid ${T.border}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 38,
                    fontSize: 13,
                    fontWeight: 800,
                    color: sideColor,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {typeof ev?.minute === 'number' ? `${ev.minute}'` : '—'}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.fmtEventText(ev)}
                </div>
                <button
                  type="button"
                  onClick={() => p.openEdit(i)}
                  style={{
                    background: T.surfaceHi,
                    color: T.text,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => p.deleteEventAt(i)}
                  style={{
                    background: T.redLt,
                    color: '#fca5a5',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: T.subtle }}>
        Mobile · zmiany zapisują się automatycznie
      </div>

      {/* ─── Goal modal (bottom sheet) ─────────────────────────────────────── */}
      <Sheet
        open={p.goalModalOpen}
        onClose={() => p.setGoalModalOpen(false)}
        title="⚽ Gol WKS"
        footer={
          <>
            <Btn variant="ghost" onClick={() => p.setGoalModalOpen(false)} full>
              Anuluj
            </Btn>
            <Btn variant="success" onClick={p.submitGoalWks} disabled={busy} full>
              Zapisz gola
            </Btn>
          </>
        }
      >
        <Field label="Minuta">
          <input
            type="number"
            min={0}
            value={p.goalMinute}
            onChange={(e) => p.setGoalMinute(Number(e.target.value))}
            style={inputBase}
          />
        </Field>
        <Field label="Strzelec (z kadry)">
          {p.lineup.length > 0 ? (
            <select
              value={p.goalScorerId}
              onChange={(e) => p.setGoalScorerId(e.target.value)}
              style={inputBase}
            >
              <option value="">— wybierz —</option>
              {p.lineup.map((pl) => (
                <option key={pl.id} value={pl.id} style={{ background: '#0f2a1c' }}>
                  {pl.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 12, color: T.subtle, padding: '8px 0' }}>
              Brak kadry meczowej — uzupełnij w polu lineup meczu, aby wybierać z listy.
            </div>
          )}
        </Field>
        <Field label="Strzelec (tekst, opcjonalnie)">
          <input
            type="text"
            placeholder="np. Kowalski (jeśli nie ma w kadrze)"
            value={p.goalScorerText}
            onChange={(e) => p.setGoalScorerText(e.target.value)}
            style={inputBase}
          />
        </Field>
        <Field label="Asysta (z kadry)">
          {p.lineup.length > 0 ? (
            <select value={p.goalAssistId} onChange={(e) => p.setGoalAssistId(e.target.value)} style={inputBase}>
              <option value="">— brak —</option>
              {p.lineup.map((pl) => (
                <option key={pl.id} value={pl.id} style={{ background: '#0f2a1c' }}>
                  {pl.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 12, color: T.subtle }}>—</div>
          )}
        </Field>
        <Field label="Asysta (tekst, opcjonalnie)">
          <input
            type="text"
            value={p.goalAssistText}
            onChange={(e) => p.setGoalAssistText(e.target.value)}
            style={inputBase}
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={p.goalOwnGoal}
            onChange={(e) => p.setGoalOwnGoal(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          Samobój rywala (na konto WKS)
        </label>
      </Sheet>

      {/* ─── Edit event modal ───────────────────────────────────────────────── */}
      <Sheet
        open={p.editOpen}
        onClose={() => p.setEditOpen(false)}
        title="✎ Edytuj zdarzenie"
        footer={
          <>
            <Btn variant="ghost" onClick={() => p.setEditOpen(false)} full>
              Anuluj
            </Btn>
            <Btn variant="primary" onClick={p.saveEdit} disabled={busy} full>
              Zapisz zmiany
            </Btn>
          </>
        }
      >
        {(() => {
          const ev = (live?.events ?? [])[p.editIndex]
          if (!ev) return <div>—</div>
          const isGoal = String(ev?.type) === 'goal'
          const isWks = String(ev?.team) === 'wks'
          return (
            <>
              <Field label="Minuta">
                <input
                  type="number"
                  min={0}
                  value={p.editMinute}
                  onChange={(e) => p.setEditMinute(Number(e.target.value))}
                  style={inputBase}
                />
              </Field>
              {isGoal ? (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={p.editOwnGoal}
                      onChange={(e) => p.setEditOwnGoal(e.target.checked)}
                      style={{ width: 20, height: 20 }}
                    />
                    Samobój
                  </label>
                  {isWks ? (
                    <>
                      <Field label="Strzelec (tekst)">
                        <input
                          type="text"
                          value={p.editScorerText}
                          onChange={(e) => p.setEditScorerText(e.target.value)}
                          style={inputBase}
                        />
                      </Field>
                      <Field label="Asysta (tekst)">
                        <input
                          type="text"
                          value={p.editAssistText}
                          onChange={(e) => p.setEditAssistText(e.target.value)}
                          style={inputBase}
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Strzelec rywala (tekst)">
                        <input
                          type="text"
                          value={p.editScorerOpponentText}
                          onChange={(e) => p.setEditScorerOpponentText(e.target.value)}
                          style={inputBase}
                        />
                      </Field>
                      <Field label="Asysta rywala (tekst)">
                        <input
                          type="text"
                          value={p.editAssistOpponentText}
                          onChange={(e) => p.setEditAssistOpponentText(e.target.value)}
                          style={inputBase}
                        />
                      </Field>
                    </>
                  )}
                </>
              ) : (
                <Field label="Treść">
                  <input type="text" value={p.editText} onChange={(e) => p.setEditText(e.target.value)} style={inputBase} />
                </Field>
              )}
            </>
          )
        })()}
      </Sheet>
    </div>
  )
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
