import type { GlobalConfig } from 'payload'
import { canGlobal } from '../access/hasPermission'
import { hideGlobalUnless } from '../access/hideUnlessHasPermission'

export const Season: GlobalConfig = {
  slug: 'season',
  label: { pl: 'Sezon (90minut)', en: 'Season (90minut)' },
  access: {
    read: () => true,
    update: canGlobal('season', 'update'),
  },
  admin: {
    group: 'Mecze',
    hidden: hideGlobalUnless('season'),
    description:
      'Snapshot tabeli i terminarza z 90minut.pl. Uzupełniane przez endpoint /api/season/sync (przycisk poniżej + widget na dashboardzie + cron).',
    components: {
      elements: {
        /** Ten sam komponent co widget dashboardu — widać tu zawsze, gdy import map jest OK. */
        beforeDocumentControls: ['./components/SeasonSyncWidget.tsx#default'],
      },
    },
  },
  fields: [
    {
      name: 'lastSync',
      type: 'date',
      label: { pl: 'Ostatnia synchronizacja', en: 'Last sync' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastSyncStatus',
      type: 'select',
      defaultValue: 'idle',
      required: true,
      options: [
        { label: 'Idle', value: 'idle' },
        { label: 'Running', value: 'running' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
      ],
      label: { pl: 'Status', en: 'Status' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastSyncError',
      type: 'textarea',
      label: { pl: 'Błąd (ostatni)', en: 'Last error' },
    },
    {
      name: 'data',
      type: 'json',
      label: { pl: 'Dane sezonu (JSON)', en: 'Season data (JSON)' },
      admin: {
        description:
          'To jest “źródło prawdy” dla /terminarz w Astro. Front ma fallback do lokalnego season.json jeśli CMS niedostępny.',
      },
    },
  ],
}

