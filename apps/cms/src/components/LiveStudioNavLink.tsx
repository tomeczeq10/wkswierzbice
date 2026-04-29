'use client'

import React, { useMemo } from 'react'
import { usePathname } from 'next/navigation'

export default function LiveStudioNavLink() {
  const pathname = usePathname()
  const active = useMemo(() => pathname === '/admin/live-studio', [pathname])

  return (
    <div style={{ padding: 'calc(var(--base) * 0.5)', width: '100%' }}>
      <a
        href="/admin/live-studio"
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          textDecoration: 'none',
          borderRadius: 12,
          padding: '10px 12px',
          border: `1px solid ${active ? 'rgba(22, 101, 52, 0.38)' : 'rgba(0,0,0,0.10)'}`,
          background: active ? 'rgba(22, 101, 52, 0.10)' : 'rgba(15, 42, 28, 0.04)',
          color: 'inherit',
          boxShadow: active ? '0 1px 10px rgba(22, 101, 52, 0.08)' : 'none',
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
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Studio Live
          </span>
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.72 }}>
          Sterowanie relacją (start/gole/undo)
        </div>
      </a>
    </div>
  )
}

