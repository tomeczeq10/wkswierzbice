import type { CollectionConfig } from 'payload'
import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

export const StaticPages: CollectionConfig = {
  slug: 'staticPages',
  labels: {
    singular: { pl: 'Strona statyczna', en: 'Static page' },
    plural: { pl: 'Strony statyczne', en: 'Static pages' },
  },
  admin: {
    group: 'Ustawienia',
    hidden: hideUnless('staticPages'),
    useAsTitle: 'slug',
    defaultColumns: ['slug', 'title', 'updatedAt'],
    description: 'Treści stron: o-klubie / nabory / kontakt / polityka-prywatnosci.',
  },
  access: {
    read: () => true,
    create: can('staticPages', 'create'),
    update: can('staticPages', 'update'),
    delete: can('staticPages', 'delete'),
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

