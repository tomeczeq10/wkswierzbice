import type { GlobalConfig } from 'payload'
import { getRole } from '../access'
import { livePubSub } from '../live/pubsub'

export const LiveMatch: GlobalConfig = {
  slug: 'liveMatch',
  label: { pl: 'Relacja na żywo', en: 'Live match' },
  access: {
    read: () => true,
    update: ({ req }) => {
      const r = getRole(req)
      return r === 'admin' || r === 'redaktor' || r === 'trener'
    },
  },
  admin: {
    description:
      'Relacja na żywo w hero na stronie głównej. Włącz tylko podczas meczu — kibice zobaczą wynik i zdarzenia (realtime przez SSE, z bezpiecznym fallbackiem).',
    components: {
      elements: {
        beforeDocumentControls: ['./components/LiveMatchWidget.tsx#default'],
      },
    },
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        // Publish latest snapshot for SSE subscribers.
        livePubSub.publish({ type: 'liveMatch', data: doc })
      },
    ],
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      label: { pl: 'Włącz relację', en: 'Enable live match' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pre',
      required: true,
      options: [
        { label: 'Przed meczem', value: 'pre' },
        { label: '1. połowa (live)', value: 'live' },
        { label: 'Przerwa', value: 'ht' },
        { label: '2. połowa (live)', value: 'live2' },
        { label: 'Koniec', value: 'ft' },
      ],
      label: { pl: 'Stan', en: 'State' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'fromMatch',
      required: true,
      options: [
        { label: 'Z terminarza', value: 'fromMatch' },
        { label: 'Ręcznie', value: 'manual' },
      ],
      label: { pl: 'Tryb danych meczu', en: 'Match data mode' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'league',
      required: true,
      options: [
        { label: 'Ligowy', value: 'league' },
        { label: 'Sparing', value: 'friendly' },
        { label: 'Puchar', value: 'cup' },
        { label: 'Własny tekst', value: 'custom' },
      ],
      label: { pl: 'Rodzaj meczu', en: 'Match kind' },
      admin: {
        position: 'sidebar',
        description: 'Wpływa na sugestię meczu oraz etykietę rozgrywek.',
      },
    },
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      label: { pl: 'Mecz (z terminarza)', en: 'Match (from schedule)' },
      admin: {
        position: 'sidebar',
        condition: (_, data) => data?.mode === 'fromMatch',
        description: 'Wybierz mecz z terminarza (liga/sparing/puchar). Studio i widget mogą sugerować najbliższy.',
      },
    },
    {
      name: 'competitionCustomLabel',
      type: 'text',
      label: { pl: 'Własny opis rozgrywek', en: 'Custom competition label' },
      admin: {
        position: 'sidebar',
        condition: (_, data) => data?.kind === 'custom' || data?.mode === 'manual',
        description: 'Np. „Sparing · Trening”, „Puchar Polski”, „Turniej”.',
      },
    },
    {
      name: 'competitionLabel',
      type: 'text',
      label: { pl: 'Rozgrywki / kolejka (opis)', en: 'Competition label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
        description: 'Np. „Klasa okręgowa · K24”, „Puchar Polski”, „Sparing”.',
      },
    },
    {
      name: 'kickoffPlanned',
      type: 'date',
      label: { pl: 'Start (planowany)', en: 'Kickoff (planned)' },
      admin: {
        position: 'sidebar',
        description:
          'Używane w zapowiedzi pre‑match na stronie głównej („Relacja na żywo od HH:MM”). Gdy tryb = terminarz, możesz zostawić puste.',
      },
    },
    {
      name: 'kickoffReal',
      type: 'date',
      label: { pl: 'Start (realny)', en: 'Kickoff (real)' },
      admin: {
        position: 'sidebar',
        description: 'Od tego czasu liczona jest minuta w relacji (auto-clock).',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'addedTime1',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Doliczony (1. poł.)', en: 'Added time (1H)' },
          admin: { width: '50%', position: 'sidebar' },
        },
        {
          name: 'addedTime2',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Doliczony (2. poł.)', en: 'Added time (2H)' },
          admin: { width: '50%', position: 'sidebar' },
        },
      ],
    },
    {
      name: 'pauseAt',
      type: 'date',
      label: { pl: 'Pauza od (auto)', en: 'Paused at (auto)' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ustawiane przez widget przy przejściu do przerwy.',
      },
    },
    {
      name: 'resumeAt',
      type: 'date',
      label: { pl: 'Wznowienie od (auto)', en: 'Resumed at (auto)' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ustawiane przez widget przy starcie 2. połowy.',
      },
    },

    {
      name: 'homeLabel',
      type: 'text',
      required: false,
      defaultValue: 'WKS Wierzbice',
      label: { pl: 'Gospodarze', en: 'Home label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
      },
    },
    {
      name: 'awayLabel',
      type: 'text',
      required: false,
      label: { pl: 'Goście', en: 'Away label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
      },
    },

    // Legacy/DB compatibility: pola powstałe w dev podczas iteracji schematu.
    // Trzymamy je ukryte, żeby dev server nie próbował ich usuwać (drizzle push warnings).
    {
      name: 'manualCompetitionLabel',
      type: 'text',
      label: { pl: 'manualCompetitionLabel (ukryte)', en: 'manualCompetitionLabel (hidden)' },
      admin: { condition: () => false },
    },
    {
      name: 'manualHomeLabel',
      type: 'text',
      label: { pl: 'manualHomeLabel (ukryte)', en: 'manualHomeLabel (hidden)' },
      admin: { condition: () => false },
    },
    {
      name: 'manualAwayLabel',
      type: 'text',
      label: { pl: 'manualAwayLabel (ukryte)', en: 'manualAwayLabel (hidden)' },
      admin: { condition: () => false },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'scoreHome',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Gospodarze', en: 'Home' },
          admin: { width: '50%' },
        },
        {
          name: 'scoreAway',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Goście', en: 'Away' },
          admin: { width: '50%' },
        },
      ],
      label: { pl: 'Wynik', en: 'Score' },
    },
    {
      name: 'events',
      type: 'array',
      label: { pl: 'Zdarzenia', en: 'Events' },
      maxRows: 30,
      admin: {
        description:
          'Najpierw najnowsze. Dla WKS wybieraj zawodników z listy (bez literówek), dla rywala wpisz tekst ręcznie.',
      },
      fields: [
        {
          name: 'minute',
          type: 'number',
          min: 0,
          label: { pl: 'Minuta', en: 'Minute' },
          admin: { width: '15%' },
        },
        {
          name: 'half',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
          ],
          label: { pl: 'Połowa', en: 'Half' },
          admin: { width: '10%' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'info',
          options: [
            { label: 'Gol', value: 'goal' },
            { label: 'Kartka', value: 'card' },
            { label: 'Zmiana', value: 'sub' },
            { label: 'Info', value: 'info' },
          ],
          label: { pl: 'Typ', en: 'Type' },
          admin: { width: '15%' },
        },
        {
          name: 'team',
          type: 'select',
          defaultValue: 'wks',
          options: [
            { label: 'WKS', value: 'wks' },
            { label: 'Rywal', value: 'opponent' },
          ],
          label: { pl: 'Drużyna', en: 'Team' },
          admin: {
            width: '15%',
            condition: (_, sibling) => sibling?.type !== 'info',
          },
        },
        {
          name: 'ownGoal',
          type: 'checkbox',
          defaultValue: false,
          label: { pl: 'Samobój', en: 'Own goal' },
          admin: {
            width: '15%',
            condition: (_, sibling) => sibling?.type === 'goal',
          },
        },
        {
          name: 'scorerWks',
          type: 'relationship',
          relationTo: 'players',
          label: { pl: 'Strzelec (WKS)', en: 'Scorer (WKS)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'assistWks',
          type: 'relationship',
          relationTo: 'players',
          label: { pl: 'Asysta (WKS)', en: 'Assist (WKS)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'scorerText',
          type: 'text',
          label: { pl: 'Strzelec (tekst, opcjonalnie)', en: 'Scorer (text, optional)' },
          admin: {
            description: 'Użyj, jeśli strzelec nie jest na liście kadry.',
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'assistText',
          type: 'text',
          label: { pl: 'Asysta (tekst, opcjonalnie)', en: 'Assist (text, optional)' },
          admin: {
            description: 'Opcjonalnie, jeśli nie wybierasz zawodnika.',
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'scorerOpponentText',
          type: 'text',
          label: { pl: 'Strzelec (rywal: imię/nazwisko/nr)', en: 'Scorer (opponent text)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'opponent',
          },
        },
        {
          name: 'assistOpponentText',
          type: 'text',
          label: { pl: 'Asysta (rywal: tekst)', en: 'Assist (opponent text)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'opponent',
          },
        },
        {
          name: 'text',
          type: 'text',
          required: false,
          label: { pl: 'Opis / notatka', en: 'Text' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'info',
          },
        },
      ],
    },
  ],
}

