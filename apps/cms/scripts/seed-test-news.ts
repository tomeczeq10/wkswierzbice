/**
 * Seed: 1 testowy news + 1 tag (idempotentnie).
 * Używany w Etapie 4 PAYLOAD-ROADMAP do walidacji integracji Astro ↔ Payload REST.
 *
 * Uruchomienie:
 *   npx tsx apps/cms/scripts/seed-test-news.ts
 * (z root monorepo; trzyma się .env w apps/cms/)
 *
 * Idempotentność: jeśli tag/news o danym slug-u już istnieje, skrypt go NIE duplikuje.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// UWAGA: dotenv MUSI być załadowany ZANIM zaimportujemy payload.config (który czyta
// process.env.PAYLOAD_SECRET na top-levelu). Stąd używamy dynamicznego importu config-a.
import { config as dotenvConfig } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const { getPayload } = await import('payload');
const payloadConfig = (await import('../src/payload.config')).default;

const TAG_NAME = 'seniorzy';
const NEWS_SLUG = 'test-news-z-cms';
const NEWS_TITLE = 'Testowy news z CMS';
const NEWS_EXCERPT =
  'To jest testowy news utworzony przez seed script. Sprawdza integrację Astro ↔ Payload REST (Etap 4).';

async function main() {
  const payload = await getPayload({ config: payloadConfig });

  const existingTags = await payload.find({
    collection: 'tags',
    where: { name: { equals: TAG_NAME } },
    limit: 1,
  });

  let tagId: number;
  if (existingTags.docs.length > 0) {
    tagId = existingTags.docs[0].id as number;
    console.log(`✓ Tag "${TAG_NAME}" już istnieje (id=${tagId})`);
  } else {
    const created = await payload.create({
      collection: 'tags',
      data: { name: TAG_NAME },
    });
    tagId = created.id as number;
    console.log(`✓ Utworzono tag "${TAG_NAME}" (id=${tagId})`);
  }

  const existingNews = await payload.find({
    collection: 'news',
    where: { slug: { equals: NEWS_SLUG } },
    limit: 1,
  });

  if (existingNews.docs.length > 0) {
    console.log(`✓ News "${NEWS_SLUG}" już istnieje (id=${existingNews.docs[0].id}). Pomijam.`);
    process.exit(0);
  }

  const lexicalBody = {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'heading',
          tag: 'h2',
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Pierwszy news z CMS',
            },
          ],
        },
        {
          type: 'paragraph',
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          textFormat: 0,
          children: [
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Ten news został utworzony przez seed script i pochodzi z Payload REST API. Jeśli widzisz go na stronie ',
            },
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 1, // bold
              mode: 'normal',
              style: '',
              text: '/aktualnosci',
            },
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: ', integracja działa.',
            },
          ],
        },
        {
          type: 'list',
          listType: 'bullet',
          start: 1,
          tag: 'ul',
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'listitem',
              value: 1,
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
              children: [
                { type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style: '', text: 'Lista działa' },
              ],
            },
            {
              type: 'listitem',
              value: 2,
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
              children: [
                { type: 'text', version: 1, detail: 0, format: 2, mode: 'normal', style: '', text: 'Italic też' },
              ],
            },
          ],
        },
      ],
    },
  };

  const news = await payload.create({
    collection: 'news',
    data: {
      title: NEWS_TITLE,
      excerpt: NEWS_EXCERPT,
      date: new Date().toISOString(),
      author: 'Seed script',
      draft: false,
      tags: [tagId],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: lexicalBody as any,
    },
  });

  console.log(`✓ Utworzono news "${NEWS_TITLE}" (id=${news.id}, slug=${news.slug})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
