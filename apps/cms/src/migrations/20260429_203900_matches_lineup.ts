import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Relationship (hasMany) for matches.lineup -> players uses `matches_rels` with path='lineup'
  await db.run(sql`CREATE TABLE \`matches_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`players_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`players_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`matches_rels_order_idx\` ON \`matches_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`matches_rels_parent_idx\` ON \`matches_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`matches_rels_path_idx\` ON \`matches_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`matches_rels_players_id_idx\` ON \`matches_rels\` (\`players_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`matches_rels\`;`)
}

