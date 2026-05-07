'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

type SpecialAccess = 'liveStudio' | 'galleryManager' | 'syncSeason'

/**
 * Guard dla custom views (Live Studio, Menedżer galerii itp.).
 *
 * - Renderuje dzieci tylko gdy zalogowany user ma odpowiednie permission
 *   (specjalne dostępy w roli) lub jest Administratorem.
 * - Brak permission → redirect na `/admin` (dashboard) z przyjaznym
 *   komunikatem flash (na razie po prostu redirect, można dorzucić toast).
 * - Pre-auth (user === undefined): renderuje placeholder, czeka aż auth
 *   provider załaduje.
 */
export default function PermissionGuard({
  special,
  children,
}: {
  special: SpecialAccess
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const router = useRouter()

  const role: any = (user as any)?.role
  const isAdmin = role && typeof role === 'object' && role.name === 'Administrator'
  const hasSpecial = role && typeof role === 'object' && role.permissions?.special?.[special] === true
  const allowed = isAdmin || hasSpecial

  useEffect(() => {
    // user undefined = jeszcze ładuje. user null = niezalogowany (Payload przekieruje sam).
    // Dopiero gdy mamy user ale brak permissions — redirect.
    if (user && !allowed) {
      router.push('/admin')
    }
  }, [user, allowed, router])

  if (user === undefined) {
    return null // ładowanie — Payload renderuje swój loader nadrzędnie
  }
  if (!allowed) {
    return (
      <div style={{ padding: 32, color: '#475569', fontSize: 14, fontFamily: 'inherit' }}>
        Brak uprawnień. Przekierowuję…
      </div>
    )
  }
  return <>{children}</>
}

/**
 * Helper hook — zwraca true jeśli user ma dostęp do `special`.
 * Używany przez nav-linki (GalleryManagerNavLink, LiveStudioNavLink) żeby
 * UKRYĆ link zamiast renderować pusty.
 */
export function useHasSpecialAccess(special: SpecialAccess): boolean {
  const { user } = useAuth()
  const role: any = (user as any)?.role
  if (!role || typeof role !== 'object') return false
  if (role.name === 'Administrator') return true
  return role.permissions?.special?.[special] === true
}
