import type { CollectionConfig } from 'payload'

import { slugify } from '../utils/slugify'
import { can } from '../access/hasPermission'
import { hideUnless } from '../access/hideUnlessHasPermission'

/**
 * Tagi do oznaczania newsów (np. "seniorzy", "wynik", "turniej").
 *
 * Decyzja (Etap 3, 2026-04-25): osobna kolekcja zamiast pola `select hasMany`
 * w News, żeby redaktor mógł sam dodać nowy tag bez czekania na admina /
 * push do gita.
 *
 * Slug auto-generowany z `name`, ale z możliwością ręcznego override (przyda
 * się np. gdy ktoś nazwie tag z polskimi znakami, ale chce konkretny URL).
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: {
    singular: {
      pl: 'Tag',
      en: 'Tag',
    },
    plural: {
      pl: 'Tagi',
      en: 'Tags',
    },
  },
  admin: {
    group: 'Treść',
    hidden: hideUnless('tags'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    description: 'Tagi pomagają grupować newsy (np. wszystkie newsy o seniorach albo wszystkie o turniejach).',
  },
  access: {
    read: () => true,
    create: can('tags', 'create'),
    update: can('tags', 'update'),
    delete: can('tags', 'delete'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: {
        pl: 'Nazwa',
        en: 'Name',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Wypełniane automatycznie z pola "Nazwa". Można nadpisać ręcznie (np. dla SEO).',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim().length > 0) {
              return slugify(value)
            }
            if (data?.name && typeof data.name === 'string') {
              return slugify(data.name)
            }
            return value
          },
        ],
      },
    },
  ],
}
