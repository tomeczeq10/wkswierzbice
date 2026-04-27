import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin } from '../access'
import path from 'path'

const uploadsDir =
  process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : process.cwd().endsWith(path.join('apps', 'cms'))
      ? path.resolve(process.cwd(), 'media')
      : path.resolve(process.cwd(), 'apps/cms/media')

/**
 * Kolekcja Media — uploads w Payload (Etap 6a).
 *
 * Storage: local FS (default Payload — `apps/cms/media/`). W produkcji to samo
 * na VPS (Etap 17).
 *
 * Image sizes (Wariant A — decyzja Tomka 2026-04-26):
 *   - thumbnail: 320 px szer., zachowuje proporcje
 *   - card:      640 px szer., zachowuje proporcje (główne użycie: NewsCard, lista)
 *   - hero:      1200×630 (ratio 1.91:1, og:image friendly), crop center (single news header)
 *
 * Wszystkie warianty generowane w WebP (lepsza kompresja). Oryginał zachowany w
 * formacie wgranym (JPEG/PNG/WebP/GIF) — edytor widzi w panelu to, co wgrał.
 *
 * Pole `alt` jest **opcjonalne** — bo ten sam plik (np. `herb-wks.png`) jest
 * używany przez wiele newsów z różnymi alt-textami; alt per-context trzymamy w
 * `News.coverAlt`. Frontend: `news.coverAlt ?? media.alt ?? ''`.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { pl: 'Plik media' },
    plural: { pl: 'Media' },
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: { pl: 'Alt (opis dla niewidomych / SEO)' },
      admin: {
        description:
          'Krótki opis obrazka (np. „Herb WKS Wierzbice"). Może być nadpisany na poziomie newsa polem „Cover ALT".',
      },
    },
  ],
  upload: {
    staticDir: uploadsDir,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'card',
        width: 640,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        name: 'hero',
        width: 1200,
        height: 630,
        position: 'center',
        formatOptions: { format: 'webp', options: { quality: 85 } },
      },
    ],
  },
}
