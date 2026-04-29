import React from 'react'

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/herb-wks.png"
        alt="WKS Wierzbice"
        style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 1.05,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f2a1c', letterSpacing: '-0.01em' }}>
          WKS Wierzbice
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          CMS
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          marginLeft: 4,
          display: 'flex',
          width: 28,
          height: 3,
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, background: '#166534' }} />
        <div style={{ flex: 1, background: '#e2e8f0' }} />
        <div style={{ flex: 1, background: '#dc2626' }} />
      </div>
    </div>
  )
}
