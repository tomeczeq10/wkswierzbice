import React from 'react'

export default function Icon() {
  // Payload używa tego w "home" ikonie w górnym headerze + w kilku miejscach UI.
  // Trzymamy mały, czytelny znak klubu.
  return (
    <img
      src="/herb-wks.png"
      alt="WKS Wierzbice"
      style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }}
    />
  )
}

