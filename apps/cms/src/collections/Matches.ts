import type { CollectionConfig } from 'payload'

import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: {
    singular: { pl: 'Mecz', en: 'Match' },
    plural: { pl: 'Mecze', en: 'Matches' },
  },
  admin: {
    group: 'Mecze',
    hidden: hideUnless('matches'),
    useAsTitle: 'label',
    defaultColumns: ['kickoffPlanned', 'competitionType', 'venue', 'homeTeamLabel', 'awayTeamLabel', 'updatedAt'],
    description:
      'Terminarz w CMS (liga / sparing / puchar). Źródło propozycji dla relacji live oraz docelowo dla stron terminarza.',
  },
  access: {
    read: () => true,
    create: can('matches', 'create'),
    update: can('matches', 'update'),
    delete: can('matches', 'delete'),
  },
  defaultSort: '-kickoffPlanned',
  fields: [
    {
      name: 'source',
      type: 'select',
      defaultValue: 'imported',
      options: [
        { label: 'Z 90minut (terminarz ligowy)', value: 'imported' },
        { label: 'Ręczny (sparing/puchar/test)', value: 'manual' },
      ],
      label: { pl: 'Źródło', en: 'Source' },
      admin: {
        position: 'sidebar',
        description:
          'Mecze ręczne (sparingi, pucharowe one-offy, testy) usuwają się automatycznie z terminarza po zakończeniu live (status=ft). Mecze ligowe (z 90minut) zostają.',
      },
    },
    {
      name: 'competitionType',
      type: 'select',
      required: true,
      defaultValue: 'league',
      options: [
        { label: 'Ligowy', value: 'league' },
        { label: 'Sparing', value: 'friendly' },
        { label: 'Puchar', value: 'cup' },
      ],
      label: { pl: 'Rodzaj meczu', en: 'Competition type' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'competitionLabel',
      type: 'text',
      label: { pl: 'Rozgrywki / kolejka (opis)', en: 'Competition label' },
      admin: { description: 'Np. „Klasa okręgowa · K24”, „Puchar Polski”.' },
    },
    {
      name: 'kickoffPlanned',
      type: 'date',
      required: true,
      label: { pl: 'Początek (planowany)', en: 'Kickoff (planned)' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'kickoffReal',
      type: 'date',
      label: { pl: 'Początek (realny, opcjonalnie)', en: 'Kickoff (real, optional)' },
      admin: {
        position: 'sidebar',
        description:
          'Jeśli mecz zaczął się później, ustaw realny start — relacja live może liczyć minuty względem tej wartości.',
      },
    },
    {
      name: 'venue',
      type: 'select',
      required: true,
      defaultValue: 'home',
      options: [
        { label: 'U siebie', value: 'home' },
        { label: 'Wyjazd', value: 'away' },
        { label: 'Neutralny', value: 'neutral' },
      ],
      label: { pl: 'Miejsce', en: 'Venue' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'locationLabel',
      type: 'text',
      label: { pl: 'Lokalizacja (opis)', en: 'Location label' },
      admin: { description: 'Np. „Wierzbice”, „Stadion XYZ”.' },
    },
    {
      name: 'homeTeamLabel',
      type: 'text',
      required: true,
      defaultValue: 'WKS Wierzbice',
      label: { pl: 'Gospodarze', en: 'Home team' },
    },
    {
      name: 'awayTeamLabel',
      type: 'text',
      required: true,
      label: { pl: 'Goście', en: 'Away team' },
    },
    {
      name: 'wksSide',
      type: 'select',
      required: true,
      defaultValue: 'home',
      options: [
        { label: 'WKS = gospodarze', value: 'home' },
        { label: 'WKS = goście', value: 'away' },
      ],
      label: { pl: 'Strona WKS', en: 'WKS side' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'wksTeam',
      type: 'relationship',
      relationTo: 'teams',
      label: { pl: 'Drużyna WKS (opcjonalnie)', en: 'WKS team (optional)' },
      admin: {
        position: 'sidebar',
        description: 'Jeśli ustawione, relacja live może filtrować zawodników po tej drużynie.',
      },
    },
    {
      name: 'lineup',
      type: 'relationship',
      relationTo: 'players',
      hasMany: true,
      label: { pl: 'Kadra na mecz', en: 'Match lineup' },
      admin: {
        description:
          'Wybierz kadrę na mecz. Lista jest pogrupowana po pozycjach dla szybkiej weryfikacji. Ustaw „Drużyna WKS”, żeby zawęzić listę, a potem użyj przycisku „Uzupełnij z drużyny WKS”, jeśli chcesz szybko zaznaczyć całą kadrę.',
        components: {
          Field: './components/MatchLineupGroupedField#default',
        },
      },
    },
    {
      name: 'label',
      type: 'text',
      label: { pl: 'Etykieta (auto)', en: 'Label (auto)' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Pomocniczy tytuł w liście meczów (generowany).',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const home = String(siblingData?.homeTeamLabel ?? '').trim()
            const away = String(siblingData?.awayTeamLabel ?? '').trim()
            const type = String(siblingData?.competitionType ?? '').trim()
            const when = siblingData?.kickoffPlanned ? String(siblingData.kickoffPlanned).slice(0, 16) : ''
            const base = home && away ? `${home} vs ${away}` : 'Mecz'
            return [base, type, when].filter(Boolean).join(' · ')
          },
        ],
      },
    },
  ],
}

