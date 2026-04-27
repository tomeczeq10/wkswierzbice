import type { Access, FieldAccess, PayloadRequest } from 'payload'

export type UserRole = 'admin' | 'redaktor' | 'trener'

export function getRole(req: PayloadRequest): UserRole | null {
  const r = (req.user as any)?.role
  if (r === 'admin' || r === 'redaktor' || r === 'trener') return r
  return null
}

export const isAdmin: Access = ({ req }) => getRole(req) === 'admin'

export const isEditorOrAdmin: Access = ({ req }) => {
  const r = getRole(req)
  return r === 'admin' || r === 'redaktor'
}

export const isTrainerOrAdmin: Access = ({ req }) => {
  const r = getRole(req)
  return r === 'admin' || r === 'trener'
}

export function canEditPlayerDoc({ req, doc }: { req: PayloadRequest; doc: any }): boolean {
  const r = getRole(req)
  if (r === 'admin') return true
  if (r !== 'trener') return false
  const userTeam = (req.user as any)?.team
  const docTeam = typeof doc?.team === 'number' ? doc.team : doc?.team?.id
  return Boolean(userTeam && docTeam && String(userTeam) === String(docTeam))
}

export const canUpdatePlayer: Access = (args: any) =>
  canEditPlayerDoc({ req: args.req, doc: args.doc })
export const canDeletePlayer: Access = (args: any) =>
  canEditPlayerDoc({ req: args.req, doc: args.doc })

export const canCreatePlayer: Access = ({ req }) => {
  const r = getRole(req)
  if (r === 'admin') return true
  if (r !== 'trener') return false
  return Boolean((req.user as any)?.team)
}

