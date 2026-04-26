/**
 * Etap 8 (część): zdjęcia drużyn z frontmatter `photo:` w `content/teams/*.md`
 * → upload do Media (JPEG/PNG/WebP/GIF) + ustawienie `Teams.photo`.
 *
 * Placeholdery **SVG** są pomijane (Sharp / `imageSizes` w Media nie są dla
 * SVG stabilne) — na froncie nadal działają ścieżki z `.md` dzięki
 * `cms-teams.ts` (enrichment).
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/migrate-team-photos.ts --dry-run
 *   npx tsx apps/cms/scripts/migrate-team-photos.ts
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { config as dotenvConfig } from 'dotenv'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../.env') })

const { getPayload } = await import('payload')
const payloadConfig = (await import('../src/payload.config')).default

const TEAMS_DIR = path.resolve(__dirname, '../../../apps/web/src/content/teams')
const PUBLIC_DIR = path.resolve(__dirname, '../../../apps/web/public')
const DRY_RUN = process.argv.includes('--dry-run')

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function resolvePublicFile(photoPath: string): string {
  const rel = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath
  return path.join(PUBLIC_DIR, rel)
}

function detectMime(file: string): string | null {
  const ext = path.extname(file).toLowerCase()
  return MIME_BY_EXT[ext] ?? null
}

type Frontmatter = {
  name: string
  photo?: string
}

async function main() {
  const files = fs
    .readdirSync(TEAMS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()

  console.log(`📂 ${files.length} plików teams w ${TEAMS_DIR}`)
  console.log(DRY_RUN ? '🧪 DRY RUN' : '🚀 Live')
  console.log('')

  const payload = await getPayload({ config: payloadConfig })
  let uploaded = 0
  let skipped = 0
  let linked = 0
  let errors = 0

  for (const filename of files) {
    const slug = filename.replace(/\.md$/, '')
    const raw = fs.readFileSync(path.join(TEAMS_DIR, filename), 'utf8')
    const fm = matter(raw).data as Frontmatter
    const photoPath = fm.photo
    if (!photoPath || typeof photoPath !== 'string') {
      console.log(`  ⏭  ${slug} — brak photo w YAML`)
      skipped++
      continue
    }

    const localFile = resolvePublicFile(photoPath)
    if (!fs.existsSync(localFile)) {
      console.warn(`  ⚠  ${slug} — brak pliku: ${localFile}`)
      errors++
      continue
    }

    const mime = detectMime(localFile)
    if (!mime) {
      console.log(`  ⏭  ${slug} — pomijam (nie-raster: ${path.basename(localFile)})`)
      skipped++
      continue
    }

    const basename = path.basename(localFile)
    const existingMedia = await payload.find({
      collection: 'media',
      where: { filename: { equals: basename } },
      limit: 1,
    })

    let mediaId: number | undefined
    if (existingMedia.docs.length > 0) {
      mediaId = existingMedia.docs[0].id as number
      console.log(`  ⏭  ${basename} → Media już jest (id=${mediaId})`)
    } else if (DRY_RUN) {
      console.log(`  [dry] upload ${basename} dla team ${slug}`)
      mediaId = 0
      uploaded++
    } else {
      const buf = fs.readFileSync(localFile)
      const created = await payload.create({
        collection: 'media',
        data: { alt: `Drużyna: ${fm.name}` },
        file: { data: buf, mimetype: mime, name: basename, size: buf.length },
      })
      mediaId = created.id as number
      console.log(`  ✓ upload ${basename} → id=${mediaId}`)
      uploaded++
    }

    if (mediaId === undefined || (DRY_RUN && mediaId === 0)) {
      if (DRY_RUN) {
        console.log(`  [dry] ${slug} → set Teams.photo = (nowe media)`)
        linked++
      }
      continue
    }

    const team = await payload.find({
      collection: 'teams',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    if (team.docs.length === 0) {
      console.warn(`  ⚠  ${slug} — brak rekordu Teams (uruchom migrate-teams.ts)`)
      errors++
      continue
    }

    const tid = team.docs[0].id as number
    const current = team.docs[0].photo
    const currentId =
      typeof current === 'number' ? current : typeof current === 'object' && current ? (current as { id?: number }).id : null

    if (currentId === mediaId) {
      console.log(`  ⏭  ${slug} — Teams.photo już = ${mediaId}`)
      skipped++
      continue
    }

    if (DRY_RUN) {
      linked++
      continue
    }

    await payload.update({
      collection: 'teams',
      id: tid,
      data: { photo: mediaId },
    })
    console.log(`  🔗 ${slug} → Teams.photo = ${mediaId}`)
    linked++
  }

  console.log('')
  console.log(`📊 uploaded: ${uploaded}, linked: ${linked}, skipped: ${skipped}, errors: ${errors}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
