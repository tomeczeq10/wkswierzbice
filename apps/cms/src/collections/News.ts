import type { CollectionConfig } from 'payload'

import { slugify } from '../utils/slugify'
import { isEditorOrAdmin } from '../access'

/**
 * Aktualności klubowe.
 *
 * Schema 1:1 z istniejącym Zod schema z apps/web/src/content/config.ts
 * + dwa nowe pola wymagane dla CMS-a:
 *   - `slug` — URL-friendly, auto z title, możliwy override (decyzja Etap 3).
 *   - `body` — Lexical richText (Astro miał to jako "wszystko po `---`",
 *     w Payload musi być explicit field).
 *
 * Pole `cover` — od Etapu 6a relacja `upload(relationTo: 'media')`. Migracja
 * istniejących cover-stringów (text path) odbywa się w Etapie 6b
 * (`apps/cms/scripts/migrate-news-covers.ts`).
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
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
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
      type: 'upload',
      relationTo: 'media',
      label: {
        pl: 'Cover (zdjęcie nagłówkowe)',
        en: 'Cover image',
      },
      admin: {
        description:
          'Wgraj plik (JPEG/PNG/WebP/GIF). Serwis automatycznie wygeneruje warianty thumbnail / card / hero w WebP.',
      },
    },
    {
      name: 'coverAlt',
      type: 'text',
      label: {
        pl: 'Cover ALT (opis dla niewidomych / SEO)',
        en: 'Cover ALT',
      },
      admin: {
        description:
          'Opcjonalnie nadpisuje `alt` z pliku Media w kontekście tego newsa. Jeśli puste — używamy `alt` z Media.',
      },
    },
    {
      name: 'coverBadges',
      type: 'array',
      maxRows: 3,
      label: {
        pl: 'Okienka na okładce',
        en: 'Cover badges',
      },
      admin: {
        description:
          'Opcjonalne „okienka” nakładane na zdjęcie okładkowe (np. „Zawodnik meczu”, „Z Facebooka”). Maks. 3 sztuki.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: {
            pl: 'Tekst',
            en: 'Label',
          },
        },
        {
          name: 'variant',
          type: 'select',
          required: true,
          defaultValue: 'red',
          label: {
            pl: 'Kolor',
            en: 'Variant',
          },
          options: [
            { label: 'Czerwony (CTA)', value: 'red' },
            { label: 'Niebieski', value: 'blue' },
            { label: 'Zielony', value: 'green' },
            { label: 'Szary', value: 'slate' },
          ],
        },
        {
          name: 'href',
          type: 'text',
          label: {
            pl: 'Link (opcjonalnie)',
            en: 'Link (optional)',
          },
          admin: {
            description: 'Jeśli ustawisz, okienko będzie klikalne (np. do Facebooka).',
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
          name: 'newTab',
          type: 'checkbox',
          defaultValue: true,
          label: {
            pl: 'Otwórz w nowej karcie',
            en: 'Open in new tab',
          },
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.href),
          },
        },
        {
          name: 'icon',
          type: 'select',
          label: {
            pl: 'Ikona (opcjonalnie)',
            en: 'Icon (optional)',
          },
          options: [
            { label: 'Brak', value: 'none' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Gwiazdka', value: 'star' },
            { label: 'Puchar', value: 'trophy' },
          ],
          defaultValue: 'none',
        },
      ],
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
