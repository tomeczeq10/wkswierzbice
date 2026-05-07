import type { Access, PayloadRequest } from 'payload'

/**
 * Po refaktorze RBAC (2026-05-06) `req.user.role` to relacja do kolekcji
 * `roles` — id (number) gdy depth=0, lub pełny obiekt {id, name, permissions}
 * gdy depth ≥ 1. Helpery poniżej obsługują OBA przypadki.
 *
 * W tym commicie (commit 1 RBAC) WSZYSCY istniejący userzy mają rolę
 * "Administrator" (po migracji), więc `isAdmin` / `isEditorOrAdmin` itd.
 * zwracają true dla każdej operacji — funkcjonalność identyczna jak przed.
 *
 * W commicie 2 te helpery zostaną zastąpione przez `hasPermission()`,
 * który czyta konkretne permissions z `role.permissions` zamiast sprawdzać
 * po nazwie roli.
 */

type RoleDoc = { id: number; name: string; permissions?: any; isSystem?: boolean }

/** Zwraca pełen obiekt roli zalogowanego użytkownika lub null. */
export async function getRoleObject(req: PayloadRequest): Promise<RoleDoc | null> {
  const r = (req.user as any)?.role
  if (!r) return null
  if (typeof r === 'object' && r.name) return r as RoleDoc
  if (typeof r === 'number' || typeof r === 'string') {
    try {
      return (await req.payload.findByID({ collection: 'roles', id: r as any, depth: 0 })) as unknown as RoleDoc
    } catch {
      return null
    }
  }
  return null
}

/** Sync-friendly: tylko nazwa roli, zakładając że Payload populated relację. */
function getRoleNameSync(req: PayloadRequest): string | null {
  const r = (req.user as any)?.role
  if (r && typeof r === 'object' && r.name) return r.name
  return null
}

export const isAdmin: Access = async ({ req }) => {
  const sync = getRoleNameSync(req)
  if (sync) return sync === 'Administrator'
  const role = await getRoleObject(req)
  return role?.name === 'Administrator'
}

export const isEditorOrAdmin: Access = async (args) => {
  // W commicie 1: każdy z rolą = Administrator (po migracji wszyscy są).
  // W commicie 2 ten helper zostanie wymieniony na hasPermission(...).
  return isAdmin(args)
}

export const isTrainerOrAdmin: Access = async (args) => {
  return isAdmin(args)
}

// ── Player edit access (legacy: trener mógł edytować zawodników ze swojej drużyny) ─
// Po refaktorze RBAC scope per-team przeniesiemy do dedykowanego pola w Roles
// jeśli będzie potrzebne. Na razie tylko Administrator.

export function canEditPlayerDoc({ req }: { req: PayloadRequest; doc: any }): boolean {
  return getRoleNameSync(req) === 'Administrator'
}

export const canUpdatePlayer: Access = async ({ req }) => isAdmin({ req } as any)
export const canDeletePlayer: Access = async ({ req }) => isAdmin({ req } as any)
export const canCreatePlayer: Access = async ({ req }) => isAdmin({ req } as any)

// Legacy export — niektóre kolekcje go importują (Matches, LiveArchives).
export type UserRole = 'admin' | 'redaktor' | 'trener'

export function getRole(req: PayloadRequest): UserRole | null {
  const name = getRoleNameSync(req)
  if (name === 'Administrator') return 'admin'
  // Po commicie 2 legacy stringi znikną — ten getter służy tylko do utrzymania
  // kompatybilności starych access functions w tej fazie przejściowej.
  return null
}
