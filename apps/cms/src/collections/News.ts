import type { CollectionConfig } from 'payload'

import { slugify } from '../utils/slugify'

/**
 * Aktualności klubowe.
 *
 * Schema 1:1 z istniejącym Zod schema z apps/web/src/content/config.ts
 * + dwa nowe pola wymagane dla CMS-a:
 *   - `slug` — URL-friendly, auto z title, możliwy override (decyzja Etap 3).
 *   - `body` — Lexical richText (Astro miał to jako "wszystko po `---`",
 *     w Payload musi być explicit field).
 *
 * Pole `cover` — na razie text path (zgodne z istniejącymi 24 newsami w
 * apps/web/src/content/news/*.md). W Etapie 6 (Media uploads) zmienimy
 * na `upload` relationship + przeniesiemy istniejące pliki z
 * apps/web/public/news/ do Payload Media.
 */
export const News: CollectionConfig = {
  slug: 'news',
  labels: {
    singular: {
      pl: 'Aktualność',
      en: 'News post',
    },
    plural: {
      pl: 'Aktualności',
      en: 'News',
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'draft', 'updatedAt'],
    description: 'Wpisy widoczne na /aktualnosci. Pole "Szkic" ukrywa news przed publikacją.',
  },
  access: {
    read: () => true,
  },
  defaultSort: '-date',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        pl: 'Tytuł',
        en: 'Title',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: {
        pl: 'Slug (URL)',
        en: 'Slug (URL)',
      },
      admin: {
        position: 'sidebar',
        description: 'Część adresu po /aktualnosci/. Wypełniane auto z tytułu, można nadpisać.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim().length > 0) {
              return slugify(value)
            }
            if (data?.title && typeof data.title === 'string') {
              return slugify(data.title)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: {
        pl: 'Data publikacji',
        en: 'Publish date',
      },
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'yyyy-MM-dd HH:mm',
        },
      },
    },
    {
      name: 'draft',
      type: 'checkbox',
      defaultValue: false,
      label: {
        pl: 'Szkic (nie publikuj)',
        en: 'Draft',
      },
      admin: {
        position: 'sidebar',
        description: 'Zaznacz żeby ukryć przed publikacją na stronie.',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      label: {
        pl: 'Tagi',
        en: 'Tags',
      },
      admin: {
        position: 'sidebar',
        description: 'Wybierz istniejące tagi lub dodaj nowy ("Create new").',
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Redakcja klubu',
      label: {
        pl: 'Autor',
        en: 'Author',
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      label: {
        pl: 'Lead / zajawka',
        en: 'Excerpt',
      },
      admin: {
        description: 'Krótki opis widoczny na liście newsów (max 2-3 zdania).',
      },
    },
    {
      name: 'cover',
      type: 'text',
      label: {
        pl: 'Cover (ścieżka pliku)',
        en: 'Cover image (path)',
      },
      admin: {
        description: 'Tymczasowo ścieżka tekstowa (np. /news/seniorzy-orzel.jpeg). W Etapie 6 zmienimy na upload.',
      },
    },
    {
      name: 'coverAlt',
      type: 'text',
      label: {
        pl: 'Cover ALT (opis dla niewidomych / SEO)',
        en: 'Cover ALT',
      },
    },
    {
      name: 'body',
      type: 'richText',
      label: {
        pl: 'Treść',
        en: 'Body',
      },
    },
    {
      name: 'facebookUrl',
      type: 'text',
      label: {
        pl: 'Link do posta na Facebooku',
        en: 'Facebook post URL',
      },
      admin: {
        description: 'Opcjonalnie. Pełny URL do posta na fanpage (https://www.facebook.com/...).',
      },
      validate: (value: string | string[] | null | undefined) => {
        if (value === null || value === undefined || value === '') return true
        if (Array.isArray(value)) return 'Pole nie obsługuje wielu wartości.'
        try {
          const url = new URL(value)
          if (!['http:', 'https:'].includes(url.protocol)) {
            return 'URL musi zaczynać się od http:// lub https://'
          }
          return true
        } catch {
          return 'Niepoprawny URL.'
        }
      },
    },
    {
      name: 'truncated',
      type: 'checkbox',
      defaultValue: false,
      label: {
        pl: 'Tekst skrócony (zobacz na FB)',
        en: 'Truncated (see Facebook for full text)',
      },
      admin: {
        description: 'Zaznacz jeśli treść z Facebooka została skrócona (na froncie pokażemy "Czytaj całość na FB").',
      },
    },
  ],
}
