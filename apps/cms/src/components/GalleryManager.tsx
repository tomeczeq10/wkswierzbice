'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaDoc = {
  id: number
  url?: string | null
  filename?: string | null
  alt?: string | null
  sizes?: { thumbnail?: { url?: string | null }; card?: { url?: string | null } }
}

type Album = {
  id: number
  title: string
  slug: string
  description?: string | null
  eventDate?: string | null
  cover?: MediaDoc | number | null
  parent?: Album | number | null
}

type Photo = {
  id: number
  alt: string
  caption?: string | null
  image?: MediaDoc | number | null
  album?: Album | number | null
}

type Crumb = { id: number | null; title: string }

type ModalForm = {
  title: string
  slug: string
  description: string
  eventDate: string
  coverFile: File | null
  coverId: number | null
  coverThumb: string | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return mobile
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mediaThumb(m: MediaDoc | number | null | undefined): string | undefined {
  if (!m || typeof m === 'number') return undefined
  return (m.sizes?.thumbnail?.url ?? m.sizes?.card?.url ?? m.url) || undefined
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return d
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: 'include', ...opts })
  if (!r.ok) throw new Error(`API ${r.status}: ${url}`)
  return r.json()
}

async function loadAlbums(parentId: number | null): Promise<Album[]> {
  const q = parentId !== null
    ? `where[parent][equals]=${parentId}`
    : `where[parent][exists]=false`
  const d = await apiFetch(`/api/gallery-albums?${q}&depth=1&limit=300&sort=order`)
  return d.docs ?? []
}

async function loadPhotos(albumId: number | null): Promise<Photo[]> {
  const q = albumId !== null
    ? `where[album][equals]=${albumId}`
    : `where[album][exists]=false`
  const d = await apiFetch(`/api/gallery?${q}&depth=2&limit=500&sort=order`)
  return d.docs ?? []
}

async function loadMediaLibrary(): Promise<MediaDoc[]> {
  const d = await apiFetch('/api/media?limit=200&sort=-createdAt&depth=0')
  return d.docs ?? []
}

async function loadAncestors(folderId: number): Promise<Crumb[]> {
  const chain: Crumb[] = []
  let id: number | null = folderId
  const visited = new Set<number>()
  while (id !== null) {
    if (visited.has(id)) break
    visited.add(id)
    try {
      const al: Album = await apiFetch(`/api/gallery-albums/${id}?depth=1`)
      if (!al?.id) break
      chain.unshift({ id: al.id, title: al.title })
      const p = al.parent
      id = p ? (typeof p === 'number' ? p : p.id) : null
    } catch { break }
  }
  return [{ id: null, title: 'Galeria' }, ...chain]
}

async function apiUploadMedia(file: File): Promise<number | null> {
  const fd = new FormData()
  fd.append('file', file, file.name)
  const d = await apiFetch('/api/media', { method: 'POST', body: fd })
  return d.doc?.id ?? null
}

