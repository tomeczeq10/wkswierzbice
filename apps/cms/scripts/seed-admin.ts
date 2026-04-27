/**
 * Seeduje konto admin po reset/fresh dev DB.
 *
 * Czytane z `apps/cms/.env` (lub fallback **TYLKO DEV** — proste konto z prośby zespołu):
 *   ADMIN_EMAIL=admin@wks.local  (Payload: pole „Email” w /admin — pierwszeństwo nad ADMIN_LOGIN)
 *   ADMIN_PASSWORD=admin
 *   ADMIN_LOGIN=admin            (tylko gdy brak ADMIN_EMAIL; bez '@' → `…@local.test`)
 *
 * Nadpisz w `.env` w produkcji — nigdy nie commituj prawdziwych haseł.
 *
 * Idempotentne — jeśli user już istnieje, skrypt ustawia mu hasło na nowe.
 *
 * Uruchomienie: npx tsx apps/cms/scripts/seed-admin.ts
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../.env') })

const { getPayload } = await import('payload')
const payloadConfig = (await import('../src/payload.config')).default

const rawLogin = process.env.ADMIN_EMAIL ?? process.env.ADMIN_LOGIN ?? 'admin@wks.local'
const email = rawLogin.includes('@') ? rawLogin : `${rawLogin}@local.test`
const password = process.env.ADMIN_PASSWORD ?? 'admin'

const payload = await getPayload({ config: payloadConfig })

const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
})

if (existing.docs.length > 0) {
  const id = existing.docs[0].id
  await payload.update({
    collection: 'users',
    id,
    data: { password, role: 'admin', team: null },
  })
  console.log(`✓ Admin "${email}" już istnieje (id=${id}) — hasło zaktualizowane.`)
  process.exit(0)
}

const created = await payload.create({
  collection: 'users',
  data: { email, password, role: 'admin', team: null },
})
console.log(`🚀 Utworzono admina: id=${created.id}, email=${email}`)
console.log(`   Hasło: z env ADMIN_PASSWORD (lub domyślne dev — zmień w panelu /admin).`)
process.exit(0)
