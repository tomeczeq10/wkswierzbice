import type { Access, PayloadRequest } from 'payload'
import { getRoleObject } from '../access'

/**
 * Centralna funkcja sprawdzania uprawnień.
 *
 * Schemat uprawnień (kolekcja `roles`, pole `permissions`):
 *   {
 *     news:         { read, create, update, delete },
 *     tags:         { read, create, update, delete },
 *     ...12 kolekcji łącznie,
 *     globals:      { siteConfigUpdate, seasonUpdate },
 *     special:      { liveStudio, galleryManager, syncSeason }
 *   }
 *
 * Rola "Administrator" (isSystem=true) ma bypass — zawsze true.
 */

// ── Typy ────────────────────────────────────────────────────────────────────

export type CollectionResource =
  | 'news'
  | 'tags'
  | 'players'
  | 'teams'
  | 'staff'
  | 'board'
  | 'matches'
  | 'liveArchives'
  | 'media'
  | 'heroSlides'
  | 'sponsors'
  | 'staticPages'

export type CollectionAction = 'read' | 'create' | 'update' | 'delete'

export type GlobalResource = 'siteConfig' | 'season'

export type SpecialAccess = 'liveStudio' | 'galleryManager' | 'syncSeason'

// ── Główny helper ───────────────────────────────────────────────────────────

export async function hasPermission(
  req: PayloadRequest,
  resource: CollectionResource,
  action: CollectionAction,
): Promise<boolean>
export async function hasPermission(
  req: PayloadRequest,
  resource: GlobalResource,
  action: 'update',
): Promise<boolean>
export async function hasPermission(
  req: PayloadRequest,
  resource: SpecialAccess,
): Promise<boolean>
export async function hasPermission(
  req: PayloadRequest,
  resource: string,
  action?: string,
): Promise<boolean> {
  const role = await getRoleObject(req)
  if (!role) return false
  if (role.name === 'Administrator') return true

  const p: any = (role as any).permissions
  if (!p) return false

  // Specjalny dostęp (Live Studio, Menedżer galerii, Sync 90minut)
  if (!action) {
    return Boolean(p.special?.[resource])
  }

  // Globalsy
  if (resource === 'siteConfig' || resource === 'season') {
    if (action === 'update') return Boolean(p.globals?.[`${resource}Update`])
    return false
  }

  // Kolekcje (CRUD)
  return Boolean(p[resource]?.[action])
}

// ── Skróty: gotowe Access functions ─────────────────────────────────────────

/** Skrót: `can('news', 'read')` zwraca Access function gotową do podstawienia. */
export const can = (resource: CollectionResource, action: CollectionAction): Access => {
  return async ({ req }) => hasPermission(req, resource, action)
}

/** Skrót dla globala: `canGlobal('siteConfig', 'update')`. */
export const canGlobal = (resource: GlobalResource, action: 'update'): Access => {
  return async ({ req }) => hasPermission(req, resource, action)
}

/** Sprawdzenie do user-side guards (np. nav-link visibility, custom views). */
export async function userHasSpecial(req: PayloadRequest, special: SpecialAccess): Promise<boolean> {
  return hasPermission(req, special)
}
