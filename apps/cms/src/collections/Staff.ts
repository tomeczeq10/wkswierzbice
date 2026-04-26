import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Staff: CollectionConfig = {
  slug: 'staff',
  labels: {
    singular: { pl: 'Sztab', en: 'Staff' },
    plural: { pl: 'Sztab', en: 'Staff' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'type', 'order', 'updatedAt'],
    description: 'Sztab szkoleniowy (sekcja /o-klubie).',
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
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'inne',
      label: { pl: 'Typ' },
      options: [
        { label: 'Trener pierwszej drużyny', value: 'trener_pierwszej_druzyny' },
        { label: 'Trener młodzieży', value: 'trener_mlodziezy' },
        { label: 'Inne', value: 'inne' },
      ],
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

