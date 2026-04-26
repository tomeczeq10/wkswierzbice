/**
 * Etap 6b: migracja istniejących plików cover (z `apps/web/public/`) do
 * kolekcji Media w Payload + linkowanie do odpowiednich newsów.
 *
 * Algorytm:
 *   1. Czyta wszystkie `apps/web/src/content/news/*.md` z `gray-matter`.
 *   2. Wyciąga (slug, coverPath) — coverPath = ścieżka stringowa z YAML
 *      (np. `/news/orzel-na-horyzoncie.jpg` lub `/herb-wks.png`).
 *   3. Dla każdej UNIKALNEJ coverPath uploaduje plik z `apps/web/public/...`
 *      do Media — idempotentnie po `filename` (basename ścieżki).
 *      Zwraca mapę `coverPath → mediaId`.
 *   4. Dla każdego newsa: znajduje record w Payloadzie po `slug`, ustawia
 *      `cover = mediaId`. Pomija jeśli już wskazuje na właściwe Media.
 *
 * Idempotentny — re-run zero side effects.
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/migrate-news-covers.ts --dry-run
 *   npx tsx apps/cms/scripts/migrate-news-covers.ts
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

const NEWS_DIR = path.resolve(__dirname, '../../../apps/web/src/content/news')
const PUBLIC_DIR = path.resolve(__dirname, '../../../apps/web/public')
const DRY_RUN = process.argv.includes('--dry-run')

type ParsedNews = {
  slug: string
  coverPath: string | null
  /** alt z YAML (`coverAlt`), trafia do `News.coverAlt`, NIE do `Media.alt` */
  coverAlt: string | null
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function loadNewsFiles(): ParsedNews[] {
  const files = fs
    .readdirSync(NEWS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(NEWS_DIR, f))

  const result: ParsedNews[] = []
  for (const filePath of files) {
    const slug = path.basename(filePath, '.md')
    const raw = fs.readFileSync(filePath, 'utf8')
    const { data: fm } = matter(raw)
    result.push({
      slug,
      coverPath: typeof fm.cover === 'string' && fm.cover.length > 0 ? fm.cover : null,
      coverAlt: typeof fm.coverAlt === 'string' && fm.coverAlt.length > 0 ? fm.coverAlt : null,
    })
  }
  return result.sort((a, b) => a.slug.localeCompare(b.slug))
}

function resolvePublicFile(coverPath: string): string {
  // YAML cover format: leading slash → ścieżka względem `apps/web/public/`
  const rel = coverPath.startsWith('/') ? coverPath.slice(1) : coverPath
  return path.join(PUBLIC_DIR, rel)
}

function detectMime(file: string): string | null {
  const ext = path.extname(file).toLowerCase()
  return MIME_BY_EXT[ext] ?? null
}

