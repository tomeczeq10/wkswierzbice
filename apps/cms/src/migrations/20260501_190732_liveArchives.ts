import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Dodaje kolekcję `liveArchives` — snapshoty zakończonych relacji live.
 * Hook na liveMatch (status -> ft) tworzy tu wpisy automatycznie.
 *
 * Tabele:
 *  - live_archives (główna)
 *  - live_archives_rels (lineup hasMany players)
 *
 * Plus kolumna `live_archives_id` w payload_locked_documents_rels.
 *
 * Migracja jest pisana ręcznie zamiast generowanej przez `payload migrate:create`,
 * bo snapshot diff'a (ostatni JSON snapshot to 20260428_041852.json) wymusiłby
 * recreate wielu tabel które już istnieją w prod (matches, live_match itd.) —
 * te zostały dodane wcześniejszymi ręcznymi migracjami.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`live_archives\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`finished_at\` text NOT NULL,
    \`match_id\` integer,
    \`kind\` text,
    \`competition_label\` text,
    \`home_label\` text NOT NULL,
    \`away_label\` text NOT NULL,
    \`score_home\` numeric DEFAULT 0 NOT NULL,
    \`score_away\` numeric DEFAULT 0 NOT NULL,
    \`final_score\` text,
    \`wks_side\` text,
    \`events\` text,
    \`duration_minutes\` numeric,
    \`used_for_article\` integer DEFAULT false,
    \`article_note\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)

  await db.run(sql`CREATE INDEX \`live_archives_match_idx\` ON \`live_archives\` (\`match_id\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_finished_at_idx\` ON \`live_archives\` (\`finished_at\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_updated_at_idx\` ON \`live_archives\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_created_at_idx\` ON \`live_archives\` (\`created_at\`);`)

  // hasMany lineup → players
  await db.run(sql`CREATE TABLE \`live_archives_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`players_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`live_archives\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`players_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)

  await db.run(sql`CREATE INDEX \`live_archives_rels_order_idx\` ON \`live_archives_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_rels_parent_idx\` ON \`live_archives_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_rels_path_idx\` ON \`live_archives_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`live_archives_rels_players_id_idx\` ON \`live_archives_rels\` (\`players_id\`);`)

  // Payload doc-locking
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`live_archives_id\` integer REFERENCES live_archives(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_live_archives_id_idx\` ON \`payload_locked_documents_rels\` (\`live_archives_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`payload_locked_documents_rels_live_archives_id_idx\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`live_archives_rels\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`live_archives\`;`)
}
