import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`kind\` text DEFAULT 'league' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`competition_custom_label\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite: removing columns requires table rebuild; we leave columns in place (no-op).
  return
}

