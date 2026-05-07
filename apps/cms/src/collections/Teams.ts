import type { CollectionConfig } from 'payload'

import { slugify } from '../utils/slugify'
import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: {
    singular: { pl: 'Drużyna', en: 'Team' },
    plural: { pl: 'Drużyny', en: 'Teams' },
  },
  admin: {
    group: 'Drużyna',
    hidden: hideUnless('teams'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'league', 'coach', 'order', 'updatedAt'],
    description: 'Drużyny widoczne na /druzyny. Skład (kadra) jest w osobnej kolekcji Players.',
  },
  access: {
    read: () => true,
    create: can('teams', 'create'),
    update: can('teams', 'update'),
    delete: can('teams', 'delete'),
  },
  defaultSort: '-order',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { pl: 'Nazwa', en: 'Name' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      required: true,
      label: { pl: 'Slug (URL)', en: 'Slug (URL)' },
      admin: {
        position: 'sidebar',
        description: 'Część adresu po /druzyny/. Wypełniane auto z nazwy, można nadpisać.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim().length > 0) return slugify(value)
            if (typeof data?.name === 'string' && data.name.trim().length > 0) return slugify(data.name)
            return value
          },
        ],
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      label: { pl: 'Kategoria', en: 'Category' },
      options: [
        { label: 'Seniorzy', value: 'seniorzy' },
        { label: 'Rezerwy', value: 'rezerwy' },
        { label: 'Juniorzy', value: 'juniorzy' },
        { label: 'Trampkarze', value: 'trampkarze' },
        { label: 'Orlik', value: 'orlik' },
        { label: 'Żak', value: 'zak' },
        { label: 'Skrzat', value: 'skrzat' },
        { label: 'Kobiety', value: 'kobiety' },
        { label: 'Inna', value: 'inna' },
      ],
    },
    {
      name: 'league',
      type: 'text',
      label: { pl: 'Liga', en: 'League' },
    },
    {
      name: 'coach',
      type: 'text',
      required: true,
      label: { pl: 'Trener', en: 'Coach' },
    },
    {
      name: 'assistantCoach',
      type: 'text',
      label: { pl: 'Asystent trenera', en: 'Assistant coach' },
    },
    {
      name: 'trainingSchedule',
      type: 'text',
      label: { pl: 'Treningi', en: 'Training schedule' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: { pl: 'Zdjęcie drużyny', en: 'Team photo' },
      admin: {
        description: 'Opcjonalnie. Jeśli brak, strona pokaże układ bez zdjęcia.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność', en: 'Order' },
      admin: {
        position: 'sidebar',
        description: 'Wyższa wartość = wyżej na listach.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: { pl: 'Opis (treść strony)', en: 'Description (page content)' },
      admin: {
        description: 'Treść renderowana na stronie drużyny. Dla spójności używamy Lexical (jak w newsach).',
      },
    },
  ],
}

