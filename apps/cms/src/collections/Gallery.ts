import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin } from '../access'

/**
 * Galeria klubu — zdjęcia przypisane do albumu (`gallery-albums`) lub bez albumu.
 */
export const Gallery: CollectionConfig = {
  slug: 'gallery',
  labels: {
    singular: { pl: 'Zdjęcie galerii', en: 'Gallery item' },
    plural: { pl: 'Galeria', en: 'Gallery' },
  },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['alt', 'album', 'order', 'category', 'updatedAt'],
    description:
      'Zdjęcia w albumach: wybierz album lub zostaw puste — wtedy trafią do „Pozostałe” na /galeria.',
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
      name: 'album',
      type: 'relationship',
      relationTo: 'gallery-albums',
      label: { pl: 'Album', en: 'Album' },
      admin: {
        position: 'sidebar',
        description: 'Puste = sekcja „Pozostałe zdjęcia” na stronie galerii.',
      },
    },
    {
      name: 'category',
      type: 'text',
      label: { pl: 'Kategoria (opcjonalnie)', en: 'Category' },
      admin: { position: 'sidebar' },
    },
  ],
}
