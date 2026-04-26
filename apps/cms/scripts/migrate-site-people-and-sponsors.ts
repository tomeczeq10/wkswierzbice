/**
 * Etap 11: migracja BOARD/STAFF/SPONSORS z `apps/web/src/config/site.ts` → Payload.
 *
 * - Uploaduje zdjęcia (JPG/PNG/WebP/GIF/SVG) do `media` (idempotentnie po filename).
 * - Tworzy rekordy w `board`, `staff`, `sponsors` (idempotentnie po name+role / name+tier).
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/migrate-site-people-and-sponsors.ts --dry-run
 *   npx tsx apps/cms/scripts/migrate-site-people-and-sponsors.ts
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { config as dotenvConfig } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../.env') })

const { getPayload } = await import('payload')
const payloadConfig = (await import('../src/payload.config')).default

const WEB_ROOT = path.resolve(__dirname, '../../../apps/web')
const PUBLIC_DIR = path.resolve(WEB_ROOT, 'public')

const DRY_RUN = process.argv.includes('--dry-run')

type SiteStaff = { name: string; role: string; bio?: string; photo?: string }
type SiteBoard = { name: string; role: string; highlight?: boolean; bio?: string; photo?: string }
type SiteSponsor = {
  name: string
  logo: string
  url: string
  tier: 'strategiczny' | 'glowny' | 'wspierajacy'
}

function resolvePublicFile(p: string): string {
  const rel = p.startsWith('/') ? p.slice(1) : p
  return path.join(PUBLIC_DIR, rel)
}

function detectMime(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  return null
}

async function ensureMedia(payload: any, publicPath: string, alt: string | null): Promise<number | null> {
  if (!publicPath) return null
  const localFile = resolvePublicFile(publicPath)
  if (!fs.existsSync(localFile)) {
    console.warn(`  ⚠ missing file: ${publicPath} (${localFile})`)
    return null
  }
  const filename = path.basename(localFile)
  const mime = detectMime(localFile)
  if (!mime) {
    console.warn(`  ⚠ unsupported file: ${filename}`)
    return null
  }

  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })
  if (existing.docs.length > 0) return existing.docs[0].id as number

  if (DRY_RUN) {
    console.log(`  [dry] upload media: ${filename}`)
    return 0
  }

  const buf = fs.readFileSync(localFile)
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data: buf, mimetype: mime, name: filename, size: buf.length },
  })
  return created.id as number
}

async function main() {
  const payload = await getPayload({ config: payloadConfig })

  const siteModuleUrl = pathToFileURL(path.resolve(WEB_ROOT, 'src/config/site.ts')).toString()
  const site = (await import(siteModuleUrl)) as {
    STAFF: SiteStaff[]
    BOARD: SiteBoard[]
    SPONSORS: SiteSponsor[]
  }

  console.log(DRY_RUN ? '🧪 DRY RUN' : '🚀 Live')

  // ===== Staff =====
  console.log('=== staff ===')
  for (let i = 0; i < site.STAFF.length; i++) {
    const s = site.STAFF[i]
    const photoId = s.photo ? await ensureMedia(payload, s.photo, `${s.name} – ${s.role}`) : null
    const existing = await payload.find({
      collection: 'staff',
      where: { and: [{ name: { equals: s.name } }, { role: { equals: s.role } }] },
      limit: 1,
    })
    const data = {
      name: s.name,
      role: s.role,
      bio: s.bio ?? null,
      photo: photoId && photoId !== 0 ? photoId : null,
      type: 'trener_pierwszej_druzyny',
      order: i,
    }
    if (existing.docs.length > 0) {
      if (DRY_RUN) console.log(`  [dry] update: ${s.name}`)
      else await payload.update({ collection: 'staff', id: existing.docs[0].id, data })
    } else {
      if (DRY_RUN) console.log(`  [dry] create: ${s.name}`)
      else await payload.create({ collection: 'staff', data })
    }
  }

  // ===== Board =====
  console.log('=== board ===')
  for (let i = 0; i < site.BOARD.length; i++) {
    const b = site.BOARD[i]
    const photoId = b.photo ? await ensureMedia(payload, b.photo, `${b.name} – ${b.role}`) : null
    const existing = await payload.find({
      collection: 'board',
      where: { and: [{ name: { equals: b.name } }, { role: { equals: b.role } }] },
      limit: 1,
    })
    const data = {
      name: b.name,
      role: b.role,
      highlight: b.highlight ?? false,
      bio: b.bio ?? null,
      photo: photoId && photoId !== 0 ? photoId : null,
      order: i,
    }
    if (existing.docs.length > 0) {
      if (DRY_RUN) console.log(`  [dry] update: ${b.name}`)
      else await payload.update({ collection: 'board', id: existing.docs[0].id, data })
    } else {
      if (DRY_RUN) console.log(`  [dry] create: ${b.name}`)
      else await payload.create({ collection: 'board', data })
    }
  }

  // ===== Sponsors =====
  console.log('=== sponsors ===')
  for (let i = 0; i < site.SPONSORS.length; i++) {
    const s = site.SPONSORS[i]
    const logoId = await ensureMedia(payload, s.logo, s.name)
    const existing = await payload.find({
      collection: 'sponsors',
      where: { and: [{ name: { equals: s.name } }, { tier: { equals: s.tier } }] },
      limit: 1,
    })
    const data = {
      name: s.name,
      tier: s.tier,
      website: s.url,
      logo: logoId && logoId !== 0 ? logoId : null,
      order: i,
    }
    if (existing.docs.length > 0) {
      if (DRY_RUN) console.log(`  [dry] update: ${s.name}`)
      else await payload.update({ collection: 'sponsors', id: existing.docs[0].id, data })
    } else {
      if (DRY_RUN) console.log(`  [dry] create: ${s.name}`)
      else await payload.create({ collection: 'sponsors', data })
    }
  }

  console.log('✅ done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

