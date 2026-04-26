import type { CollectionConfig } from 'payload'

export const Players: CollectionConfig = {
  slug: 'players',
  labels: {
    singular: { pl: 'Zawodnik', en: 'Player' },
    plural: { pl: 'Zawodnicy', en: 'Players' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'team', 'position', 'number', 'updatedAt'],
    description: 'Kadra drużyn. Każdy zawodnik należy do jednej drużyny (relacja do Teams).',
  },
  access: {
    read: () => true,
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

