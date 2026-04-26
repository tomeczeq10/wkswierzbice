/**
 * Migracja 24 plików `apps/web/src/content/news/*.md` → Payload CMS (Etap 5).
 *
 * Strategia:
 *   - Slug newsa = nazwa pliku bez `.md` (1:1 z Astro Content Collections),
 *     żeby zachować istniejące URL-e `/aktualnosci/<slug>`.
 *   - Frontmatter parsujemy przez `gray-matter` (`title`, `date`, `excerpt`,
 *     `cover`, `coverAlt`, `tags`, `author`, `facebookUrl`, `truncated`,
 *     `draft`).
 *   - Body: markdown → Lexical przez własny `markdownToLexical` (proste akapity,
 *     bold, italic, link — patrz `lib/md-to-lexical.ts`).
 *   - Tagi: dla każdego unikalnego stringa z `tags[]` we frontmatterze tworzymy
 *     rekord `tags` (jeśli nie istnieje), potem podpinamy relację do newsa.
 *   - Idempotentność: `find({ slug })` przed `create()`. Re-run bez side
 *     effects.
 *   - `cover` zostaje stringiem (np. `/news/orzel-na-horyzoncie.jpg`) — w
 *     Etapie 6 podmienimy na upload + Media collection.
 *
 * Tryby:
 *   - `--dry-run` — tylko loguje plan (co utworzy, co pominie). Zero side effects.
 *   - bez flag — realne zapisy do bazy.
 *
 * Uruchomienie (z root monorepo):
 *   npx tsx apps/cms/scripts/migrate-news.ts --dry-run
 *   npx tsx apps/cms/scripts/migrate-news.ts
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config as dotenvConfig } from 'dotenv';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const { getPayload } = await import('payload');
const payloadConfig = (await import('../src/payload.config')).default;
const { markdownToLexical } = await import('./lib/md-to-lexical');

const NEWS_DIR = path.resolve(__dirname, '../../../apps/web/src/content/news');
const DRY_RUN = process.argv.includes('--dry-run');

type Frontmatter = {
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  coverAlt?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
  facebookUrl?: string;
  truncated?: boolean;
};

type ParsedFile = {
  slug: string;
  filePath: string;
  frontmatter: Frontmatter;
  body: string;
};

function loadFiles(): ParsedFile[] {
  const files = fs
    .readdirSync(NEWS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  return files.map((filename) => {
    const filePath = path.join(NEWS_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const slug = filename.replace(/\.md$/, '');
    return {
      slug,
      filePath,
      frontmatter: parsed.data as Frontmatter,
      body: parsed.content,
    };
  });
}

async function main() {
  console.log(DRY_RUN ? '🌵 DRY RUN — no writes' : '🚀 LIVE RUN');

  const files = loadFiles();
  console.log(`📂 Wczytano ${files.length} plików .md z ${NEWS_DIR}\n`);

  const allTagNames = new Set<string>();
  for (const f of files) {
    for (const t of f.frontmatter.tags ?? []) allTagNames.add(t);
  }
  console.log(`🏷️  Unikalnych tagów: ${allTagNames.size} (${[...allTagNames].join(', ')})`);

  const payload = await getPayload({ config: payloadConfig });

  const tagIdByName = new Map<string, number>();
  let tagsCreated = 0;
  let tagsExisting = 0;

  for (const name of allTagNames) {
    const existing = await payload.find({
      collection: 'tags',
      where: { name: { equals: name } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      tagIdByName.set(name, existing.docs[0].id as number);
      tagsExisting++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [dry] Utworzyłbym tag "${name}"`);
      tagIdByName.set(name, -1);
    } else {
      const created = await payload.create({
        collection: 'tags',
        data: { name },
      });
      tagIdByName.set(name, created.id as number);
      tagsCreated++;
    }
  }
  console.log(`   istniejące: ${tagsExisting}, utworzone: ${tagsCreated}\n`);

  let newsCreated = 0;
  let newsSkipped = 0;
  let newsErrored = 0;

  for (const f of files) {
    const fm = f.frontmatter;

    const existing = await payload.find({
      collection: 'news',
      where: { slug: { equals: f.slug } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      console.log(`  ⏭  ${f.slug} — istnieje (id=${existing.docs[0].id}), pomijam`);
      newsSkipped++;
      continue;
    }

    const tagIds = (fm.tags ?? [])
      .map((name) => tagIdByName.get(name))
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const lexicalBody = markdownToLexical(f.body);

    const data = {
      title: fm.title,
      slug: f.slug,
      date: new Date(fm.date).toISOString(),
      excerpt: fm.excerpt,
      cover: fm.cover ?? null,
      coverAlt: fm.coverAlt ?? null,
      tags: tagIds.length > 0 ? tagIds : null,
      author: fm.author ?? 'Redakcja klubu',
      draft: fm.draft ?? false,
      facebookUrl: fm.facebookUrl ?? null,
      truncated: fm.truncated ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: lexicalBody as any,
    };

    if (DRY_RUN) {
      console.log(
        `  [dry] Utworzyłbym news "${f.slug}" (tytuł: "${fm.title.slice(0, 50)}...", tagi: ${
          (fm.tags ?? []).join(', ') || '—'
        }, body paragraphs: ${lexicalBody.root.children.length})`,
      );
      newsCreated++;
      continue;
    }

    try {
      const created = await payload.create({
        collection: 'news',
        data,
      });
      console.log(`  ✓ ${f.slug} → id=${created.id}`);
      newsCreated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${f.slug} — BŁĄD: ${msg}`);
      newsErrored++;
    }
  }

  console.log(
    `\n📊 Podsumowanie: utworzonych: ${newsCreated}, pominiętych (już są): ${newsSkipped}, błędów: ${newsErrored}`,
  );
  process.exit(newsErrored > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
