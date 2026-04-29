import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Extend live_match (global)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`mode\` text DEFAULT 'fromMatch' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`match_id\` integer REFERENCES matches(id);`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`kickoff_real\` text;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`added_time1\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`added_time2\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`pause_at\` text;`)
  await db.run(sql`ALTER TABLE \`live_match\` ADD \`resume_at\` text;`)

  await db.run(sql`CREATE INDEX IF NOT EXISTS \`live_match_match_idx\` ON \`live_match\` (\`match_id\`);`)

  // Recreate events table with richer schema
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_live_match_events\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`minute\` numeric,
    \`half\` text,
    \`type\` text DEFAULT 'info' NOT NULL,
    \`team\` text DEFAULT 'wks',
    \`own_goal\` integer DEFAULT false,
    \`scorer_wks_id\` integer,
    \`assist_wks_id\` integer,
    \`scorer_opponent_text\` text,
    \`assist_opponent_text\` text,
    \`text\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`live_match\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`scorer_wks_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`assist_wks_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(
    sql`INSERT INTO \`__new_live_match_events\`("_order","_parent_id","id","minute","type","text")
        SELECT "_order","_parent_id","id","minute","type","text" FROM \`live_match_events\`;`,
  )
  await db.run(sql`DROP TABLE \`live_match_events\`;`)
  await db.run(sql`ALTER TABLE \`__new_live_match_events\` RENAME TO \`live_match_events\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`live_match_events_order_idx\` ON \`live_match_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`live_match_events_parent_id_idx\` ON \`live_match_events\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`live_match_events_scorer_wks_id_idx\` ON \`live_match_events\` (\`scorer_wks_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`live_match_events_assist_wks_id_idx\` ON \`live_match_events\` (\`assist_wks_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Best-effort down: we only restore the events table shape to the old one.
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__old_live_match_events\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`minute\` numeric,
    \`type\` text DEFAULT 'info' NOT NULL,
    \`text\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`live_match\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(
    sql`INSERT INTO \`__old_live_match_events\`("_order","_parent_id","id","minute","type","text")
        SELECT "_order","_parent_id","id","minute","type","text" FROM \`live_match_events\`;`,
  )
  await db.run(sql`DROP TABLE \`live_match_events\`;`)
  await db.run(sql`ALTER TABLE \`__old_live_match_events\` RENAME TO \`live_match_events\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`live_match_events_order_idx\` ON \`live_match_events\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`live_match_events_parent_id_idx\` ON \`live_match_events\` (\`_parent_id\`);`)
}

