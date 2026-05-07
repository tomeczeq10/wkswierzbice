import type { CollectionConfig } from 'payload'
import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

export const Staff: CollectionConfig = {
  slug: 'staff',
  labels: {
    singular: { pl: 'Sztab', en: 'Staff' },
    plural: { pl: 'Sztab', en: 'Staff' },
  },
  admin: {
    group: 'Drużyna',
    hidden: hideUnless('staff'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'type', 'order', 'updatedAt'],
    description: 'Sztab szkoleniowy (sekcja /o-klubie).',
  },
  access: {
    read: () => true,
    create: can('staff', 'create'),
    update: can('staff', 'update'),
    delete: can('staff', 'delete'),
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

