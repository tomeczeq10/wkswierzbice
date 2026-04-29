import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`kickoff_planned\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite: removing columns requires table rebuild; we leave column in place (no-op).
  return
}

