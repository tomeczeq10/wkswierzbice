import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin } from '../access'

export const StaticPages: CollectionConfig = {
  slug: 'staticPages',
  labels: {
    singular: { pl: 'Strona statyczna', en: 'Static page' },
    plural: { pl: 'Strony statyczne', en: 'Static pages' },
  },
  admin: {
    useAsTitle: 'slug',
    defaultColumns: ['slug', 'title', 'updatedAt'],
    description: 'Treści stron: o-klubie / nabory / kontakt / polityka-prywatnosci.',
  },
  access: {
    read: () => true,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    {
      name: 'slug',
      type: 'select',
      required: true,
      unique: true,
      label: { pl: 'Slug', en: 'Slug' },
      options: [
        { label: 'O klubie', value: 'o-klubie' },
        { label: 'Nabory', value: 'nabory' },
        { label: 'Kontakt', value: 'kontakt' },
        { label: 'Polityka prywatności', value: 'polityka-prywatnosci' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'title', type: 'text', required: true, label: { pl: 'Tytuł', en: 'Title' } },
    {
      name: 'body',
      type: 'richText',
      label: { pl: 'Treść', en: 'Body' },
    },
  ],
}

