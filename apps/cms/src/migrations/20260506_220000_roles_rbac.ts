import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Migracja RBAC (Role-Based Access Control).
 *
 *   1. Tworzy tabelę `roles` z 53 polami permissions (12 kolekcji × 4 CRUD,
 *      2 globalsy, 3 specjalne dostępy) + `is_system` flag + meta.
 *   2. Wstawia rolę systemową "Administrator" (wszystkie permissions = 1).
 *   3. Dodaje kolumnę `role_id` do `users`, indeksuje, przypisuje wszystkim
 *      istniejącym userom rolę Administrator (dziś = 1 user `admin@wks.local`).
 *   4. Recreate-uje `users` z `role_id NOT NULL` (FK + invariant).
 *      Stara kolumna `role` (text enum) jest USUWANA.
 *
 * Down: odwracalne — usuwa role_id, przywraca role (text), DROP roles.
 *       UWAGA: po `down` userzy dostają domyślne role='admin' (bo string
 *       enum nie ma sensownego mapowania z FK).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Tabela `roles` ────────────────────────────────────────────────────
  await db.run(sql`CREATE TABLE \`roles\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`description\` text,
    \`is_system\` integer DEFAULT 0 NOT NULL,
    \`permissions_news_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_news_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_news_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_news_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_tags_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_tags_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_tags_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_tags_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_players_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_players_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_players_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_players_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_teams_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_teams_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_teams_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_teams_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_staff_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_staff_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_staff_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_staff_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_board_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_board_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_board_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_board_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_matches_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_matches_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_matches_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_matches_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_live_archives_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_live_archives_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_live_archives_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_live_archives_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_media_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_media_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_media_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_media_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_hero_slides_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_hero_slides_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_hero_slides_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_hero_slides_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_sponsors_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_sponsors_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_sponsors_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_sponsors_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_static_pages_read\` integer DEFAULT 0 NOT NULL,
    \`permissions_static_pages_create\` integer DEFAULT 0 NOT NULL,
    \`permissions_static_pages_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_static_pages_delete\` integer DEFAULT 0 NOT NULL,
    \`permissions_globals_site_config_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_globals_season_update\` integer DEFAULT 0 NOT NULL,
    \`permissions_special_live_studio\` integer DEFAULT 0 NOT NULL,
    \`permissions_special_gallery_manager\` integer DEFAULT 0 NOT NULL,
    \`permissions_special_sync_season\` integer DEFAULT 0 NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)

  await db.run(sql`CREATE UNIQUE INDEX \`roles_name_idx\` ON \`roles\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`roles_updated_at_idx\` ON \`roles\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`roles_created_at_idx\` ON \`roles\` (\`created_at\`);`)

  // ── 2. Seed: Administrator role (wszystkie permissions = 1) ─────────────
  await db.run(sql`INSERT INTO \`roles\` (
    \`name\`, \`description\`, \`is_system\`,
    \`permissions_news_read\`, \`permissions_news_create\`, \`permissions_news_update\`, \`permissions_news_delete\`,
    \`permissions_tags_read\`, \`permissions_tags_create\`, \`permissions_tags_update\`, \`permissions_tags_delete\`,
    \`permissions_players_read\`, \`permissions_players_create\`, \`permissions_players_update\`, \`permissions_players_delete\`,
    \`permissions_teams_read\`, \`permissions_teams_create\`, \`permissions_teams_update\`, \`permissions_teams_delete\`,
    \`permissions_staff_read\`, \`permissions_staff_create\`, \`permissions_staff_update\`, \`permissions_staff_delete\`,
    \`permissions_board_read\`, \`permissions_board_create\`, \`permissions_board_update\`, \`permissions_board_delete\`,
    \`permissions_matches_read\`, \`permissions_matches_create\`, \`permissions_matches_update\`, \`permissions_matches_delete\`,
    \`permissions_live_archives_read\`, \`permissions_live_archives_create\`, \`permissions_live_archives_update\`, \`permissions_live_archives_delete\`,
    \`permissions_media_read\`, \`permissions_media_create\`, \`permissions_media_update\`, \`permissions_media_delete\`,
    \`permissions_hero_slides_read\`, \`permissions_hero_slides_create\`, \`permissions_hero_slides_update\`, \`permissions_hero_slides_delete\`,
    \`permissions_sponsors_read\`, \`permissions_sponsors_create\`, \`permissions_sponsors_update\`, \`permissions_sponsors_delete\`,
    \`permissions_static_pages_read\`, \`permissions_static_pages_create\`, \`permissions_static_pages_update\`, \`permissions_static_pages_delete\`,
    \`permissions_globals_site_config_update\`, \`permissions_globals_season_update\`,
    \`permissions_special_live_studio\`, \`permissions_special_gallery_manager\`, \`permissions_special_sync_season\`
  ) VALUES (
    'Administrator', 'Pełny dostęp do wszystkiego — rola systemowa, nieusuwalna.', 1,
    1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
    1,1, 1,1,1
  );`)

  // ── 3. Dodaj role_id do users ───────────────────────────────────────────
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`role_id\` integer REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE no action;`)
  await db.run(sql`CREATE INDEX \`users_role_idx\` ON \`users\` (\`role_id\`);`)

  // ── 4. Przypisz Administrator wszystkim istniejącym userom ──────────────
  await db.run(sql`UPDATE \`users\` SET \`role_id\` = (SELECT \`id\` FROM \`roles\` WHERE \`name\` = 'Administrator');`)

  // ── 5. Recreate users z role_id NOT NULL + bez starej kolumny `role` ────
  // (SQLite < 3.35 nie obsługuje DROP COLUMN ani MODIFY)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_users\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`role_id\` integer NOT NULL,
    \`team_id\` integer,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`email\` text NOT NULL,
    \`reset_password_token\` text,
    \`reset_password_expiration\` text,
    \`salt\` text,
    \`hash\` text,
    \`login_attempts\` numeric DEFAULT 0,
    \`lock_until\` text,
    FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`INSERT INTO \`__new_users\` (\`id\`, \`role_id\`, \`team_id\`, \`updated_at\`, \`created_at\`, \`email\`, \`reset_password_token\`, \`reset_password_expiration\`, \`salt\`, \`hash\`, \`login_attempts\`, \`lock_until\`) SELECT \`id\`, \`role_id\`, \`team_id\`, \`updated_at\`, \`created_at\`, \`email\`, \`reset_password_token\`, \`reset_password_expiration\`, \`salt\`, \`hash\`, \`login_attempts\`, \`lock_until\` FROM \`users\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`ALTER TABLE \`__new_users\` RENAME TO \`users\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)

  // Odtworzenie indeksów na users
  await db.run(sql`CREATE INDEX \`users_role_idx\` ON \`users\` (\`role_id\`);`)
  await db.run(sql`CREATE INDEX \`users_team_idx\` ON \`users\` (\`team_id\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Recreate users z `role` (text) zamiast `role_id` (FK).
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_users\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`role\` text DEFAULT 'admin' NOT NULL,
    \`team_id\` integer,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`email\` text NOT NULL,
    \`reset_password_token\` text,
    \`reset_password_expiration\` text,
    \`salt\` text,
    \`hash\` text,
    \`login_attempts\` numeric DEFAULT 0,
    \`lock_until\` text,
    FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`INSERT INTO \`__new_users\` (\`id\`, \`role\`, \`team_id\`, \`updated_at\`, \`created_at\`, \`email\`, \`reset_password_token\`, \`reset_password_expiration\`, \`salt\`, \`hash\`, \`login_attempts\`, \`lock_until\`) SELECT \`id\`, 'admin', \`team_id\`, \`updated_at\`, \`created_at\`, \`email\`, \`reset_password_token\`, \`reset_password_expiration\`, \`salt\`, \`hash\`, \`login_attempts\`, \`lock_until\` FROM \`users\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`ALTER TABLE \`__new_users\` RENAME TO \`users\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)

  await db.run(sql`CREATE INDEX \`users_team_idx\` ON \`users\` (\`team_id\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)

  await db.run(sql`DROP TABLE \`roles\`;`)
}
