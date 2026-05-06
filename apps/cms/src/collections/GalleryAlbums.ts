import type { CollectionConfig } from 'payload'
import { slugify } from '../utils/slugify'
import { isEditorOrAdmin } from '../access'

/**
 * Foldery / albumy galerii — dowolna głębokość zagnieżdżenia.
 * Folder bez rodzica (parent = puste) = folder główny widoczny na /galeria.
 * Folder z rodzicem = podfolder (dowolny poziom).
 * Zdjęcia przypisuj do folderu-liścia (bez podfolderów).
 * Zarządzaj przez Menedżer galerii: /admin/gallery-manager
 */
export const GalleryAlbums: CollectionConfig = {
  slug: 'gallery-albums',
  labels: {
    singular: { pl: 'Folder galerii', en: 'Gallery folder' },
    plural: { pl: 'Foldery galerii', en: 'Gallery folders' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'parent', 'slug', 'eventDate', 'updatedAt'],
    description:
      'Foldery galerii — dowolna głębokość. Zarządzaj przez Menedżer galerii (/admin/gallery-manager).',
    hidden: true,
  },
  access: {
    read: () => true,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { pl: 'Tytuł (np. turniej trampkarzy)', en: 'Title' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { pl: 'Slug URL', en: 'URL slug' },
      admin: {
        position: 'sidebar',
        description:
          'Adres: /galeria/[slug]. Puste = z tytułu. Nie używaj slug „bez-albumu” (zarezerwowany).',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim().length > 0) return slugify(value)
            if (typeof data?.title === 'string' && data.title.trim().length > 0)
              return slugify(data.title)
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { pl: 'Opis (opcjonalnie)', en: 'Description' },
    },
    {
      name: 'eventDate',
      type: 'date',
      label: { pl: 'Data wydarzenia', en: 'Event date' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Do sortowania albumów na liście (najnowsze pierwsze).',
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: { pl: 'Okładka (opcjonalnie)', en: 'Cover image' },
      admin: {
        description: 'Miniatura na karcie albumu. Bez okładki — pierwsze zdjęcie z albumu.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'gallery-albums',
      label: { pl: 'Folder nadrzędny', en: 'Parent folder' },
      admin: {
        position: 'sidebar',
        description:
          'Zostaw puste → folder główny. Wybierz folder → podfolder (dowolna głębokość).',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność na liście', en: 'Order' },
      admin: {
        position: 'sidebar',
        description: 'Niższe = wyżej (przy tej samej dacie).',
      },
    },
  ],
}
