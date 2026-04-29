'use client'

import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export default function NavBack() {
  const router = useRouter()
  const [path, setPath] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const p = window.location.pathname
    setPath(p)
    setVisible(p !== '/admin' && p !== '/admin/')
  }, [])

  // Słuchaj zmian URL (Next.js router)
  const pathname = usePathname()
  useEffect(() => {
    setPath(pathname)
    setVisible(pathname !== '/admin' && pathname !== '/admin/')
  }, [pathname])

  if (!visible) return null

  const LABELS: Record<string, string> = {
    news: 'Aktualności',
    players: 'Zawodnicy',
    teams: 'Drużyny',
    media: 'Media',
    gallery: 'Galeria',
    'gallery-albums': 'Albumy',
    board: 'Zarząd',
    staff: 'Sztab',
    sponsors: 'Sponsorzy',
    'hero-slides': 'Slider hero',
    'static-pages': 'Strony',
    users: 'Użytkownicy',
    tags: 'Tagi',
  }

  const editMatch = path.match(/^\/admin\/collections\/([^/]+)\/[^/]+/)
  const listMatch = path.match(/^\/admin\/collections\/([^/]+)$/)

  let label = '← Dashboard'
  let href = '/admin'

  if (editMatch) {
    const slug = editMatch[1]
    label = `← ${LABELS[slug] ?? slug}`
    href = `/admin/collections/${slug}`
  } else if (listMatch) {
    label = '← Dashboard'
    href = '/admin'
  }

  return (
    <>
      {/* Always-visible: niezależnie od tego czy sidebar jest schowany */}
      <div
        style={{
          position: 'fixed',
          top: 76,
          left: 16,
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => router.push(href)}
          style={{
            pointerEvents: 'all',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(22, 101, 52, 0.98)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
          aria-label={label}
          title={label}
        >
          <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
            ←
          </span>
          <span>{label.replace(/^←\s*/, '')}</span>
        </button>
      </div>
    </>
  )
}
