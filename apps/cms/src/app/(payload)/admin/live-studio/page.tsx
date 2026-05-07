'use client'

import React from 'react'

import LiveStudioPage from '../../../../components/LiveStudioPage'
import PermissionGuard from '../../../../components/PermissionGuard'

export default function Page() {
  return (
    <PermissionGuard special="liveStudio">
      <LiveStudioPage />
    </PermissionGuard>
  )
}
