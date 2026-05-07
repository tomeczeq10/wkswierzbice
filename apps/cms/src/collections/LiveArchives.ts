import type { CollectionConfig } from 'payload'

import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

/**
 * LiveArchives — snapshot zakończonej relacji live (status=ft).
 *
 * Cel: po meczu osoba pisząca aktualności w CMS ma jedno miejsce z kompletną
 * listą zdarzeń (gole, kartki, asysty, minuty), żeby na ich podstawie napisać
 * relację jako artykuł. NIE służy do uzupełniania wyników w terminarzu —
 * to jest osobne zadanie w kolekcji Matches.
 *
 * Rekord tworzony automatycznie przez hook na liveMatch global, gdy status
 * przechodzi z czegokolwiek innego na `ft`.
 */
export const LiveArchives: CollectionConfig = {
  slug: 'liveArchives',
  labels: {
    singular: { pl: 'Archiwum relacji', en: 'Live archive' },
    plural: { pl: 'Archiwum relacji', en: 'Live archives' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'finishedAt', 'finalScore', 'usedForArticle'],
    description:
      'Snapshoty zakończonych relacji live (status=ft). Służą do późniejszego napisania artykułu w aktualnościach. Wyniki w terminarzu uzupełniaj osobno.',
    group: 'Mecze',
    hidden: hideUnless('liveArchives'),
  },
  access: {
    read: () => true,
    create: can('liveArchives', 'create'),
    update: can('liveArchives', 'update'),
    delete: can('liveArchives', 'delete'),
  },
  defaultSort: '-finishedAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { pl: 'Tytuł', en: 'Title' },
      admin: { description: 'Auto: „Gospodarz vs Gość · DD miesiąc YYYY”.' },
    },
    {
      name: 'finishedAt',
      type: 'date',
      required: true,
      label: { pl: 'Zakończona', en: 'Finished at' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      hasMany: false,
      label: { pl: 'Mecz (z terminarza)', en: 'Match' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'kind',
      type: 'select',
      options: [
        { label: 'Ligowy', value: 'league' },
        { label: 'Sparing', value: 'friendly' },
        { label: 'Puchar', value: 'cup' },
        { label: 'Własny', value: 'custom' },
      ],
      label: { pl: 'Rodzaj', en: 'Kind' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'competitionLabel',
      type: 'text',
      label: { pl: 'Opis rozgrywek', en: 'Competition label' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'homeLabel',
          type: 'text',
          required: true,
          label: { pl: 'Gospodarz', en: 'Home label' },
          admin: { width: '50%' },
        },
        {
          name: 'awayLabel',
          type: 'text',
          required: true,
          label: { pl: 'Gość', en: 'Away label' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'scoreHome',
          type: 'number',
          required: true,
          defaultValue: 0,
          label: { pl: 'Wynik (gosp.)', en: 'Score home' },
          admin: { width: '50%' },
        },
        {
          name: 'scoreAway',
          type: 'number',
          required: true,
          defaultValue: 0,
          label: { pl: 'Wynik (gość)', en: 'Score away' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'finalScore',
      type: 'text',
      label: { pl: 'Wynik (tekst)', en: 'Final score' },
      admin: {
        description: 'Auto: „X:Y”. Wygodne do listy.',
        readOnly: true,
      },
    },
    {
      name: 'wksSide',
      type: 'select',
      options: [
        { label: 'WKS gra u siebie', value: 'home' },
        { label: 'WKS gra na wyjeździe', value: 'away' },
      ],
      label: { pl: 'Strona WKS', en: 'WKS side' },
    },
    {
      name: 'events',
      type: 'json',
      label: { pl: 'Zdarzenia (snapshot)', en: 'Events snapshot' },
      admin: {
        description:
          'Pełna lista zdarzeń z relacji w momencie zakończenia (gole, kartki, asysty, minuty). Format JSON — używaj do napisania artykułu.',
      },
    },
    {
      name: 'lineup',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      label: { pl: 'Kadra meczowa', en: 'Lineup' },
      admin: { description: 'Skopiowana z meczu w terminarzu.' },
    },
    {
      name: 'durationMinutes',
      type: 'number',
      label: { pl: 'Czas trwania (min)', en: 'Duration (min)' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'usedForArticle',
      type: 'checkbox',
      defaultValue: false,
      label: { pl: 'Wykorzystane w aktualnościach', en: 'Used for article' },
      admin: {
        position: 'sidebar',
        description: 'Zaznacz po napisaniu relacji w sekcji Aktualności, żeby wiedzieć co jest „do zrobienia”.',
      },
    },
    {
      name: 'articleNote',
      type: 'textarea',
      label: { pl: 'Notatka do artykułu', en: 'Article note' },
      admin: {
        description: 'Pomocnicze notatki dla osoby piszącej relację.',
      },
    },
  ],
}