async function apiCreateAlbum(data: object): Promise<void> {
  await apiFetch('/api/gallery-albums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

async function apiUpdateAlbum(id: number, data: object): Promise<void> {
  await apiFetch(`/api/gallery-albums/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

async function apiDeleteAlbum(id: number): Promise<void> {
  await apiFetch(`/api/gallery-albums/${id}`, { method: 'DELETE' })
}

async function apiCreatePhoto(albumId: number | null, mediaId: number, alt: string): Promise<void> {
  await apiFetch('/api/gallery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: mediaId, alt, ...(albumId ? { album: albumId } : {}) }),
  })
}

async function apiDeletePhoto(id: number): Promise<void> {
  await apiFetch(`/api/gallery/${id}`, { method: 'DELETE' })
}

// ─── MediaPickerModal ─────────────────────────────────────────────────────────

function MediaPickerModal({ mode, onConfirm, onClose }: {
  mode: 'single' | 'multi'
  onConfirm: (items: MediaDoc[]) => void
  onClose: () => void
}) {
  const isMobile = useIsMobile()
  const [items, setItems] = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadMediaLibrary()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? items.filter(m =>
        (m.filename ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.alt ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items

  const toggle = (id: number) => {
    if (mode === 'single') {
      setSelected(new Set([id]))
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  }

  const handleConfirm = () => {
    const picked = items.filter(m => selected.has(m.id))
    onConfirm(picked)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 199999,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff',
        borderRadius: isMobile ? '16px 16px 0 0' : 14,
        width: '100%',
        maxWidth: isMobile ? '100%' : 720,
        maxHeight: isMobile ? '92vh' : '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden',
      }}>
        {/* Handle bar (mobile) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? '12px 16px 10px' : '20px 24px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800 }}>
              {mode === 'single' ? 'Wybierz okładkę' : 'Wybierz zdjęcia'}
            </h2>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1, padding: '4px 8px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <input
            style={inp}
            placeholder="Szukaj…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus={!isMobile}
          />
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 10 : 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>Ładowanie biblioteki…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>Brak plików{search ? ' spełniających kryteria' : ' w bibliotece'}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 90 : 120}px, 1fr))`, gap: isMobile ? 7 : 10 }}>
              {filtered.map(m => {
                const thumb = mediaThumb(m)
                const sel = selected.has(m.id)
                return (
                  <div
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    style={{
                      cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                      border: sel ? '3px solid #166534' : '2px solid transparent',
                      outline: sel ? '2px solid #166534' : '2px solid transparent',
                      outlineOffset: 1,
                      boxShadow: sel ? '0 0 0 2px rgba(22,101,52,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      background: '#f1f5f9',
                      position: 'relative',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
                      {thumb ? (
                        <img src={thumb} alt={m.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 24, color: '#94a3b8' }}>🖼</div>
                      )}
                    </div>
                    <p style={{ margin: 0, padding: '3px 5px', fontSize: isMobile ? 9 : 10, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
                      {m.alt || m.filename || '—'}
                    </p>
                    {sel && (
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>
                        ✓
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '10px 16px' : '12px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, background: '#f9fafb' }}>
          <button type="button" onClick={onClose} style={{ flex: isMobile ? 1 : undefined, padding: '11px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', minHeight: 44 }}>
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            style={{ flex: isMobile ? 2 : undefined, padding: '11px 20px', borderRadius: 8, border: 'none', background: selected.size > 0 ? '#166534' : '#d1d5db', color: '#fff', cursor: selected.size > 0 ? 'pointer' : 'default', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', minHeight: 44 }}
          >
            {mode === 'single'
              ? `Wybierz${selected.size > 0 ? '' : ' (zaznacz 1)'}`
              : `Wybierz ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FolderModal ──────────────────────────────────────────────────────────────

function FolderModal({ initial, parentTitle, onSave, onClose }: {
  initial?: Album | null
  parentTitle?: string
  onSave: (form: ModalForm) => Promise<void>
  onClose: () => void
}) {
  const isMobile = useIsMobile()
  const [form, setForm] = useState<ModalForm>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    eventDate: initial?.eventDate?.slice(0, 10) ?? '',
    coverFile: null,
    coverId: null,
    coverThumb: null,
  })
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!!initial)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const existingThumb = mediaThumb(initial?.cover as MediaDoc | number | null)

  const set = <K extends keyof ModalForm>(k: K, v: ModalForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleTitle = (v: string) => {
    set('title', v)
    if (!slugTouched) set('slug', toSlug(v))
  }

  const handleCoverPick = (items: MediaDoc[]) => {
    const item = items[0]
    if (item) {
      setForm(f => ({ ...f, coverId: item.id, coverThumb: mediaThumb(item) ?? null, coverFile: null }))
    }
    setShowCoverPicker(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111',
    minHeight: 44,
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  const previewThumb = form.coverThumb ?? (!form.coverFile ? existingThumb : null)

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.55)', display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 16,
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            borderRadius: isMobile ? '16px 16px 0 0' : 14,
            padding: isMobile ? '20px 16px 32px' : '28px 24px',
            width: '100%',
            maxWidth: isMobile ? '100%' : 480,
            display: 'flex', flexDirection: 'column',
            gap: 14,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            maxHeight: isMobile ? '92vh' : '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Handle bar (mobile) */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
            </div>
          )}

          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: isMobile ? 17 : 18, fontWeight: 800, color: '#111' }}>
              {initial ? 'Edytuj folder' : 'Nowy folder'}
            </h2>
            {!initial && parentTitle && (
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                W: <strong>{parentTitle}</strong>
              </p>
            )}
          </div>

          <div>
            <label style={lbl}>Tytuł *</label>
            <input style={inp} value={form.title} onChange={e => handleTitle(e.target.value)} required placeholder="np. Turniej U10 — maj 2025" autoFocus={!isMobile} />
          </div>

          <div>
            <label style={lbl}>Slug (URL)</label>
            <input style={inp} value={form.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value) }} placeholder="auto z tytułu" />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>/galeria/{form.slug || '…'}</p>
          </div>

          <div>
            <label style={lbl}>Opis (opcjonalnie)</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 68 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Krótki opis folderu…" />
          </div>

          <div>
            <label style={lbl}>Data wydarzenia</label>
            <input type="date" style={inp} value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
          </div>

          {/* Cover */}
          <div>
            <label style={lbl}>Okładka</label>
            {previewThumb && (
              <img src={previewThumb} alt="" style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 6, display: 'block', marginBottom: 8, border: '1px solid #e5e7eb' }} />
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#374151', textAlign: 'center', background: '#f9fafb', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {form.coverFile ? `📎 ${form.coverFile.name}` : '⬆ Wgraj plik'}
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setForm(prev => ({ ...prev, coverFile: f, coverId: null, coverThumb: null }))
                }} />
              </label>
              <button type="button" onClick={() => setShowCoverPicker(true)} style={{ padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', minHeight: 44 }}>
                📁 Z bibl.
              </button>
            </div>
            {form.coverId && !form.coverFile && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#166534', fontWeight: 600 }}>✓ Wybrano z biblioteki (ID: {form.coverId})</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', minHeight: 48 }}>
              Anuluj
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: '#166534', color: '#fff', cursor: saving ? 'default' : 'pointer', fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1, fontFamily: 'inherit', minHeight: 48 }}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>

      {showCoverPicker && (
        <MediaPickerModal
          mode="single"
          onConfirm={handleCoverPick}
          onClose={() => setShowCoverPicker(false)}
        />
      )}
    </>
  )
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({ children, title, onClick, danger, alwaysVisible }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean; alwaysVisible?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button" title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: alwaysVisible ? 34 : 28,
        height: alwaysVisible ? 34 : 28,
        borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: alwaysVisible ? 15 : 13, fontFamily: 'inherit',
        background: hov ? (danger ? '#fee2e2' : '#f3f4f6') : (alwaysVisible ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.92)'),
        boxShadow: alwaysVisible ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        transition: 'background 0.12s',
        minWidth: 34, minHeight: 34,
      }}
    >{children}</button>
  )
}

// ─── FolderCard ───────────────────────────────────────────────────────────────

function FolderCard({ folder, onOpen, onEdit, onDelete, isMobile }: {
  folder: Album
  onOpen: (f: Album) => void
  onEdit: (f: Album) => void
  onDelete: (f: Album) => void
  isMobile: boolean
}) {
  const [hov, setHov] = useState(false)
  const thumb = mediaThumb(folder.cover as MediaDoc | number | null)

  return (
    <div
      style={{
        background: '#fff',
        border: hov ? '1px solid #166534' : '1px solid #e5e7eb',
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative',
        boxShadow: hov ? '0 4px 16px rgba(22,101,52,0.14)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.15s',
      }}
      onClick={() => onOpen(folder)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ aspectRatio: '4/3', background: '#f1f5f9', overflow: 'hidden' }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: isMobile ? 28 : 36, color: '#cbd5e1' }}>📁</div>
        )}
      </div>

      <div style={{ padding: isMobile ? '8px 10px 10px' : '10px 12px 12px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 12 : 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.title}</p>
        {folder.eventDate && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6b7280' }}>{fmtDate(folder.eventDate)}</p>}
        {!isMobile && folder.description && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {folder.description}
          </p>
        )}
      </div>

      {/* Actions: always visible on mobile, hover-only on desktop */}
      <div
        style={{
          position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4,
          opacity: isMobile ? 1 : (hov ? 1 : 0),
          transition: 'opacity 0.15s',
        }}
        onClick={e => e.stopPropagation()}
      >
        <IconBtn title="Edytuj folder" onClick={() => onEdit(folder)} alwaysVisible={isMobile}>✏️</IconBtn>
        <IconBtn title="Usuń folder" onClick={() => onDelete(folder)} danger alwaysVisible={isMobile}>🗑️</IconBtn>
      </div>
    </div>
  )
}

// ─── PhotoCard ────────────────────────────────────────────────────────────────

function PhotoCard({ photo, onDelete, isMobile }: { photo: Photo; onDelete: (p: Photo) => void; isMobile: boolean }) {
  const [hov, setHov] = useState(false)
  const thumb = mediaThumb(photo.image as MediaDoc | number | null)

  return (
    <div
      style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
        {thumb ? (
          <img src={thumb} alt={photo.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 22, color: '#94a3b8' }}>🖼</div>
        )}
      </div>
      <p style={{ margin: 0, padding: '3px 5px', fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
        {photo.alt || '—'}
      </p>
      {/* Delete: always show on mobile, hover-only on desktop */}
      {(isMobile || hov) && (
        <button
          type="button" title="Usuń zdjęcie" onClick={() => onDelete(photo)}
          style={{
            position: 'absolute', top: 4, right: 4,
            width: isMobile ? 28 : 22,
            height: isMobile ? 28 : 22,
            borderRadius: 4, border: 'none', background: 'rgba(220,38,38,0.9)',
            color: '#fff', cursor: 'pointer', fontSize: isMobile ? 18 : 15, display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'inherit',
          }}
        >×</button>
      )}
    </div>
  )
}

// ─── Main inner component ─────────────────────────────────────────────────────

function GalleryManagerInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const folderParam = searchParams?.get('folder')
  const currentFolderId: number | null = folderParam ? parseInt(folderParam, 10) : null

  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, title: 'Galeria' }])
  const [folders, setFolders] = useState<Album[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editTarget, setEditTarget] = useState<Album | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [showPhotosPicker, setShowPhotosPicker] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dragCounter = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Breadcrumb from URL
  useEffect(() => {
    if (!currentFolderId) {
      setCrumbs([{ id: null, title: 'Galeria' }])
      return
    }
    loadAncestors(currentFolderId)
      .then(setCrumbs)
      .catch(() => setCrumbs([{ id: null, title: 'Galeria' }]))
  }, [currentFolderId])

  // Content load
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [f, p] = await Promise.all([loadAlbums(currentFolderId), loadPhotos(currentFolderId)])
      setFolders(f)
      setPhotos(p)
    } catch (e: any) {
      setError(e?.message ?? 'Błąd ładowania')
    } finally {
      setLoading(false)
    }
  }, [currentFolderId])

  useEffect(() => { refresh() }, [refresh])

  // Navigation
  const navigateInto = (f: Album) => router.push(`/admin/gallery-manager?folder=${f.id}`)
  const navigateTo = (c: Crumb) =>
    c.id === null
      ? router.push('/admin/gallery-manager')
      : router.push(`/admin/gallery-manager?folder=${c.id}`)

  // Folder actions
  const handleDeleteFolder = async (f: Album) => {
    if (!confirm(`Usunąć folder „${f.title}"?\n\nZdjęcia w nim pozostaną w bazie.`)) return
    try { await apiDeleteAlbum(f.id); refresh() } catch { alert('Błąd podczas usuwania folderu.') }
  }

  // Photo actions
  const handleDeletePhoto = async (p: Photo) => {
    if (!confirm(`Usunąć zdjęcie „${p.alt}"?`)) return
    try { await apiDeletePhoto(p.id); refresh() } catch { alert('Błąd podczas usuwania zdjęcia.') }
  }

  // Upload new files
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setUploadStatus(`${i + 1} / ${files.length}: ${f.name}`)
      try {
        const id = await apiUploadMedia(f)
        if (id) await apiCreatePhoto(currentFolderId, id, f.name.replace(/\.[^.]+$/, ''))
      } catch (e) { console.error('Upload error:', e) }
    }
    setUploadStatus(null)
    if (fileRef.current) fileRef.current.value = ''
    refresh()
  }

  // Pick photos from library
  const handlePickPhotosFromLibrary = async (items: MediaDoc[]) => {
    setShowPhotosPicker(false)
    if (items.length === 0) return
    setUploadStatus(`Dodawanie ${items.length} zdjęć z biblioteki…`)
    for (const item of items) {
      try {
        const alt = item.alt || item.filename?.replace(/\.[^.]+$/, '') || 'zdjęcie'
        await apiCreatePhoto(currentFolderId, item.id, alt)
      } catch (e) { console.error(e) }
    }
    setUploadStatus(null)
    refresh()
  }

  // Drag & drop
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setDragOver(true) }
  const onDragLeave = () => { dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false) } }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current = 0; setDragOver(false); handleUpload(e.dataTransfer.files) }

  // Folder save
  const handleSave = async (form: ModalForm) => {
    let coverId: number | undefined
    if (form.coverFile) {
      const id = await apiUploadMedia(form.coverFile)
      if (id) coverId = id
    } else if (form.coverId) {
      coverId = form.coverId
    }
    const data: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || toSlug(form.title),
      ...(form.description ? { description: form.description } : {}),
      ...(form.eventDate ? { eventDate: form.eventDate } : {}),
      ...(coverId !== undefined ? { cover: coverId } : {}),
    }
    if (modal === 'create' && currentFolderId) data.parent = currentFolderId
    try {
      if (modal === 'edit' && editTarget) await apiUpdateAlbum(editTarget.id, data)
      else await apiCreateAlbum(data)
    } catch { alert('Błąd podczas zapisywania folderu.') }
    setModal('none')
    setEditTarget(null)
    refresh()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentTitle = crumbs[crumbs.length - 1]?.title ?? 'Galeria'

  // Mobile breadcrumb: show only last 2 crumbs with "…" prefix
  const visibleCrumbs = isMobile && crumbs.length > 2
    ? [{ id: null as null, title: '…' }, ...crumbs.slice(-2)]
    : crumbs

  const btnGreen: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: isMobile ? '0 10px' : '9px 16px',
    height: 44,
    borderRadius: 8, border: 'none', background: '#166534', color: '#fff',
    cursor: 'pointer', fontSize: isMobile ? 12 : 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
    flex: isMobile ? 1 : undefined,
  }
  const btnWhite: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: isMobile ? '0 10px' : '9px 16px',
    height: 44,
    borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151',
    cursor: 'pointer', fontSize: isMobile ? 12 : 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
    flex: isMobile ? 1 : undefined,
  }
  const btnBack: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px',
    borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', color: '#6b7280',
    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'none',
    minHeight: 36,
  }
  const sectionTitle: React.CSSProperties = {
    margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  }

  const px = isMobile ? 14 : 36

  return (
    <div style={{ padding: `20px ${px}px 60px`, minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827' }}>

      {/* ── Back to dashboard ── */}
      <div style={{ marginBottom: 14 }}>
        <a href="/admin" style={btnBack}>← Dashboard</a>
      </div>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Title + breadcrumb */}
        <div style={{ marginBottom: isMobile ? 12 : 16 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Menedżer galerii
          </h1>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {visibleCrumbs.map((c, i) => (
              <React.Fragment key={`${c.id ?? 'root'}-${i}`}>
                {i > 0 && <span style={{ color: '#d1d5db', fontSize: 13, userSelect: 'none', padding: '0 2px' }}>/</span>}
                <button
                  type="button"
                  onClick={() => c.title === '…' ? undefined : navigateTo(c)}
                  style={{
                    background: 'none', border: 'none',
                    cursor: (i === visibleCrumbs.length - 1 || c.title === '…') ? 'default' : 'pointer',
                    padding: '3px 5px', borderRadius: 4, fontSize: isMobile ? 13 : 14, fontFamily: 'inherit',
                    fontWeight: i === visibleCrumbs.length - 1 ? 700 : 500,
                    color: i === visibleCrumbs.length - 1 ? '#111' : (c.title === '…' ? '#9ca3af' : '#166534'),
                    minHeight: 32,
                  }}
                >{c.title}</button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Action buttons — flex row, full-width on mobile */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <button style={btnWhite} onClick={() => { setEditTarget(null); setModal('create') }}>
            📁 {isMobile ? 'Folder' : 'Nowy folder'}
          </button>
          <button style={btnWhite} onClick={() => setShowPhotosPicker(true)}>
            🗂 {isMobile ? 'Biblioteka' : 'Z biblioteki'}
          </button>
          <button style={btnGreen} onClick={() => fileRef.current?.click()}>
            ⬆ {isMobile ? 'Dodaj' : 'Dodaj zdjęcia'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* ── Upload progress ── */}
      {uploadStatus && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534', fontWeight: 600 }}>
          ⏳ {uploadStatus}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error} —{' '}
          <button type="button" onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontFamily: 'inherit', fontSize: 13 }}>Spróbuj ponownie</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: 15 }}>Ładowanie…</div>
      ) : (
        <>
          {/* ── Sub-folders ── */}
          {folders.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={sectionTitle}>Podfoldery ({folders.length})</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(auto-fill, minmax(140px, 1fr))'
                  : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: isMobile ? 10 : 14,
              }}>
                {folders.map(f => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    isMobile={isMobile}
                    onOpen={navigateInto}
                    onEdit={f => { setEditTarget(f); setModal('edit') }}
                    onDelete={handleDeleteFolder}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Photos ── */}
          <section>
            <h2 style={sectionTitle}>Zdjęcia ({photos.length})</h2>

            {photos.length > 0 ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'repeat(auto-fill, minmax(90px, 1fr))'
                    : 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: isMobile ? 7 : 10,
                  marginBottom: 10,
                }}>
                  {photos.map(p => <PhotoCard key={p.id} photo={p} onDelete={handleDeletePhoto} isMobile={isMobile} />)}
                </div>
                <div
                  onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? '#166534' : '#e5e7eb'}`,
                    borderRadius: 8, padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                    color: dragOver ? '#166534' : '#9ca3af', fontSize: 12, fontWeight: 600,
                    background: dragOver ? '#f0fdf4' : 'transparent', transition: 'all 0.2s',
                    minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  + Dodaj więcej zdjęć{!isMobile && ' (przeciągnij lub kliknij)'}
                </div>
              </>
            ) : (
              <div
                onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#166534' : '#d1d5db'}`,
                  borderRadius: 10, padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? '#f0fdf4' : '#f9fafb', transition: 'all 0.2s',
                  color: dragOver ? '#166534' : '#9ca3af',
                }}
              >
                <div style={{ fontSize: isMobile ? 28 : 36, marginBottom: 10 }}>📷</div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>
                  {isMobile ? 'Kliknij, żeby dodać zdjęcia' : 'Przeciągnij zdjęcia lub kliknij, żeby dodać'}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 12 }}>JPG, PNG, WEBP — lub użyj „Biblioteka" powyżej</p>
              </div>
            )}
          </section>

          {/* ── Empty state ── */}
          {folders.length === 0 && photos.length === 0 && !error && (
            <div style={{ textAlign: 'center', marginTop: 32, color: '#9ca3af' }}>
              <div style={{ fontSize: isMobile ? 36 : 44, marginBottom: 12 }}>📂</div>
              <p style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#6b7280' }}>Ten folder jest pusty</p>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>Utwórz podfolder lub dodaj zdjęcia korzystając z przycisków powyżej.</p>
            </div>
          )}
        </>
      )}

      {/* ── Folder modal ── */}
      {(modal === 'create' || modal === 'edit') && (
        <FolderModal
          initial={modal === 'edit' ? editTarget : null}
          parentTitle={modal === 'create' ? currentTitle : undefined}
          onSave={handleSave}
          onClose={() => { setModal('none'); setEditTarget(null) }}
        />
      )}

      {/* ── Photos library picker ── */}
      {showPhotosPicker && (
        <MediaPickerModal
          mode="multi"
          onConfirm={handlePickPhotosFromLibrary}
          onClose={() => setShowPhotosPicker(false)}
        />
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function GalleryManager() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>Ładowanie…</div>}>
      <GalleryManagerInner />
    </Suspense>
  )
}
