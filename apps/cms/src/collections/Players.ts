import type { CollectionConfig } from 'payload'

import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

export const Players: CollectionConfig = {
  slug: 'players',
  labels: {
    singular: { pl: 'Zawodnik', en: 'Player' },
    plural: { pl: 'Zawodnicy', en: 'Players' },
  },
  admin: {
    group: 'Drużyna',
    hidden: hideUnless('players'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'team', 'position', 'number', 'updatedAt'],
    description: 'Kadra drużyn. Każdy zawodnik należy do jednej drużyny (relacja do Teams).',
  },
  access: {
    read: () => true,
    create: can('players', 'create'),
    update: can('players', 'update'),
    delete: can('players', 'delete'),
  },
  defaultSort: 'name',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { pl: 'Imię i nazwisko', en: 'Name' },
    },
    {
      name: 'number',
      type: 'number',
      label: { pl: 'Numer', en: 'Number' },
    },
    {
      name: 'position',
      type: 'text',
      label: { pl: 'Pozycja', en: 'Position' },
      admin: {
        description:
          'Np. "Bramkarz", "Obrońca", "Pomocnik", "Napastnik". Front grupuje zawodników po słowach-kluczach.',
      },
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      required: true,
      label: { pl: 'Drużyna', en: 'Team' },
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value, req }) => {
            // Trener nie może przypisać zawodnika do innej drużyny niż własna.
            const role = (req.user as any)?.role
            const userTeam = (req.user as any)?.team
            if (role === 'trener' && userTeam) return userTeam
            return value
          },
        ],
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: { pl: 'Zdjęcie (opcjonalnie)', en: 'Photo (optional)' },
      admin: {
        description: 'Opcjonalny portret. Jeśli brak, karta pokaże watermark z herbem.',
      },
    },
  ],
}

