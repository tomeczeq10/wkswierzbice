import type { CollectionResource } from './hasPermission'

/**
 * Helper dla `admin.hidden` w kolekcji — ukrywa pozycję w sidebarze
 * gdy zalogowany user nie ma uprawnienia READ na danej kolekcji.
 *
 * Wymaga, by Payload populował `user.role` jako obiekt (depth ≥ 1).
 * Jeśli role nie jest populated jako object, fail-closed (ukrywamy) —
 * lepiej niewidoczne niż pokazane bez prawa dostępu.
 */
// Implicite: liveStudio role widzi Mecze + Archiwum relacji w sidebarze
// (musi je móc otworzyć z poziomu Live Setup / Studio). Lustrzane do logiki
// w `hasPermission.ts` (LIVE_STUDIO_IMPLIES).
const SIDEBAR_LIVE_STUDIO_IMPLIES: ReadonlySet<CollectionResource> = new Set([
  'matches',
  'liveArchives',
])

export const hideUnless = (resource: CollectionResource) => {
  return ({ user }: { user: any }): boolean => {
    if (!user) return true
    const role = user.role
    if (!role || typeof role !== 'object' || !role.name) return true
    if (role.name === 'Administrator') return false
    if (role.permissions?.[resource]?.read) return false
    if (role.permissions?.special?.liveStudio && SIDEBAR_LIVE_STUDIO_IMPLIES.has(resource)) return false
    return true
  }
}

/**
 * Dla globalsów — analogiczny mechanizm.
 * Globalsy nie mają osobnego "read" — używamy 'update' jako proxy
 * (jak nie możesz edytować, to też nie potrzebujesz widzieć w nawigacji).
 */
export const hideGlobalUnless = (resource: 'siteConfig' | 'season') => {
  return ({ user }: { user: any }): boolean => {
    if (!user) return true
    const role = user.role
    if (!role || typeof role !== 'object' || !role.name) return true
    if (role.name === 'Administrator') return false
    return !role.permissions?.globals?.[`${resource}Update`]
  }
}
