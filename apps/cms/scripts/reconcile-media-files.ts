/**
 * Dev / po resecie SQLite: Payload dopisuje sufiksy `-1`, `-2`, `-3` do `filename`,
 * gdy w `apps/cms/media/` już leżą pliki z poprzedniej migracji, a tabela `media`
 * jest pusta. Wtedy rekordy wskazują na `foo-3.jpeg`, a na dysku jest `foo.jpeg`.
 *
 * Ten skrypt: dla każdego rekordu `media`, jeśli brakuje pliku docelowego, kopiuje
 * z (1) tej samej nazwy bez sufiksu Payload w `media/`, albo (2) z `apps/web/public/`
 * (news, team/trenerzy, team/zarzad, gallery, sponsors, hero, root).
 *
 *   npx tsx apps/cms/scripts/reconcile-media-files.ts --dry-run
 *   npx tsx apps/cms/scripts/reconcile-media-files.ts
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

const MEDIA_DIR = path.resolve(__dirname, '../media')
// Historycznie, gdy Next/Payload był uruchamiany z root monorepo, pliki mogły trafić do `wks_cms/media/`.
// Po ustabilizowaniu `staticDir` w kolekcji `media` trzymamy kanonicznie w `apps/cms/media/`,
// ale przy dev-restartach i migracjach warto umieć „zassać” brakujące pliki z root.
const ROOT_MEDIA_DIR = path.resolve(__dirname, '../../../media')
const PUBLIC_DIR = path.resolve(__dirname, '../../../apps/web/public')
const DRY_RUN = process.argv.includes('--dry-run')

/** np. `herb-wks-3.png` → `herb-wks.png`; `x-3-1200x630.webp` → `x-1200x630.webp` */
function stripPayloadDuplicateSuffix(filename: string): string | null {
  const sized = filename.match(/^(.+)-(\d+)-(\d+x\d+)\.webp$/i)
  if (sized) return `${sized[1]}-${sized[3]}.webp`
  const plain = filename.match(/^(.+)-(\d+)\.([^.]+)$/i)
  if (plain) return `${plain[1]}.${plain[3]}`
  return null
}

function existsInMedia(name: string): string | null {
  const p = path.join(MEDIA_DIR, name)
  return fs.existsSync(p) ? p : null
}

function existsInRootMedia(name: string): string | null {
  const p = path.join(ROOT_MEDIA_DIR, name)
  return fs.existsSync(p) ? p : null
}

function findInPublic(basename: string): string | null {
  const relTries = [
    path.join('news', basename),
    path.join('team', 'trenerzy', basename),
    path.join('team', 'zarzad', basename),
    path.join('gallery', basename),
    path.join('sponsors', basename),
    path.join('hero', basename),
    basename,
  ]
  for (const rel of relTries) {
    const p = path.join(PUBLIC_DIR, rel)
    if (fs.existsSync(p)) return p
  }
  return null
}

/** placeholder-9.svg … brak w repo — użyj ostatniego z galerii */
function placeholderGalleryFallback(filename: string): string | null {
  const m = filename.match(/^placeholder-(\d+)\.svg$/i)
  if (!m) return null
  const n = Number(m[1])
  if (n >= 1 && n <= 8) return path.join(PUBLIC_DIR, 'gallery', filename)
  const last = path.join(PUBLIC_DIR, 'gallery', 'placeholder-8.svg')
  return fs.existsSync(last) ? last : null
}

function resolveSource(targetFilename: string): string | null {
  let cur = targetFilename
  const seen = new Set<string>()
  while (true) {
    const inMedia = existsInMedia(cur)
    if (inMedia) return inMedia
    const inRoot = existsInRootMedia(cur)
    if (inRoot) return inRoot
    const next = stripPayloadDuplicateSuffix(cur)
    if (!next || next === cur || seen.has(next)) break
    seen.add(cur)
    cur = next
  }
  const strippedOnce = stripPayloadDuplicateSuffix(targetFilename)
  if (strippedOnce) {
    const pub = findInPublic(path.basename(strippedOnce))
    if (pub) return pub
  }
  const pubDirect = findInPublic(targetFilename)
  if (pubDirect) return pubDirect

  if (targetFilename.toLowerCase().endsWith('.svg')) {
    const ph = placeholderGalleryFallback(targetFilename)
    if (ph) return ph
  }
  return null
}

/**
 * Przy znanym kanonicznym pliku `undup` (np. `foo.jpeg`) wyciąga stem + numer z `foo-3.jpeg`.
 * Dla `placeholder-7.svg` / `undup=placeholder.svg` zwróci null jeśli ścieżki się nie zgadzają.
 */
