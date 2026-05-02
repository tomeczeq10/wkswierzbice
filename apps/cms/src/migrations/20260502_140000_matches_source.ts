import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Dodaje kolumnę `source` do tabeli `matches`.
 *
 * Cel: rozróżnić mecze automatycznie pobrane z 90minut (`imported`) od
 * stworzonych ręcznie w `Live Setup` (`manual`). Po zakończeniu relacji
 * (`liveMatch.status=ft`) mecze ręczne (testy / sparingi / puchary one-off)
 * są kasowane z terminarza, żeby nie zaśmiecały listy. Mecze ligowe
 * z 90minut zostają — terminarz jest fundamentem strony publicznej.
 *
 * Default 'imported' bezpieczny — istniejące rekordy w prod to mecze ligowe
 * z auto-importu (testy zostały już usunięte ręcznie).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`matches\` ADD \`source\` text DEFAULT 'imported';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite drop column wymaga rebuild tabeli. No-op (best-effort) —
  // i tak `down` jest tylko dla porządku, w prod zostawiamy `up`.
  return
}
