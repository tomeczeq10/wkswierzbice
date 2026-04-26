import type { CollectionConfig } from 'payload'

/**
 * Galeria klubu (Etap 9) — płaska lista zdjęć.
 * Opcjonalne `albumId` na przyszłość (albumy bez breaking change).
 */
export const Gallery: CollectionConfig = {
  slug: 'gallery',
  labels: {
    singular: { pl: 'Zdjęcie galerii', en: 'Gallery item' },
    plural: { pl: 'Galeria', en: 'Gallery' },
  },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['alt', 'order', 'category', 'updatedAt'],
    description: 'Zdjęcia na /galeria. Kolejność = pole „Kolejność” (niższe = wcześniej).',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { pl: 'Zdjęcie', en: 'Image' },
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: { pl: 'Alt (dostępność)', en: 'Alt text' },
    },
    {
      name: 'caption',
      type: 'text',
      label: { pl: 'Podpis (opcjonalnie)', en: 'Caption' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność', en: 'Order' },
      admin: {
        position: 'sidebar',
        description: 'Sort rosnąco: 0, 1, 2…',
      },
    },
    {
      name: 'category',
      type: 'text',
      label: { pl: 'Kategoria (opcjonalnie)', en: 'Category' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'albumId',
      type: 'text',
      label: { pl: 'ID albumu (opcjonalnie)', en: 'Album ID' },
      admin: {
        position: 'sidebar',
        description: 'Rezerwa pod przyszłe albumy — na razie puste.',
      },
    },
  ],
}
