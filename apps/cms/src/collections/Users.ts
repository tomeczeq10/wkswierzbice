import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Redaktor', value: 'redaktor' },
        { label: 'Trener', value: 'trener' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      label: { pl: 'Drużyna (dla trenera)', en: 'Team (for coach)' },
      admin: {
        position: 'sidebar',
        description: 'Używane tylko dla roli trener — ogranicza edycję zawodników do tej drużyny.',
        condition: (_, siblingData) => siblingData?.role === 'trener',
      },
    },
  ],
}
