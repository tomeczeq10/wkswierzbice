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
import type { News, Tag, Media } from '@wks/shared';

// UWAGA (SSR w Docker): `import.meta.env.*` jest wypiekane w buildzie.
// Na produkcji źródłem prawdy muszą być zmienne runtime z `process.env`.
const CMS_INTERNAL_URL: string =
  process.env.CMS_INTERNAL_URL ||
  process.env.CMS_URL ||
  import.meta.env.CMS_INTERNAL_URL ||
  import.meta.env.CMS_URL ||
  'http://localhost:3000'

// Do generowania absolutnych URL-i (np. obrazki w HTML) używamy publicznej domeny.
const CMS_PUBLIC_URL: string =
  process.env.CMS_PUBLIC_URL ||
  process.env.PUBLIC_CMS_URL ||
  import.meta.env.CMS_PUBLIC_URL ||
  import.meta.env.PUBLIC_CMS_URL ||
  CMS_INTERNAL_URL

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Lexical RichText body z Payload (typ wygenerowany w payload-types.ts).
 * Wyciągamy non-null wariant — w CMS body może być null/undefined dla newsów importowanych
 * lub świeżo utworzonych bez treści.
 */
export type LexicalBody = NonNullable<News['body']>;

export type CoverVariant = 'thumbnail' | 'card' | 'hero';

export type CoverBadgeVariant = 'red' | 'blue' | 'green' | 'slate'
export type CoverBadgeIcon = 'none' | 'facebook' | 'star' | 'trophy'
export type CoverBadge = {
  label: string
  variant: CoverBadgeVariant
  href?: string
  newTab?: boolean
  icon?: CoverBadgeIcon
}

/**
 * Cover obrazka — abstrakcja na 2 źródła:
 *   - CMS: faktyczny upload z relacji `News.cover -> Media`. URL-e absolute,
 *     warianty thumbnail/card/hero (Etap 6a).
 *   - MD:  legacy ścieżka stringowa z YAML frontmatter (np. `/news/foo.jpg`).
 *     Brak wariantów rozmiarów — `url` używamy w każdym kontekście.
 */
export type NewsCover =
  | {
      source: 'cms';
      url: string;
      alt: string | undefined;
      sizes: Partial<Record<CoverVariant, string>>;
    }
  | {
      source: 'md';
      url: string;
      alt: string | undefined;
    }
  | null;

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
    cover: NewsCover;
    coverAlt?: string;
    tags: string[];
    author: string;
    draft: boolean;
    facebookUrl?: string;
    truncated: boolean;
    coverBadges?: CoverBadge[];
  };
  body:
    | { type: 'lexical'; value: LexicalBody }
    | { type: 'md'; entry: CollectionEntry<'news'> }
    | { type: 'empty' };
};

/**
 * Doklejamy `CMS_URL` jeśli URL z Payload jest relatywny (`/api/media/file/...`).
 * Astro buduje SSG i renderuje obrazki w HTML przed deployem — przeglądarka
 * końcowego użytkownika musi mieć absolutny URL, bo CMS żyje na innym hoście.
 */
function absolutizeCmsUrl(maybeUrl: string | null | undefined): string | undefined {
  if (!maybeUrl) return undefined;
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return new URL(maybeUrl, CMS_PUBLIC_URL).toString();
}

function adaptCmsCover(media: Media | null | number | undefined): NewsCover {
  if (!media || typeof media === 'number') return null;
  const baseUrl = absolutizeCmsUrl(media.url);
  if (!baseUrl) return null;
  const sizes: Partial<Record<CoverVariant, string>> = {};
  for (const variant of ['thumbnail', 'card', 'hero'] as const) {
    const u = absolutizeCmsUrl(media.sizes?.[variant]?.url);
    if (u) sizes[variant] = u;
  }
  return {
    source: 'cms',
    url: baseUrl,
    alt: media.alt ?? undefined,
    sizes,
  };
}

