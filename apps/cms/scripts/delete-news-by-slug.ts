/**
 * Pomocnicze: usuwa news z CMS po slug. Używamy do re-importu po naprawie parsera.
 *
 * Uruchomienie: npx tsx apps/cms/scripts/delete-news-by-slug.ts <slug>
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const { getPayload } = await import('payload');
const payloadConfig = (await import('../src/payload.config')).default;

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx delete-news-by-slug.ts <slug>');
  process.exit(1);
}

const payload = await getPayload({ config: payloadConfig });
const result = await payload.delete({
  collection: 'news',
  where: { slug: { equals: slug } },
});
console.log(`Usunięto ${result.docs.length} rekordów dla slug="${slug}"`);
process.exit(0);
