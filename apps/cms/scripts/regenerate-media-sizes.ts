/**
 * One-shot backfill: dla każdego rekordu w kolekcji `media` regeneruje warianty
 * (`thumbnail`, `card`, `hero`, `large`) na podstawie zachowanego oryginału na dysku.
 *
 * Po co: po dodaniu nowego image size (np. `large` 1920 px dla lightboxa galerii)
 * istniejące pliki nie mają tej wersji — Payload generuje sizes tylko przy uploadzie.
 * Ten skrypt symuluje re-upload przez `payload.update({ file: ... })`, co usuwa
 * stare warianty i tworzy je od nowa wg aktualnego configu kolekcji `media`.
 *
 * Idempotent: można puścić wielokrotnie. Domyślnie pomija rekordy, które już mają
 * wymagany rozmiar (`--size large`). Z `--force` regeneruje wszystkie.
 *
 * Użycie:
 *   npx tsx apps/cms/scripts/regenerate-media-sizes.ts --dry-run
 *   npx tsx apps/cms/scripts/regenerate-media-sizes.ts --size large
 *   npx tsx apps/cms/scripts/regenerate-media-sizes.ts --force
 *
 * Uwaga: SVG są pomijane (Sharp ich nie resize'uje w naszym pipeline).
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../.env') })

const { getPayload } = await import('payload')
const payloadConfig = (await import('../src/payload.config')).default

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const sizeArgIdx = args.findIndex((a) => a === '--size')
const REQUIRED_SIZE = sizeArgIdx >= 0 ? args[sizeArgIdx + 1] : 'large'

const MEDIA_DIR = path.resolve(__dirname, '../media')

type MediaDoc = {
  id: number
  filename?: string | null
  mimeType?: string | null
  sizes?: Record<string, { url?: string | null; filename?: string | null } | undefined> | null
}

const payload = await getPayload({ config: payloadConfig })

const all = await payload.find({
  collection: 'media',
  limit: 10_000,
  pagination: false,
  depth: 0,
})

const docs = all.docs as MediaDoc[]
console.log(`📚 Total media docs: ${docs.length}`)
console.log(`🔧 Required size: "${REQUIRED_SIZE}"  |  force=${FORCE}  dry-run=${DRY_RUN}`)
console.log('')

let regenerated = 0
let skippedHasSize = 0
let skippedNoFile = 0
let skippedSvg = 0
let failed = 0

for (const doc of docs) {
  const id = doc.id
  const filename = doc.filename ?? ''
  const mimeType = doc.mimeType ?? ''

  if (!filename) {
    console.warn(`⚠️  id=${id}: brak filename — pomijam`)
    failed++
    continue
  }

  if (mimeType === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg')) {
    skippedSvg++
    continue
  }

  const hasRequired = !FORCE && !!doc.sizes?.[REQUIRED_SIZE]?.filename
  if (hasRequired) {
    skippedHasSize++
    continue
  }

  const sourcePath = path.join(MEDIA_DIR, filename)
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  id=${id}: brak pliku na dysku (${sourcePath}) — pomijam`)
    skippedNoFile++
    continue
  }

  if (DRY_RUN) {
    console.log(`🔁 [dry-run] id=${id} filename=${filename} → regeneracja`)
    regenerated++
    continue
  }

  try {
    const buf = fs.readFileSync(sourcePath)
    await payload.update({
      collection: 'media',
      id,
      data: {},
      file: {
        data: buf,
        mimetype: mimeType || 'application/octet-stream',
        name: filename,
        size: buf.length,
      },
      overrideAccess: true,
    })
    regenerated++
    if (regenerated % 10 === 0) console.log(`  …${regenerated} przeprocesowanych`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`❌ id=${id} filename=${filename}: ${msg}`)
    failed++
  }
}

console.log('')
console.log('✅ Done.')
console.log(`   regenerated:        ${regenerated}`)
console.log(`   skipped (has size): ${skippedHasSize}`)
console.log(`   skipped (no file):  ${skippedNoFile}`)
console.log(`   skipped (svg):      ${skippedSvg}`)
console.log(`   failed:             ${failed}`)

process.exit(failed > 0 ? 1 : 0)
