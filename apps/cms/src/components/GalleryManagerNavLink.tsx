'use client'
import React, { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function GalleryManagerNavLink() {
  const pathname = usePathname() ?? ''
  const active = pathname.startsWith('/admin/gallery-manager')
  const [hov, setHov] = useState(false)

  return (
    <div style={{ padding: '8px 10px 4px' }}>
      <a
        href="/admin/gallery-manager"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
          fontSize: 13, fontWeight: 700,
          color: active ? '#ffffff' : hov ? '#ffffff' : '#d1fae5',
          background: active
            ? '#14532d'
            : hov
            ? 'rgba(22,101,52,0.85)'
            : 'rgba(22,101,52,0.65)',
          border: '1px solid rgba(255,255,255,0.12)',
          transition: 'background 0.15s, color 0.15s',
          boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>📁</span>
        <span>Menedżer galerii</span>
      </a>
    </div>
  )
}
