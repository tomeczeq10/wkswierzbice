/**
 * Seeduje konto admin po reset/fresh dev DB.
 *
 * Czytane z `apps/cms/.env` (lub fallback do bezpiecznych dev-defaultów):
 *   ADMIN_EMAIL=admin@wks-wierzbice.pl
 *   ADMIN_PASSWORD=<wpisz w .env, NIGDY nie commituj>
 *
 * Idempotentne — jeśli user już istnieje, skrypt loguje pomijam.
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

const email = process.env.ADMIN_EMAIL ?? 'admin@wks-wierzbice.pl'
const password = process.env.ADMIN_PASSWORD ?? 'dev-pass-2026!'

const payload = await getPayload({ config: payloadConfig })

const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
})

if (existing.docs.length > 0) {
  console.log(`✓ Admin "${email}" już istnieje (id=${existing.docs[0].id}), pomijam.`)
  process.exit(0)
}

const created = await payload.create({
  collection: 'users',
  data: { email, password },
})
console.log(`🚀 Utworzono admina: id=${created.id}, email=${email}`)
console.log(`   Hasło: z env ADMIN_PASSWORD (lub default dev — zmień w panelu /admin po pierwszym logowaniu).`)
process.exit(0)
