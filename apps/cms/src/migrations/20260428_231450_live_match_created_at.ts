import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(
    sql`ALTER TABLE \`live_match\` ADD \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;`,
  )
  await db.run(sql`CREATE INDEX \`live_match_updated_at_idx\` ON \`live_match\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`live_match_created_at_idx\` ON \`live_match\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite: removing columns requires table rebuild; leave in place (no-op).
  return
}
