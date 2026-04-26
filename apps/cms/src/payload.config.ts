import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
/** Katalog `apps/cms` (nie `apps/cms/src` — tam leży `payload.config.ts`). */
const cmsRoot = path.resolve(dirname, '..')

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
  },
  collections: [Users, Media, News, Tags, Teams, Players, Gallery],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: resolveSqliteUrl(process.env.DATABASE_URL || ''),
    },
  }),
  sharp,
  plugins: [],
})
