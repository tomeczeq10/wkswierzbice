import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: {
    singular: { pl: 'Sponsor', en: 'Sponsor' },
    plural: { pl: 'Sponsorzy', en: 'Sponsors' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tier', 'website', 'updatedAt'],
    description: 'Sponsorzy i partnerzy klubu (strona /sponsorzy + komponenty).',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: 'name',
  fields: [
    { name: 'name', type: 'text', required: true, label: { pl: 'Nazwa' } },
    {
      name: 'tier',
      type: 'select',
      required: true,
      label: { pl: 'Poziom' },
      options: [
        { label: 'Strategiczny', value: 'strategiczny' },
        { label: 'Główny', value: 'glowny' },
        { label: 'Wspierający', value: 'wspierajacy' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { pl: 'Logo' },
    },
    {
      name: 'website',
      type: 'text',
      label: { pl: 'Strona www (URL)' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność (opcjonalnie)' },
      admin: { position: 'sidebar' },
    },
  ],
}

