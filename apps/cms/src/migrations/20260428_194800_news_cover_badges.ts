import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`news_cover_badges\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`variant\` text NOT NULL DEFAULT 'red',
  	\`href\` text,
  	\`new_tab\` integer DEFAULT true,
  	\`icon\` text DEFAULT 'none',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`news_cover_badges_order_idx\` ON \`news_cover_badges\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`news_cover_badges_parent_id_idx\` ON \`news_cover_badges\` (\`_parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`news_cover_badges\`;`)
}

