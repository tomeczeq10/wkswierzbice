/**
 * Etap 12: seed `heroSlides` + `staticPages` z legacy danych.
 *
 * - Hero slides: z `apps/web/src/config/site.ts` (HERO_SLIDES).
 *   Obrazy uploadowane do Media (SVG placeholder-hero.svg jest dozwolony).
 *
 * - Static pages: tworzymy minimalnie `polityka-prywatnosci` (treść placeholder),
 *   żeby można było edytować w panelu i zobaczyć efekt na froncie.
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/seed-hero-and-static-pages.ts --dry-run
 *   npx tsx apps/cms/scripts/seed-hero-and-static-pages.ts
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
  const localFile = resolvePublicFile(publicPath)
  if (!fs.existsSync(localFile)) return null
  const filename = path.basename(localFile)
  const mime = detectMime(localFile)
  if (!mime) return null

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
    HERO_SLIDES: { image: string; kicker?: string; title?: string; subtitle?: string }[]
  }

  console.log(DRY_RUN ? '🧪 DRY RUN' : '🚀 Live')

  console.log('=== heroSlides ===')
  for (let i = 0; i < site.HERO_SLIDES.length; i++) {
    const s = site.HERO_SLIDES[i]
    const mediaId = await ensureMedia(payload, s.image, s.title ?? 'Hero slide')
    const existing = await payload.find({
      collection: 'heroSlides',
      where: { and: [{ order: { equals: i } }, { title: { equals: s.title ?? '' } }] },
      limit: 1,
    })
    const data = {
      image: mediaId && mediaId !== 0 ? mediaId : null,
      kicker: s.kicker ?? null,
      title: s.title ?? `Slajd ${i + 1}`,
      subtitle: s.subtitle ?? null,
      ctaLabel: null,
      ctaHref: null,
      active: true,
      order: i,
    }
    if (existing.docs.length > 0) {
      if (DRY_RUN) console.log(`  [dry] update heroSlide ${i}`)
      else await payload.update({ collection: 'heroSlides', id: existing.docs[0].id, data })
    } else {
      if (DRY_RUN) console.log(`  [dry] create heroSlide ${i}`)
      else await payload.create({ collection: 'heroSlides', data })
    }
  }

  console.log('=== staticPages ===')
  const slug = 'polityka-prywatnosci'
  const existing = await payload.find({
    collection: 'staticPages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const minimalBody = {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [
            { type: 'text', version: 1, text: 'Treść polityki prywatności — edytuj w panelu CMS.', detail: 0, format: 0, mode: 'normal', style: '' },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
        },
      ],
    },
  }
  const data = { slug, title: 'Polityka prywatności', body: minimalBody as any }
  if (existing.docs.length > 0) {
    if (DRY_RUN) console.log(`  [dry] update staticPage ${slug}`)
    else await payload.update({ collection: 'staticPages', id: existing.docs[0].id, data })
  } else {
    if (DRY_RUN) console.log(`  [dry] create staticPage ${slug}`)
    else await payload.create({ collection: 'staticPages', data })
  }

  console.log('✅ done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

