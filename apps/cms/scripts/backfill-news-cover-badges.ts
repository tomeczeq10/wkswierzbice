/**
 * Backfill `News.coverBadges` na podstawie obecnych danych:
 * - badge z tagu (pierwszy tag, jeśli istnieje)
 * - badge "z Facebooka" (jeśli `facebookUrl` jest ustawione) z linkiem i ikoną
 *
 * Cel: odtworzyć „badge’e jak na starej stronie” jako edytowalne dane w CMS,
 * bez auto-fallbacków w Astro.
 *
 * Uruchomienie (z root monorepo):
 *   npx tsx apps/cms/scripts/backfill-news-cover-badges.ts --dry-run
 *   npx tsx apps/cms/scripts/backfill-news-cover-badges.ts
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')

type CoverBadge = {
  label: string
  variant: 'red' | 'blue' | 'green' | 'slate'
  href?: string | null
  newTab?: boolean | null
  icon?: 'none' | 'facebook' | 'star' | 'trophy' | null
}

function normalizeBadges(badges: unknown): CoverBadge[] {
  if (!Array.isArray(badges)) return []
  return badges
    .filter(Boolean)
    .map((b: any) => ({
      label: String(b?.label ?? '').trim(),
      variant: (b?.variant ?? 'red') as CoverBadge['variant'],
      href: b?.href ?? null,
      newTab: b?.newTab ?? null,
      icon: b?.icon ?? null,
    }))
    .filter((b) => b.label.length > 0)
}

function keyOf(b: CoverBadge): string {
  const href = b.href ? String(b.href) : ''
  const icon = b.icon ? String(b.icon) : ''
  const nt = b.newTab ? '1' : '0'
  return `${b.label.toLowerCase()}|${b.variant}|${href}|${nt}|${icon}`
}

function sameSet(a: CoverBadge[], b: CoverBadge[]): boolean {
  if (a.length !== b.length) return false
  const ak = new Set(a.map(keyOf))
  for (const x of b) if (!ak.has(keyOf(x))) return false
  return true
}

async function main() {
  const { getPayload } = await import('payload')
  const payloadConfig = (await import('../src/payload.config')).default
  const payload = await getPayload({ config: payloadConfig })

  const res = await payload.find({
    collection: 'news',
    limit: 500,
    depth: 2,
    where: { draft: { equals: false } },
    sort: '-date',
  })

  let updated = 0
  let skipped = 0
  let errored = 0

  for (const doc of res.docs as any[]) {
    const existingBadges = normalizeBadges(doc.coverBadges)

    const tagName: string | null =
      Array.isArray(doc.tags) && doc.tags.length > 0
        ? typeof doc.tags[0] === 'object' && doc.tags[0] !== null
          ? String(doc.tags[0].name ?? '').trim() || null
          : null
        : null

    const desired: CoverBadge[] = []

    if (tagName) {
      desired.push({
        label: tagName,
        variant: 'red',
        href: null,
        newTab: null,
        icon: 'none',
      })
    }

    if (typeof doc.facebookUrl === 'string' && doc.facebookUrl.trim().length > 0) {
      desired.push({
        label: 'z Facebooka',
        variant: 'blue',
        href: doc.facebookUrl.trim(),
        newTab: true,
        icon: 'facebook',
      })
    }

    // Jeśli nie ma nic do ustawienia, nie ruszamy.
    if (desired.length === 0) {
      skipped++
      continue
    }

    // Idempotentność: jeśli już dokładnie takie badge’e są, pomijamy.
    if (sameSet(existingBadges, desired)) {
      skipped++
      continue
    }

    const label = String(doc.title ?? doc.slug ?? doc.id ?? '').slice(0, 60)
    if (DRY_RUN) {
      console.log(`  [dry] ${doc.slug ?? doc.id} — ustawiłbym coverBadges: ${desired.map((d) => d.label).join(', ')}`)
      updated++
      continue
    }

    try {
      await payload.update({
        collection: 'news',
        id: doc.id,
        data: {
          coverBadges: desired,
        },
      })
      console.log(`  ✓ ${doc.slug ?? doc.id} — zaktualizowano (${label})`)
      updated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${doc.slug ?? doc.id} — BŁĄD: ${msg}`)
      errored++
    }
  }

  console.log(
    `\n📊 Podsumowanie: zaktualizowanych: ${updated}, pominiętych: ${skipped}, błędów: ${errored}`,
  )
  process.exit(errored > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})

