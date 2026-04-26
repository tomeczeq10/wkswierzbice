/**
 * CMS client dla Astro frontu — Etap 4 PAYLOAD-ROADMAP.
 *
 * Strategia: REST API Payload + graceful fallback do plików `src/content/news/*.md`.
 * Kiedy fallback się aktywuje:
 *   - CMS niedostępny (timeout, ECONNREFUSED, DNS)
 *   - HTTP != 2xx
 *   - Wyjątek przy parsowaniu odpowiedzi
 *
 * W obu przypadkach na konsoli pojawia się `[cms] …` warning, ale build/dev się NIE wywala.
 *
 * Po Etapie 5 (migracja .md → CMS) fallback nadal pełni rolę safety net.
 */
import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { News, Tag } from '@wks/shared';

const CMS_URL: string =
  import.meta.env.CMS_URL ||
  import.meta.env.PUBLIC_CMS_URL ||
  'http://localhost:3000';

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Lexical RichText body z Payload (typ wygenerowany w payload-types.ts).
 * Wyciągamy non-null wariant — w CMS body może być null/undefined dla newsów importowanych
 * lub świeżo utworzonych bez treści.
 */
export type LexicalBody = NonNullable<News['body']>;

/**
 * Unified shape na który mapujemy zarówno źródło CMS, jak i .md.
 * Strony Astro powinny używać WYŁĄCZNIE tego typu — wtedy są agnostyczne wobec źródła danych.
 */
export type NewsItem = {
  id: string | number;
  slug: string;
  source: 'cms' | 'md';
  data: {
    title: string;
    date: Date;
    excerpt: string;
    cover?: string;
    coverAlt?: string;
    tags: string[];
    author: string;
    draft: boolean;
    facebookUrl?: string;
    truncated: boolean;
  };
  body:
    | { type: 'lexical'; value: LexicalBody }
    | { type: 'md'; entry: CollectionEntry<'news'> }
    | { type: 'empty' };
};

function adaptCmsNews(item: News): NewsItem {
  const tags: string[] = (item.tags ?? [])
    .map((t) => (typeof t === 'object' && t !== null ? (t as Tag).name : null))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);

  return {
    id: item.id,
    slug: item.slug ?? String(item.id),
    source: 'cms',
    data: {
      title: item.title,
      date: new Date(item.date),
      excerpt: item.excerpt,
      cover: item.cover ?? undefined,
      coverAlt: item.coverAlt ?? undefined,
      tags,
      author: item.author ?? 'Redakcja klubu',
      draft: item.draft ?? false,
      facebookUrl: item.facebookUrl ?? undefined,
      truncated: item.truncated ?? false,
    },
    body: item.body ? { type: 'lexical', value: item.body } : { type: 'empty' },
  };
}

function adaptMdEntry(entry: CollectionEntry<'news'>): NewsItem {
  return {
    id: entry.id,
    slug: entry.slug,
    source: 'md',
    data: {
      title: entry.data.title,
      date: entry.data.date,
      excerpt: entry.data.excerpt,
      cover: entry.data.cover,
      coverAlt: entry.data.coverAlt,
      tags: entry.data.tags,
      author: entry.data.author,
      draft: entry.data.draft,
      facebookUrl: entry.data.facebookUrl,
      truncated: entry.data.truncated,
    },
    body: { type: 'md', entry },
  };
}

type CmsListResponse = {
  docs: News[];
  totalDocs?: number;
  hasNextPage?: boolean;
};

async function fetchFromCms(): Promise<News[] | null> {
  const url = new URL('/api/news', CMS_URL);
  url.searchParams.set('depth', '2');
  url.searchParams.set('limit', '500');
  url.searchParams.set('sort', '-date');
  url.searchParams.set('where[draft][equals]', 'false');

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(
        `[cms] HTTP ${res.status} ${res.statusText} z ${url.toString()} — fallback do .md`,
      );
      return null;
    }

    const json = (await res.json()) as CmsListResponse;
    if (!Array.isArray(json.docs)) {
      console.warn(`[cms] Nieoczekiwany kształt odpowiedzi (brak docs[]) — fallback do .md`);
      return null;
    }

    if (json.hasNextPage) {
      console.warn(
        `[cms] Lista news ma więcej stron niż limit ${url.searchParams.get('limit')}. Zwiększ limit albo zaimplementuj paginację.`,
      );
    }

    return json.docs;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[cms] Niedostępne (${CMS_URL}): ${msg} — fallback do .md`);
    return null;
  }
}

async function fetchFromMd(): Promise<NewsItem[]> {
  const entries = await getCollection('news', ({ data }) => !data.draft);
  return entries.map(adaptMdEntry);
}

/**
 * Pobiera wszystkie opublikowane newsy posortowane malejąco po dacie.
 * Próbuje CMS-a, w razie problemu spada na pliki .md.
 */
export async function fetchNewsList(): Promise<NewsItem[]> {
  const cmsItems = await fetchFromCms();

  const items =
    cmsItems !== null ? cmsItems.map(adaptCmsNews) : await fetchFromMd();

  return items.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
