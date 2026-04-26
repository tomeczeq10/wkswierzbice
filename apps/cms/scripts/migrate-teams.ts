/**
 * Etap 7: migracja `apps/web/src/content/teams/*.md` → Payload CMS (Teams + Players).
 *
 * Strategia:
 * - Team.slug = nazwa pliku (1:1 z istniejącymi URL-ami `/druzyny/<slug>`).
 * - Frontmatter: mapujemy pola 1:1 do kolekcji `teams`.
 * - Body: markdown → Lexical przez `markdownToLexical` (ten sam konwerter co newsy).
 * - Roster: każdy wpis YAML `roster[]` tworzy/aktualizuje rekord w `players` z relacją `team`.
 * - Idempotentne (re-run bez duplikatów). Team upsert po slug, Player upsert po (team, name).
 *
 * UWAGA: `photo` z Markdown (string path) jest pomijane — w CMS to relacja upload do Media.
 * Migrujemy zdjęcia w osobnym kroku (analogicznie do news coverów).
 *
 * Tryby:
 *   --dry-run   tylko loguje plan, zero side effects
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/migrate-teams.ts --dry-run
 *   npx tsx apps/cms/scripts/migrate-teams.ts
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
const { markdownToLexical } = await import('./lib/md-to-lexical')

const TEAMS_DIR = path.resolve(__dirname, '../../../apps/web/src/content/teams')
const DRY_RUN = process.argv.includes('--dry-run')

type TeamCategory =
  | 'seniorzy'
  | 'rezerwy'
  | 'juniorzy'
  | 'trampkarze'
  | 'orlik'
  | 'zak'
  | 'skrzat'
  | 'kobiety'
  | 'inna'

type RosterEntry = {
  name: string
  number?: number
  position?: string
}

type Frontmatter = {
  name: string
  category: TeamCategory
  league?: string
  coach: string
  assistantCoach?: string
  trainingSchedule?: string
  photo?: string
  order?: number
  roster?: RosterEntry[]
}

type ParsedFile = {
  slug: string
  filePath: string
  frontmatter: Frontmatter
  body: string
}

function loadFiles(): ParsedFile[] {
  const files = fs
    .readdirSync(TEAMS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()

  return files.map((filename) => {
    const filePath = path.join(TEAMS_DIR, filename)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = matter(raw)
    const slug = filename.replace(/\.md$/, '')
    return {
      slug,
      filePath,
      frontmatter: parsed.data as Frontmatter,
      body: parsed.content.trim(),
    }
  })
}

async function main() {
  const files = loadFiles()
  console.log(`📂 Teams: znaleziono ${files.length} plików .md w ${TEAMS_DIR}`)
  console.log(DRY_RUN ? '🧪 DRY RUN — zero side effects.' : '🚀 Live mode.')
  console.log('')

  const payload = await getPayload({ config: payloadConfig })

  let teamsCreated = 0
  let teamsUpdated = 0
  let playersCreated = 0
  let playersUpdated = 0

  for (const f of files) {
    const fm = f.frontmatter
    const lexical = markdownToLexical(f.body)

    const data = {
      name: fm.name,
      slug: f.slug,
      category: fm.category,
      league: fm.league ?? null,
      coach: fm.coach,
      assistantCoach: fm.assistantCoach ?? null,
      trainingSchedule: fm.trainingSchedule ?? null,
      order: fm.order ?? 0,
      photo: null, // pomijamy (upload relation) — osobny etap
      description: lexical as any,
    }

    const existingTeam = await payload.find({
      collection: 'teams',
      where: { slug: { equals: f.slug } },
      limit: 1,
    })

    let teamId: number
    if (existingTeam.docs.length === 0) {
      if (DRY_RUN) {
        console.log(`  [dry] team create: ${f.slug} (${fm.name})`)
        teamId = 0
        teamsCreated++
      } else {
        const created = await payload.create({ collection: 'teams', data })
        teamId = created.id as number
        console.log(`  ✓ team created: ${f.slug} (id=${teamId})`)
        teamsCreated++
      }
    } else {
      const id = existingTeam.docs[0].id as number
      if (DRY_RUN) {
        console.log(`  [dry] team update: ${f.slug} (id=${id})`)
        teamId = id
        teamsUpdated++
      } else {
        await payload.update({ collection: 'teams', id, data })
        teamId = id
        console.log(`  ↻ team updated: ${f.slug} (id=${teamId})`)
        teamsUpdated++
      }
    }

    const roster = Array.isArray(fm.roster) ? fm.roster : []
    if (roster.length === 0) continue

    if (DRY_RUN && teamId === 0) {
      console.log(`    [dry] players: ${roster.length} (skip upsert details — no teamId in dry create)`)
      continue
    }

    for (const p of roster) {
      const existingPlayer = await payload.find({
        collection: 'players',
        where: {
          and: [
            { team: { equals: teamId } as any },
            { name: { equals: p.name } },
          ],
        },
        limit: 1,
      })

      const playerData = {
        name: p.name,
        number: p.number ?? null,
        position: p.position ?? null,
        team: teamId,
        photo: null,
      }

      if (existingPlayer.docs.length === 0) {
        if (DRY_RUN) {
          playersCreated++
        } else {
          await payload.create({ collection: 'players', data: playerData })
          playersCreated++
        }
      } else {
        const id = existingPlayer.docs[0].id as number
        if (DRY_RUN) {
          playersUpdated++
        } else {
          await payload.update({ collection: 'players', id, data: playerData })
          playersUpdated++
        }
      }
    }
  }

  console.log('')
  console.log(
    `📊 Teams: created=${teamsCreated}, updated=${teamsUpdated} | Players: created=${playersCreated}, updated=${playersUpdated}`,
  )
  console.log(DRY_RUN ? '✅ Dry-run zakończony.' : '✅ Migracja drużyn zakończona.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

