import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Dodaje kolumny `sizes_large_*` do tabeli `media` po dodaniu nowego image size
 * `large` (1920 px WebP q90) w `Media.ts` — wariant pod lightbox galerii.
 *
 * SQLite obsługuje `ALTER TABLE … ADD COLUMN` (NULL allowed by default), więc
 * możemy dolać 6 kolumn bez przepisywania tabeli ani backupu danych.
 *
 * Wszystkie pole NULL dla istniejących rekordów — Payload generuje sizes
 * dopiero przy uploadzie/regeneracji (skrypt `regenerate-media-sizes.ts`),
 * a frontend (`cms-gallery.ts → pickGalleryFullSrc`) ma fallback do oryginału
 * gdy `sizes.large.url` jest puste.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD COLUMN \`sizes_large_filename\` text;`)
  await db.run(
    sql`CREATE INDEX \`media_sizes_large_sizes_large_filename_idx\` ON \`media\` (\`sizes_large_filename\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`media_sizes_large_sizes_large_filename_idx\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_filename\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_large_url\`;`)
}
