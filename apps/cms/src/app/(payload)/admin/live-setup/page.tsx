'use client'

import React from 'react'

import LiveSetupPage from '../../../../components/LiveSetupPage'
import PermissionGuard from '../../../../components/PermissionGuard'

export default function Page() {
  return (
    <PermissionGuard special="liveStudio">
      <LiveSetupPage />
    </PermissionGuard>
  )
}
