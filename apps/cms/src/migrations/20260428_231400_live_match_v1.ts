import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`live_match\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`enabled\` integer DEFAULT false,
    \`status\` text DEFAULT 'pre' NOT NULL,
    \`competition_label\` text,
    \`home_label\` text,
    \`away_label\` text,
    \`manual_competition_label\` text,
    \`manual_home_label\` text,
    \`manual_away_label\` text,
    \`score_home\` numeric DEFAULT 0,
    \`score_away\` numeric DEFAULT 0,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)

  await db.run(sql`CREATE TABLE \`live_match_events\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`minute\` numeric,
    \`type\` text DEFAULT 'info' NOT NULL,
    \`text\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`live_match\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)

  await db.run(sql`CREATE INDEX \`live_match_events_order_idx\` ON \`live_match_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`live_match_events_parent_id_idx\` ON \`live_match_events\` (\`_parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`live_match_events\`;`)
  await db.run(sql`DROP TABLE \`live_match\`;`)
}