function adaptMdCover(coverPath: string | undefined, alt: string | undefined): NewsCover {
  if (!coverPath) return null;
  return { source: 'md', url: coverPath, alt };
}

/**
 * Wybiera URL właściwego wariantu coveru (z CMS) lub fallback na url głównym.
 * Dla .md ignoruje variant (zwraca jedyny dostępny string).
 */
export function pickCoverUrl(cover: NewsCover, variant: CoverVariant): string | undefined {
  if (!cover) return undefined;
  if (cover.source === 'md') return cover.url;
  return cover.sizes[variant] ?? cover.url;
}

/**
 * Obrazek w treści artykułu (pod nagłówkiem). Nie używa wariantu `hero` (Payload
 * kadruje 1200×630 od środka) — portretowe okładki z Facebooka traciły głowę.
 * OG / meta: nadal `pickCoverUrl(..., "hero")`.
 */
export function pickArticleBodyCoverUrl(cover: NewsCover | null | undefined): string | undefined {
  if (!cover) return undefined;
  if (cover.source === 'cms') {
    return cover.url ?? pickCoverUrl(cover, 'card') ?? pickCoverUrl(cover, 'thumbnail');
  }
  return cover.url;
}

/**
 * Łączy alt z `News.coverAlt` (per-context) z `Media.alt` (per-file).
 * Pierwszeństwo: News.coverAlt → Media.alt → ''.
 */
export function resolveCoverAlt(item: NewsItem): string {
  return item.data.coverAlt ?? item.data.cover?.alt ?? '';
}

function adaptCmsNews(item: News): NewsItem {
  const tags: string[] = (item.tags ?? [])
    .map((t) => (typeof t === 'object' && t !== null ? (t as Tag).name : null))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);

  const coverBadges: CoverBadge[] | undefined = Array.isArray(item.coverBadges)
    ? item.coverBadges
        .filter((b): b is NonNullable<typeof b> => Boolean(b && b.label && b.variant))
        .map((b) => ({
          label: b.label,
          variant: b.variant,
          href: b.href ?? undefined,
          newTab: b.newTab ?? undefined,
          icon: (b.icon ?? undefined) as CoverBadgeIcon | undefined,
        }))
    : undefined

  return {
    id: item.id,
    slug: item.slug ?? String(item.id),
    source: 'cms',
    data: {
      title: item.title,
      date: new Date(item.date),
      excerpt: item.excerpt,
      cover: adaptCmsCover(item.cover),
      coverAlt: item.coverAlt ?? undefined,
      tags,
      author: item.author ?? 'Redakcja klubu',
      draft: item.draft ?? false,
      facebookUrl: item.facebookUrl ?? undefined,
      truncated: item.truncated ?? false,
      coverBadges,
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
      cover: adaptMdCover(entry.data.cover, entry.data.coverAlt),
      coverAlt: entry.data.coverAlt,
      tags: entry.data.tags,
      author: entry.data.author,
      draft: entry.data.draft,
      facebookUrl: entry.data.facebookUrl,
      truncated: entry.data.truncated,
      coverBadges: undefined,
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
  const url = new URL('/api/news', CMS_INTERNAL_URL);
  url.searchParams.set('depth', '2');
  url.searchParams.set('limit', '500');
  url.searchParams.set('sort', '-date');
  url.searchParams.set('where[draft][equals]', 'false');

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
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

    // Świeża prodowa baza: tabele są, ale 0 rekordów — wtedy pokazujemy Markdown
    // z repo (jak przy niedostępnym CMS), żeby nie mylić „pełnej strony” z pełnym panelem.
    const total = json.totalDocs;
    if (json.docs.length === 0 && (total === undefined || total === 0)) {
      console.warn(
        `[cms] Brak opublikowanych newsów w CMS (totalDocs=${total ?? '?'}) — fallback do .md`,
      );
      return null;
    }

    return json.docs;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[cms] Niedostępne (${CMS_INTERNAL_URL}): ${msg} — fallback do .md`);
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
