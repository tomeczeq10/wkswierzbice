import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`matches\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`competition_type\` text DEFAULT 'league' NOT NULL,
  	\`competition_label\` text,
  	\`kickoff_planned\` text NOT NULL,
  	\`kickoff_real\` text,
  	\`venue\` text DEFAULT 'home' NOT NULL,
  	\`location_label\` text,
  	\`home_team_label\` text NOT NULL,
  	\`away_team_label\` text NOT NULL,
  	\`wks_side\` text DEFAULT 'home' NOT NULL,
  	\`wks_team_id\` integer,
  	\`label\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`wks_team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)

  await db.run(sql`CREATE INDEX \`matches_kickoff_planned_idx\` ON \`matches\` (\`kickoff_planned\`);`)
  await db.run(sql`CREATE INDEX \`matches_kickoff_real_idx\` ON \`matches\` (\`kickoff_real\`);`)
  await db.run(sql`CREATE INDEX \`matches_wks_team_idx\` ON \`matches\` (\`wks_team_id\`);`)
  await db.run(sql`CREATE INDEX \`matches_updated_at_idx\` ON \`matches\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`matches_created_at_idx\` ON \`matches\` (\`created_at\`);`)

  // Payload lock-doc rels needs a column for this new collection
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`matches_id\` integer REFERENCES matches(id);`)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_matches_id_idx\` ON \`payload_locked_documents_rels\` (\`matches_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`matches\`;`)

  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`news_id\` integer,
  	\`tags_id\` integer,
  	\`teams_id\` integer,
  	\`players_id\` integer,
  	\`gallery_id\` integer,
  	\`board_id\` integer,
  	\`staff_id\` integer,
  	\`sponsors_id\` integer,
  	\`hero_slides_id\` integer,
  	\`static_pages_id\` integer,
  	\`gallery_albums_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`news_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`teams_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`players_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`gallery_id\`) REFERENCES \`gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`board_id\`) REFERENCES \`board\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sponsors_id\`) REFERENCES \`sponsors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`hero_slides_id\`) REFERENCES \`hero_slides\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`static_pages_id\`) REFERENCES \`static_pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`gallery_albums_id\`) REFERENCES \`gallery_albums\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)

  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`(
    "id","order","parent_id","path",
    "users_id","media_id","news_id","tags_id","teams_id","players_id","gallery_id",
    "board_id","staff_id","sponsors_id","hero_slides_id","static_pages_id","gallery_albums_id"
  )
  SELECT
    "id","order","parent_id","path",
    "users_id","media_id","news_id","tags_id","teams_id","players_id","gallery_id",
    "board_id","staff_id","sponsors_id","hero_slides_id","static_pages_id","gallery_albums_id"
  FROM \`payload_locked_documents_rels\`;`)

  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_news_id_idx\` ON \`payload_locked_documents_rels\` (\`news_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tags_id_idx\` ON \`payload_locked_documents_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_teams_id_idx\` ON \`payload_locked_documents_rels\` (\`teams_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_players_id_idx\` ON \`payload_locked_documents_rels\` (\`players_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_board_id_idx\` ON \`payload_locked_documents_rels\` (\`board_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_staff_id_idx\` ON \`payload_locked_documents_rels\` (\`staff_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sponsors_id_idx\` ON \`payload_locked_documents_rels\` (\`sponsors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_hero_slides_id_idx\` ON \`payload_locked_documents_rels\` (\`hero_slides_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_static_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`static_pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_albums_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_albums_id\`);`)
}