async function main() {
  const news = loadNewsFiles()
  console.log(`📂 Znaleziono ${news.length} newsów w ${NEWS_DIR}`)

  const newsWithCover = news.filter((n) => n.coverPath !== null)
  const newsWithoutCover = news.filter((n) => n.coverPath === null)
  console.log(`   z coverem: ${newsWithCover.length}, bez: ${newsWithoutCover.length}`)
  if (newsWithoutCover.length > 0) {
    console.log(`   bez cover (skip): ${newsWithoutCover.map((n) => n.slug).join(', ')}`)
  }

  // Unikalne coverPath → ile newsów ich używa.
  const usageByCoverPath = new Map<string, string[]>()
  for (const n of newsWithCover) {
    const arr = usageByCoverPath.get(n.coverPath!) ?? []
    arr.push(n.slug)
    usageByCoverPath.set(n.coverPath!, arr)
  }
  console.log(`   unikalnych ścieżek cover: ${usageByCoverPath.size}`)
  for (const [cp, slugs] of usageByCoverPath) {
    console.log(`     ${cp}  →  ${slugs.length} news${slugs.length > 1 ? 'y' : ''}`)
  }

  console.log('')
  console.log(DRY_RUN ? '🧪 DRY RUN — zero side effects.' : '🚀 Live mode.')
  console.log('')

  const payload = await getPayload({ config: payloadConfig })

  // ====== KROK 1: upload plików do Media ======
  console.log('=== Krok 1: Media uploads ===')
  const mediaIdByCoverPath = new Map<string, number>()
  let mediaCreated = 0
  let mediaSkipped = 0
  let mediaErrors = 0
  const missingFiles: string[] = []

  for (const [coverPath] of usageByCoverPath) {
    const localFile = resolvePublicFile(coverPath)
    if (!fs.existsSync(localFile)) {
      console.warn(`  ⚠  ${coverPath} — plik nie istnieje na dysku (${localFile}), pomijam`)
      missingFiles.push(coverPath)
      continue
    }
    const filename = path.basename(localFile)
    const mime = detectMime(localFile)
    if (!mime) {
      console.warn(`  ⚠  ${filename} — nieobsługiwane rozszerzenie, pomijam`)
      mediaErrors++
      continue
    }

    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const id = existing.docs[0].id as number
      mediaIdByCoverPath.set(coverPath, id)
      console.log(`  ⏭  ${filename} → istnieje (id=${id}), używam`)
      mediaSkipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  [dry] uploadowałbym ${filename} (${(fs.statSync(localFile).size / 1024).toFixed(1)} KB, ${mime})`)
      mediaCreated++
      // W dry-run używamy fake id 0; w żadnym update nic z tego i tak nie pójdzie.
      mediaIdByCoverPath.set(coverPath, 0)
      continue
    }

    try {
      const buf = fs.readFileSync(localFile)
      const created = await payload.create({
        collection: 'media',
        // Media.alt zostawiamy puste — alt per-context jest w News.coverAlt.
        data: { alt: null },
        file: {
          data: buf,
          mimetype: mime,
          name: filename,
          size: buf.length,
        },
      })
      const id = created.id as number
      mediaIdByCoverPath.set(coverPath, id)
      const sizes = Object.keys((created as { sizes?: object }).sizes ?? {}).join(', ')
      console.log(`  ✓ ${filename} → uploaded (id=${id}), warianty: ${sizes}`)
      mediaCreated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${filename} — błąd: ${msg}`)
      mediaErrors++
    }
  }

  console.log('')
  console.log(
    `📊 Media: utworzonych: ${mediaCreated}, pominiętych (już są): ${mediaSkipped}, błędów: ${mediaErrors}, brak pliku: ${missingFiles.length}`,
  )
  console.log('')

  // ====== KROK 2: linkowanie news.cover ======
  console.log('=== Krok 2: News.cover linking ===')
  let newsUpdated = 0
  let newsSkipped = 0
  let newsErrors = 0
  let newsMissing = 0

  for (const n of newsWithCover) {
    const mediaId = mediaIdByCoverPath.get(n.coverPath!)
    if (mediaId === undefined) {
      console.warn(`  ⚠  ${n.slug} — brak Media id (cover=${n.coverPath} nie został uploadowany)`)
      newsErrors++
      continue
    }

    const found = await payload.find({
      collection: 'news',
      where: { slug: { equals: n.slug } },
      limit: 1,
    })

    if (found.docs.length === 0) {
      console.warn(`  ⚠  ${n.slug} — brak rekordu w Payload (uruchom najpierw migrate-news.ts)`)
      newsMissing++
      continue
    }

    const news = found.docs[0]
    const currentCoverId =
      typeof news.cover === 'number'
        ? news.cover
        : typeof news.cover === 'object' && news.cover !== null
          ? (news.cover as { id?: number }).id
          : null

    if (currentCoverId === mediaId) {
      console.log(`  ⏭  ${n.slug} — cover już = ${mediaId}, pomijam`)
      newsSkipped++
      continue
    }

    if (DRY_RUN) {
      console.log(
        `  [dry] ${n.slug} — set cover = ${mediaId} (było: ${currentCoverId ?? 'null'})`,
      )
      newsUpdated++
      continue
    }

    try {
      await payload.update({
        collection: 'news',
        id: news.id,
        data: { cover: mediaId },
      })
      console.log(`  🔗 ${n.slug} → cover=${mediaId} (było: ${currentCoverId ?? 'null'})`)
      newsUpdated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${n.slug} — błąd update: ${msg}`)
      newsErrors++
    }
  }

  console.log('')
  console.log(
    `📊 News.cover: zaktualizowanych: ${newsUpdated}, pominiętych (już ok): ${newsSkipped}, brak rekordu: ${newsMissing}, błędów: ${newsErrors}`,
  )

  if (DRY_RUN) {
    console.log('')
    console.log('✅ Dry-run zakończony. Uruchom bez --dry-run żeby faktycznie zapisać.')
  } else {
    console.log('')
    console.log('✅ Migracja coverów zakończona.')
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
