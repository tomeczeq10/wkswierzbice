import type { CollectionConfig } from 'payload'
import { slugify } from '../utils/slugify'
import { isEditorOrAdmin } from '../access'

/**
 * Albumy galerii (wydarzenia) — karty na /galeria, zdjęcia w /galeria/[slug].
 */
export const GalleryAlbums: CollectionConfig = {
  slug: 'gallery-albums',
  labels: {
    singular: { pl: 'Album galerii', en: 'Gallery album' },
    plural: { pl: 'Albumy galerii', en: 'Gallery albums' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'eventDate', 'order', 'updatedAt'],
    description:
      'Wydarzenia / foldery na stronie Galeria. Do albumu przypisz zdjęcia w kolekcji „Galeria”.',
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
