import type { CollectionResource } from './hasPermission'

/**
 * Helper dla `admin.hidden` w kolekcji — ukrywa pozycję w sidebarze
 * gdy zalogowany user nie ma uprawnienia READ na danej kolekcji.
 *
 * Wymaga, by Payload populował `user.role` jako obiekt (depth ≥ 1).
 * Jeśli role nie jest populated jako object, fail-closed (ukrywamy) —
 * lepiej niewidoczne niż pokazane bez prawa dostępu.
 */
export const hideUnless = (resource: CollectionResource) => {
  return ({ user }: { user: any }): boolean => {
    if (!user) return true
    const role = user.role
    if (!role || typeof role !== 'object' || !role.name) return true
    if (role.name === 'Administrator') return false
    return !role.permissions?.[resource]?.read
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
