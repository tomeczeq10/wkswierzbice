import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Hot-fix dla migracji 20260506_220000_roles_rbac.
 *
 * Payload utrzymuje wspólną tabelę `payload_locked_documents_rels` z kolumnami
 * `*_id` per kolekcja (mechanizm "locked documents" — kto aktualnie edytuje
 * dokument). Po dodaniu kolekcji `roles` Payload szuka `roles_id` w tej tabeli
 * przy każdym requeście do panelu admina — przy braku kolumny CMS rzuca 500.
 *
 * Tę kolumnę POWINNA była dodać poprzednia migracja, ale przeoczyłem to.
 * Tutaj tylko dorzucamy kolumnę + indeks. Bez recreate, bez ryzyka.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`roles_id\` integer REFERENCES \`roles\`(\`id\`) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_roles_id_idx\` ON \`payload_locked_documents_rels\` (\`roles_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite < 3.35 nie obsługuje DROP COLUMN — recreate. Ale tej tabeli używa
  // wyłącznie Payload runtime; bezpieczniej zostawić kolumnę nawet po `down`,
  // bo następne migracje by ją regenerowały. Implementujemy drop dla porządku.
  await db.run(sql`DROP INDEX IF EXISTS \`payload_locked_documents_rels_roles_id_idx\`;`)
  // Alternatywa do recreate: nie ruszamy kolumny — zostaje jako legacy.
  // (recreate z 18 kolumnami i 16 FK to za duże ryzyko dla `down` które prawie
  //  nigdy nie jest uruchamiane).
}
