import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`gallery_albums\` ADD COLUMN \`parent_id\` integer REFERENCES \`gallery_albums\`(\`id\`) ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`gallery_albums_parent_idx\` ON \`gallery_albums\` (\`parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite nie obsługuje DROP COLUMN wprost przed 3.35 — tworzymy nową tabelę bez kolumny
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_gallery_albums\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`description\` text,
    \`event_date\` text,
    \`cover_id\` integer,
    \`order\` numeric DEFAULT 0,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`INSERT INTO \`__new_gallery_albums\` SELECT "id","title","slug","description","event_date","cover_id","order","updated_at","created_at" FROM \`gallery_albums\`;`)
  await db.run(sql`DROP TABLE \`gallery_albums\`;`)
  await db.run(sql`ALTER TABLE \`__new_gallery_albums\` RENAME TO \`gallery_albums\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`gallery_albums_slug_idx\` ON \`gallery_albums\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`gallery_albums_cover_idx\` ON \`gallery_albums\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`gallery_albums_updated_at_idx\` ON \`gallery_albums\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`gallery_albums_created_at_idx\` ON \`gallery_albums\` (\`created_at\`);`)
}
