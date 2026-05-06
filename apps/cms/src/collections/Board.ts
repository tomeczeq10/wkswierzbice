import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Board: CollectionConfig = {
  slug: 'board',
  labels: {
    singular: { pl: 'Członek zarządu', en: 'Board member' },
    plural: { pl: 'Zarząd', en: 'Board' },
  },
  admin: {
    group: 'Drużyna',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'order', 'updatedAt'],
    description: 'Zarząd klubu (sekcja /o-klubie).',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, label: { pl: 'Imię i nazwisko' } },
    { name: 'role', type: 'text', required: true, label: { pl: 'Rola' } },
    {
      name: 'highlight',
      type: 'checkbox',
      defaultValue: false,
      label: { pl: 'Wyróżnij' },
      admin: { position: 'sidebar' },
    },
    { name: 'bio', type: 'textarea', label: { pl: 'Opis (opcjonalnie)' } },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: { pl: 'Zdjęcie (opcjonalnie)' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność' },
      admin: { position: 'sidebar' },
    },
  ],
}

