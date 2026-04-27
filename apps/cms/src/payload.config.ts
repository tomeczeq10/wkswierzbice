import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { pl } from '@payloadcms/translations/languages/pl'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Tags } from './collections/Tags'
import { Teams } from './collections/Teams'
import { Players } from './collections/Players'
import { Gallery } from './collections/Gallery'
import { Board } from './collections/Board'
import { Staff } from './collections/Staff'
import { Sponsors } from './collections/Sponsors'
import { HeroSlides } from './collections/HeroSlides'
import { StaticPages } from './collections/StaticPages'
import { SiteConfig } from './globals/SiteConfig'
import { Season } from './globals/Season'

import cron from 'node-cron'
import { syncSeason } from './lib/sync-season'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
/**
 * Katalog `apps/cms`.
 *
 * WAŻNE: w trybie production (Next standalone) ścieżki z `import.meta.url` wskazują na bundlowane pliki w `.next/`,
 * więc nie da się na nich stabilnie wyliczyć `apps/cms`. Opieramy się na `process.cwd()`:
 * - w monorepo: uruchamiane z root → `<root>/apps/cms`
 * - w standalone: ustawiamy working_dir na `.../apps/cms` → `<cwd>`
 */
const cmsRoot = process.cwd().endsWith(path.join('apps', 'cms'))
  ? process.cwd()
  : path.resolve(process.cwd(), 'apps/cms')

function resolveSqliteUrl(raw: string): string {
  // `file:./cms.db` jest wygodne w .env, ale Next/Payload bywa uruchamiany z różnym cwd
  // (root monorepo vs apps/cms). Normalizujemy ścieżkę względną do katalogu `apps/cms`.
  if (!raw) return raw
  if (!raw.startsWith('file:')) return raw
  const p = raw.slice('file:'.length) // np. "./cms.db" albo "/abs/path.db"
  if (p.startsWith('./') || p.startsWith('../')) {
    return `file:${path.resolve(cmsRoot, p)}`
  }
  return raw
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— WKS Wierzbice',
    },
    dashboard: {
      widgets: [
        {
          slug: 'season-sync',
          Component: './components/SeasonSyncWidget.tsx#default',
          minWidth: 'medium',
          maxWidth: 'full',
        },
      ],
    },
  },
  /** Panel admina: UI po polsku (Payload + angielski zapasowy). */
  i18n: {
    fallbackLanguage: 'pl',
    supportedLanguages: { pl, en },
  },
  collections: [
    Users,
    Media,
    News,
    Tags,
    Teams,
    Players,
    Gallery,
    Board,
    Staff,
    Sponsors,
    HeroSlides,
    StaticPages,
  ],
  globals: [SiteConfig, Season],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: resolveSqliteUrl(process.env.DATABASE_URL || ''),
    },
    // W produkcji (Docker) musimy jawnie uruchamiać migracje, bo "push" działa tylko w dev.
    // To odblokowuje start CMS-a na świeżym `cms.db`.
    prodMigrations: migrations,
  }),
  sharp: sharp as any,
  endpoints: [
    {
      path: '/season/sync',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response('Unauthorized', { status: 401 })
        const role = (req.user as any).role
        if (role && role !== 'admin') return new Response('Forbidden', { status: 403 })

        try {
          await req.payload.updateGlobal({
            slug: 'season',
            data: {
              lastSyncStatus: 'running',
              lastSyncError: null,
            },
          })
        } catch {
          // ignore
        }

        // Sync (dev: wykonujemy inline; w prod można przerobić na job queue)
        try {
          const data = await syncSeason()
          await req.payload.updateGlobal({
            slug: 'season',
            data: {
              lastSync: new Date().toISOString(),
              lastSyncStatus: 'success',
              lastSyncError: null,
              data,
            },
          })
          return Response.json({ ok: true })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await req.payload.updateGlobal({
            slug: 'season',
            data: {
              lastSync: new Date().toISOString(),
              lastSyncStatus: 'error',
              lastSyncError: msg,
            },
          })
          return Response.json({ ok: false, error: msg }, { status: 500 })
        }
      },
    },
  ],
  onInit: async (payload) => {
    // Cron jest opcjonalny — w dev domyślnie wyłączony.
    if (process.env.ENABLE_SEASON_CRON !== 'true') return
    const schedule = process.env.SEASON_CRON_SCHEDULE || '0 6 * * *'
    // Prevent duplicate schedules on hot-reload
    ;(globalThis as any).__wksSeasonCronStarted ||= false
    if ((globalThis as any).__wksSeasonCronStarted) return
    ;(globalThis as any).__wksSeasonCronStarted = true

    cron.schedule(schedule, async () => {
      try {
        await payload.updateGlobal({
          slug: 'season',
          data: { lastSyncStatus: 'running', lastSyncError: null },
        })
        const data = await syncSeason()
        await payload.updateGlobal({
          slug: 'season',
          data: {
            lastSync: new Date().toISOString(),
            lastSyncStatus: 'success',
            lastSyncError: null,
            data,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await payload.updateGlobal({
          slug: 'season',
          data: {
            lastSync: new Date().toISOString(),
            lastSyncStatus: 'error',
            lastSyncError: msg,
          },
        })
      }
    })
  },
  plugins: [],
})
