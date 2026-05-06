import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const SiteConfig: GlobalConfig = {
  slug: 'siteConfig',
  label: { pl: 'Konfiguracja strony', en: 'Site config' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  admin: {
    group: 'Ustawienia',
    description:
      'Ustawienia globalne strony (nawigacja, kontakt, social). Front ma fallback do `site.ts` gdy CMS OFF.',
  },
  fields: [
    {
      name: 'site',
      type: 'group',
      label: { pl: 'Dane strony', en: 'Site' },
      fields: [
        { name: 'name', type: 'text', required: true, label: { pl: 'Nazwa', en: 'Name' } },
        {
          name: 'shortName',
          type: 'text',
          required: true,
          label: { pl: 'Nazwa krótka', en: 'Short name' },
        },
        { name: 'tagline', type: 'text', label: { pl: 'Tagline', en: 'Tagline' } },
        { name: 'description', type: 'textarea', label: { pl: 'Opis (SEO)', en: 'Description' } },
        { name: 'url', type: 'text', label: { pl: 'URL', en: 'URL' } },
        { name: 'language', type: 'text', label: { pl: 'Język', en: 'Language' } },
        { name: 'founded', type: 'number', label: { pl: 'Rok założenia', en: 'Founded' } },
        { name: 'reactivated', type: 'number', label: { pl: 'Rok reaktywacji', en: 'Reactivated' } },
        { name: 'league', type: 'text', label: { pl: 'Liga (opis)', en: 'League (label)' } },
        { name: 'city', type: 'text', label: { pl: 'Miasto', en: 'City' } },
        { name: 'region', type: 'text', label: { pl: 'Region (opis)', en: 'Region' } },
        {
          name: 'defaultOgImage',
          type: 'text',
          label: { pl: 'Domyślny OG image (path)', en: 'Default OG image (path)' },
        },
      ],
    },
    {
      name: 'nav',
      type: 'array',
      label: { pl: 'Nawigacja', en: 'Navigation' },
      fields: [
        { name: 'label', type: 'text', required: true, label: { pl: 'Etykieta', en: 'Label' } },
        { name: 'href', type: 'text', required: true, label: { pl: 'Link', en: 'Href' } },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: { pl: 'Kontakt', en: 'Contact' },
      fields: [
        { name: 'email', type: 'text', label: { pl: 'Email', en: 'Email' } },
        { name: 'phone', type: 'text', label: { pl: 'Telefon', en: 'Phone' } },
        {
          name: 'address',
          type: 'group',
          label: { pl: 'Adres stadionu', en: 'Main address' },
          fields: [
            { name: 'street', type: 'text', label: { pl: 'Ulica', en: 'Street' } },
            { name: 'postalCode', type: 'text', label: { pl: 'Kod pocztowy', en: 'Postal code' } },
            { name: 'city', type: 'text', label: { pl: 'Miasto', en: 'City' } },
            { name: 'country', type: 'text', label: { pl: 'Kraj', en: 'Country' } },
          ],
        },
        {
          name: 'officeAddress',
          type: 'group',
          label: { pl: 'Adres biura (opcjonalnie)', en: 'Office address (optional)' },
          fields: [
            { name: 'street', type: 'text', label: { pl: 'Ulica', en: 'Street' } },
            { name: 'postalCode', type: 'text', label: { pl: 'Kod pocztowy', en: 'Postal code' } },
            { name: 'city', type: 'text', label: { pl: 'Miasto', en: 'City' } },
          ],
        },
        { name: 'googleMapsEmbedSrc', type: 'text', label: { pl: 'Google Maps embed', en: 'Google Maps embed' } },
        { name: 'googleMapsLink', type: 'text', label: { pl: 'Google Maps link', en: 'Google Maps link' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      label: { pl: 'Social', en: 'Social' },
      fields: [
        { name: 'facebook', type: 'text', label: { pl: 'Facebook URL', en: 'Facebook URL' } },
        { name: 'facebookAlt', type: 'text', label: { pl: 'Facebook (alt) URL', en: 'Facebook (alt) URL' } },
        { name: 'instagram', type: 'text', label: { pl: 'Instagram URL', en: 'Instagram URL' } },
        { name: 'youtube', type: 'text', label: { pl: 'YouTube URL', en: 'YouTube URL' } },
        { name: 'tiktok', type: 'text', label: { pl: 'TikTok URL', en: 'TikTok URL' } },
        { name: 'facebookFollowers', type: 'number', label: { pl: 'Obserwujący FB', en: 'FB followers' } },
      ],
    },
  ],
}

