import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin } from '../access'

export const HeroSlides: CollectionConfig = {
  slug: 'heroSlides',
  labels: {
    singular: { pl: 'Slajd hero', en: 'Hero slide' },
    plural: { pl: 'Slajdy hero', en: 'Hero slides' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'active', 'order', 'updatedAt'],
    description: 'Karuzela na stronie głównej.',
  },
  access: {
    read: () => true,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { pl: 'Obraz', en: 'Image' },
    },
    { name: 'kicker', type: 'text', label: { pl: 'Kicker', en: 'Kicker' } },
    { name: 'title', type: 'text', required: true, label: { pl: 'Tytuł', en: 'Title' } },
    { name: 'subtitle', type: 'text', label: { pl: 'Podtytuł', en: 'Subtitle' } },
    { name: 'ctaLabel', type: 'text', label: { pl: 'CTA label', en: 'CTA label' } },
    { name: 'ctaHref', type: 'text', label: { pl: 'CTA link', en: 'CTA link' } },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { pl: 'Aktywny', en: 'Active' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { pl: 'Kolejność', en: 'Order' },
      admin: { position: 'sidebar' },
    },
  ],
}

