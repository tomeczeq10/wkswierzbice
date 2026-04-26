/**
 * One-shot manual test (Etap 6a):
 *   1. Wgrywa `apps/web/public/news/orzel-na-horyzoncie.jpg` do kolekcji Media.
 *   2. Linkuje go jako `cover` w newsie o slug `orzel-na-horyzoncie`.
 *
 * Po wykonaniu:
 *   - Media collection: 1 rekord, ze sizes thumbnail/card/hero (WebP).
 *   - News.cover: relacja → Media id.
 *   - apps/web build pokazuje obraz z `<CMS_URL>/api/media/file/...`.
 *
 * Idempotent (multiple runs nie tworzą duplikatów).
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

const NEWS_SLUG = 'orzel-na-horyzoncie'
const SOURCE_FILE = path.resolve(__dirname, '../../web/public/news/orzel-na-horyzoncie.jpg')

if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`Source file missing: ${SOURCE_FILE}`)
  process.exit(1)
}

const payload = await getPayload({ config: payloadConfig })

// 1. News must exist (po migrate-news).
const newsResult = await payload.find({
  collection: 'news',
  where: { slug: { equals: NEWS_SLUG } },
  limit: 1,
})
const news = newsResult.docs[0]
if (!news) {
  console.error(`News slug=${NEWS_SLUG} nie istnieje (uruchom najpierw migrate-news).`)
  process.exit(1)
}
console.log(`✓ News znaleziony: id=${news.id}`)

// 2. Media — idempotentnie po filename.
const filename = path.basename(SOURCE_FILE)
const existingMedia = await payload.find({
  collection: 'media',
  where: { filename: { equals: filename } },
  limit: 1,
})

let mediaId: number
if (existingMedia.docs.length > 0) {
  mediaId = existingMedia.docs[0].id as number
  console.log(`⏭  Media "${filename}" już jest (id=${mediaId}), pomijam upload.`)
} else {
  const buf = fs.readFileSync(SOURCE_FILE)
  const created = await payload.create({
    collection: 'media',
    data: { alt: 'Orzeł WKS Wierzbice na tle błękitnego nieba — cover newsa o awansie' },
    file: {
      data: buf,
      mimetype: 'image/jpeg',
      name: filename,
      size: buf.length,
    },
  })
  mediaId = created.id as number
  console.log(`🚀 Media uploaded: id=${mediaId}, filename=${filename}, sizes=${Object.keys((created as { sizes?: object }).sizes ?? {}).join(', ')}`)
}

// 3. Link news.cover → media.
if (typeof news.cover === 'object' && news.cover !== null && (news.cover as { id?: number }).id === mediaId) {
  console.log(`⏭  News.cover już wskazuje na media id=${mediaId}, pomijam update.`)
} else if (typeof news.cover === 'number' && news.cover === mediaId) {
  console.log(`⏭  News.cover już wskazuje na media id=${mediaId}, pomijam update.`)
} else {
  await payload.update({
    collection: 'news',
    id: news.id,
    data: { cover: mediaId },
  })
  console.log(`🔗 News.cover ustawione: id=${news.id} → media id=${mediaId}`)
}

console.log('✅ Done.')
process.exit(0)