function parseDupStemVersusUndup(filename: string, undup: string): { stem: string; dup: string } | null {
  const extFn = path.extname(filename)
  const extU = path.extname(undup)
  if (extFn.toLowerCase() !== extU.toLowerCase()) return null
  const stemUndup = path.basename(undup, extU)
  const stemFn = path.basename(filename, extFn)
  const prefix = `${stemUndup}-`
  if (!stemFn.startsWith(prefix)) return null
  const dup = stemFn.slice(prefix.length)
  if (!/^\d+$/.test(dup)) return null
  return { stem: stemUndup, dup }
}

/** Dla rekordu `foo-3.jpg` skopiuj `foo-1200x630.webp` → `foo-3-1200x630.webp` jeśli brak. */
function reconcileSizedWebpsForStem(stem: string, dup: string): number {
  let fixed = 0
  const dimRe = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+x\\d+)\\.webp$`, 'i')
  const scanDirs = [MEDIA_DIR, ROOT_MEDIA_DIR]
  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      const dm = name.match(dimRe)
      if (!dm) continue
      const dupName = `${stem}-${dup}-${dm[1]}.webp`
      const dest = path.join(MEDIA_DIR, dupName)
      const src = path.join(dir, name)
      if (fs.existsSync(dest) || !fs.existsSync(src)) continue
      if (DRY_RUN) {
        console.log(`  [dry] webp: ${path.relative(process.cwd(), src)} → ${dupName}`)
      } else {
        fs.copyFileSync(src, dest)
        console.log(`  ✓ webp: ${dupName} ← ${path.relative(process.cwd(), src)}`)
      }
      fixed++
    }
  }
  return fixed
}

async function main() {
  const payload = await getPayload({ config: payloadConfig })
  const res = await payload.find({ collection: 'media', limit: 2000, depth: 0 })
  let ok = 0
  let fixed = 0
  let missing = 0

  for (const doc of res.docs) {
    const fn = doc.filename as string
    const dest = path.join(MEDIA_DIR, fn)
    if (fs.existsSync(dest)) {
      ok++
    } else {
      const src = resolveSource(fn)
      if (!src) {
        console.warn(`  ⚠ brak źródła dla: ${fn}`)
        missing++
      } else if (DRY_RUN) {
        console.log(`  [dry] skopiowałbym: ${src} → ${dest}`)
        fixed++
      } else {
        fs.copyFileSync(src, dest)
        console.log(`  ✓ ${fn} ← ${path.relative(process.cwd(), src)}`)
        fixed++
      }
    }

    // === sizes (thumbnail/card/hero) ===
    const sizes = (doc as any).sizes as Record<string, any> | undefined
    if (!sizes || typeof sizes !== 'object') continue
    for (const key of Object.keys(sizes)) {
      const sized = sizes[key]
      const sFn = sized?.filename as string | undefined
      if (!sFn) continue
      const sDest = path.join(MEDIA_DIR, sFn)
      if (fs.existsSync(sDest)) continue
      const sSrc = resolveSource(sFn)
      if (!sSrc) {
        console.warn(`  ⚠ brak źródła dla size: ${sFn} (${fn} / ${key})`)
        missing++
        continue
      }
      if (DRY_RUN) {
        console.log(`  [dry] size: ${sSrc} → ${sDest}`)
        fixed++
        continue
      }
      fs.copyFileSync(sSrc, sDest)
      console.log(`  ✓ size: ${sFn} ← ${path.relative(process.cwd(), sSrc)}`)
      fixed++
    }
  }

  console.log('')
  console.log('=== Warianty WebP (sizes) ===')
  let wFixed = 0
  for (const doc of res.docs) {
    const fn = doc.filename as string
    const undup = stripPayloadDuplicateSuffix(fn)
    if (!undup) continue
    const undupPath = path.join(MEDIA_DIR, undup)
    if (!fs.existsSync(undupPath)) continue
    const parsed = parseDupStemVersusUndup(fn, undup)
    if (!parsed) continue
    wFixed += reconcileSizedWebpsForStem(parsed.stem, parsed.dup)
  }

  console.log('')
  console.log(
    DRY_RUN
      ? `[dry-run] media (oryginały): ok=${ok}, do skopiowania=${fixed}, brak źródła=${missing}; webp sizes: +${wFixed}`
      : `Gotowe. Oryginały: ok=${ok}, skopiowane=${fixed}, brak źródła=${missing}; webp sizes: +${wFixed}`,
  )
  process.exit(missing > 0 && fixed === 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
